"""
Test suite for Certificate Manual Create & Full-field Edit persistence.

Covers:
- POST /api/certificate-requests/manual (auto-gen ids, initial_status, access control, multi-cert same student)
- PUT /api/certificate-requests/{id} (all fields, is_manually_edited, access control)
- Persistence: edits NOT overwritten by live-enrichment on list/get/verify/download
- POST /api/certificate-requests/{id}/download (Approved -> Ready)
- GET /api/public/verify/{verification_id}
- DELETE /api/certificate-requests/{id}
"""

import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://enterprise-app-69.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@etieducom.com"
ADMIN_PASSWORD = "admin@123"

# Placement Manager: non-cert role -> should get 403 on manual create/edit
NONCERT_EMAIL = "placement@etieducom.com"
NONCERT_PASSWORD = "placement@123"


def _login(email, password):
    r = requests.post(
        f"{API}/auth/login",
        data={"username": email, "password": password},
        timeout=30,
    )
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture(scope="module")
def noncert_token():
    try:
        return _login(NONCERT_EMAIL, NONCERT_PASSWORD)
    except AssertionError:
        pytest.skip("Placement Manager user not available for 403 test")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def created_ids():
    """Collect ids of created certs across tests for cleanup."""
    ids = []
    yield ids
    # teardown: best-effort cleanup
    try:
        token = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        headers = {"Authorization": f"Bearer {token}"}
        for cid in ids:
            try:
                requests.delete(f"{API}/certificate-requests/{cid}", headers=headers, timeout=15)
            except Exception:
                pass
    except Exception:
        pass


def _unique_student(prefix="TEST_Student"):
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _base_payload(**over):
    p = {
        "student_name": _unique_student(),
        "program_name": "Advanced Excel",
        "program_duration": "3 Months",
        "branch_name": "TEST Branch",
        "email": "test.student@example.com",
        "phone": "9876543210",
        "program_start_date": "2025-01-01",
        "program_end_date": "2025-03-31",
        "training_mode": "Offline",
        "training_hours": 120,
        "initial_status": "Approved",
    }
    p.update(over)
    return p


# ---------------- Manual Create ----------------

class TestManualCreate:
    def test_manual_create_admin_success_all_fields(self, admin_headers, created_ids):
        payload = _base_payload(
            enrollment_number="ENROLL_TEST_ABC",
            registration_number="ETI-STU-TEST-9001",
            certificate_id="ETI-2026-TEST-9001",
        )
        r = requests.post(f"{API}/certificate-requests/manual", json=payload, headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"]
        assert data["certificate_id"] == "ETI-2026-TEST-9001"
        assert data["registration_number"] == "ETI-STU-TEST-9001"
        assert data["verification_id"]
        assert data["status"] == "Approved"
        created_ids.append(data["id"])

        # Verify via GET
        g = requests.get(f"{API}/certificate-requests/{data['id']}", headers=admin_headers, timeout=30)
        assert g.status_code == 200
        cert = g.json()
        assert cert["student_name"] == payload["student_name"]
        assert cert["program_name"] == "Advanced Excel"
        assert cert["program_duration"] == "3 Months"
        assert cert["branch_name"] == "TEST Branch"
        assert cert["email"] == "test.student@example.com"
        assert cert["phone"] == "9876543210"
        assert cert["training_mode"] == "Offline"
        assert cert["training_hours"] == 120
        assert cert["is_manually_created"] is True
        assert cert["enrollment_number"] == "ENROLL_TEST_ABC"

    def test_manual_create_autogen_ids(self, admin_headers, created_ids):
        payload = _base_payload()
        # explicitly no cert_id / reg_number
        payload.pop("initial_status", None)
        r = requests.post(f"{API}/certificate-requests/manual", json=payload, headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        created_ids.append(data["id"])
        assert data["certificate_id"].startswith("ETI-"), f"cert_id fmt: {data['certificate_id']}"
        assert data["registration_number"].startswith("ETI-STU-"), f"reg_no fmt: {data['registration_number']}"
        # default initial_status = Approved
        assert data["status"] == "Approved"

    def test_manual_create_pending_status(self, admin_headers, created_ids):
        r = requests.post(
            f"{API}/certificate-requests/manual",
            json=_base_payload(initial_status="Pending"),
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        created_ids.append(data["id"])
        assert data["status"] == "Pending"

    def test_manual_create_invalid_status(self, admin_headers):
        r = requests.post(
            f"{API}/certificate-requests/manual",
            json=_base_payload(initial_status="Rejected"),
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 400, r.text

    def test_manual_create_multiple_certs_same_student(self, admin_headers, created_ids):
        student = _unique_student("TEST_DupStudent")
        common = dict(student_name=student, email="dup@example.com", phone="9999911111")
        c1 = requests.post(f"{API}/certificate-requests/manual",
                           json=_base_payload(program_name="Course A", **common),
                           headers=admin_headers, timeout=30)
        c2 = requests.post(f"{API}/certificate-requests/manual",
                           json=_base_payload(program_name="Course B", **common),
                           headers=admin_headers, timeout=30)
        assert c1.status_code == 200 and c2.status_code == 200
        id1, id2 = c1.json()["id"], c2.json()["id"]
        assert id1 != id2
        created_ids += [id1, id2]

        # Both must be listed
        lst = requests.get(f"{API}/certificate-requests", headers=admin_headers, timeout=30).json()
        ids_in_list = {c["id"] for c in lst}
        assert id1 in ids_in_list and id2 in ids_in_list

    def test_manual_create_nonexistent_enrollment_ok(self, admin_headers, created_ids):
        r = requests.post(
            f"{API}/certificate-requests/manual",
            json=_base_payload(enrollment_number="TOTALLY_FAKE_ENR_12345"),
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        created_ids.append(data["id"])
        g = requests.get(f"{API}/certificate-requests/{data['id']}", headers=admin_headers, timeout=30).json()
        assert g["enrollment_number"] == "TOTALLY_FAKE_ENR_12345"

    def test_manual_create_non_admin_role_forbidden(self, noncert_token):
        headers = {"Authorization": f"Bearer {noncert_token}", "Content-Type": "application/json"}
        r = requests.post(f"{API}/certificate-requests/manual",
                          json=_base_payload(), headers=headers, timeout=30)
        assert r.status_code == 403, f"expected 403, got {r.status_code} {r.text}"


# ---------------- Full-Field Edit & Persistence ----------------

class TestEditPersistence:
    @pytest.fixture(scope="class")
    def cert_id(self, admin_headers, created_ids):
        r = requests.post(f"{API}/certificate-requests/manual",
                          json=_base_payload(), headers=admin_headers, timeout=30)
        assert r.status_code == 200
        cid = r.json()["id"]
        created_ids.append(cid)
        return cid

    def test_put_updates_all_fields(self, admin_headers, cert_id):
        update = {
            "student_name": "EDITED NAME PERSIST",
            "program_name": "EDITED COURSE PERSIST",
            "program_duration": "6 Months EDITED",
            "branch_name": "EDITED BRANCH PERSIST",
            "email": "edited@example.com",
            "phone": "8888800000",
            "program_start_date": "2025-02-02",
            "program_end_date": "2025-08-08",
            "training_mode": "Online",
            "training_hours": 240,
            "registration_number": "ETI-STU-EDITED-1",
            "certificate_id": "ETI-2026-EDITED-1",
        }
        r = requests.put(f"{API}/certificate-requests/{cert_id}", json=update, headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text

        # round-trip via GET single
        g = requests.get(f"{API}/certificate-requests/{cert_id}", headers=admin_headers, timeout=30)
        assert g.status_code == 200
        cert = g.json()
        for k, v in update.items():
            assert cert[k] == v, f"Field {k}: expected {v}, got {cert.get(k)}"
        assert cert["is_manually_edited"] is True

    def test_edits_persist_in_list_view(self, admin_headers, cert_id):
        """CRITICAL: enrichment must not overwrite edited fields."""
        lst = requests.get(f"{API}/certificate-requests", headers=admin_headers, timeout=30).json()
        cert = next((c for c in lst if c["id"] == cert_id), None)
        assert cert, "Cert not found in list"
        assert cert["student_name"] == "EDITED NAME PERSIST"
        assert cert["program_name"] == "EDITED COURSE PERSIST"
        assert cert["program_duration"] == "6 Months EDITED"
        assert cert["branch_name"] == "EDITED BRANCH PERSIST"

    def test_put_forbidden_for_non_cert_role(self, noncert_token, cert_id):
        headers = {"Authorization": f"Bearer {noncert_token}", "Content-Type": "application/json"}
        r = requests.put(f"{API}/certificate-requests/{cert_id}",
                         json={"student_name": "hack"}, headers=headers, timeout=30)
        assert r.status_code == 403, r.text

    def test_download_returns_edited_fields_and_marks_ready(self, admin_headers, cert_id):
        r = requests.post(f"{API}/certificate-requests/{cert_id}/download",
                          headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        payload = r.json()
        assert payload["student_name"] == "EDITED NAME PERSIST"
        assert payload["program_name"] == "EDITED COURSE PERSIST"
        assert payload["program_duration"] == "6 Months EDITED"
        assert payload["branch_name"] == "EDITED BRANCH PERSIST"
        assert payload["certificate_id"] == "ETI-2026-EDITED-1"

        # verify status transitioned to Ready
        g = requests.get(f"{API}/certificate-requests/{cert_id}", headers=admin_headers, timeout=30).json()
        assert g["status"] == "Ready", f"expected Ready, got {g['status']}"

    def test_public_verify_returns_edited_fields(self, admin_headers, cert_id):
        cert = requests.get(f"{API}/certificate-requests/{cert_id}", headers=admin_headers, timeout=30).json()
        vid = cert["verification_id"]
        r = requests.get(f"{API}/public/verify/{vid}", timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["verified"] is True, body
        d = body["certificate_details"]
        assert d["student_name"] == "EDITED NAME PERSIST"
        assert d["program_name"] == "EDITED COURSE PERSIST"
        assert d["branch_name"] == "EDITED BRANCH PERSIST"


# ---------------- Delete ----------------

class TestDelete:
    def test_delete_manual_cert(self, admin_headers):
        c = requests.post(f"{API}/certificate-requests/manual",
                          json=_base_payload(student_name=_unique_student("TEST_DelStudent")),
                          headers=admin_headers, timeout=30)
        assert c.status_code == 200
        cid = c.json()["id"]

        d = requests.delete(f"{API}/certificate-requests/{cid}", headers=admin_headers, timeout=30)
        assert d.status_code in (200, 204), d.text

        g = requests.get(f"{API}/certificate-requests/{cid}", headers=admin_headers, timeout=30)
        assert g.status_code == 404
