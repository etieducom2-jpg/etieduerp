"""
Iteration 3 targeted regression tests:
- GET /api/programs returns 8 seeded programs (previously 500 due to missing max_discount_percent)
- Certificate manual-create + download payload uses provided program_name (no hardcoded rewrite)
- Certificate PUT update accepts new program_name and persists it
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://enterprise-app-69.preview.emergentagent.com").rstrip("/")

REQUIRED_PROGRAMS = {
    "Advanced Excel", "Basics of Computer", "MS Office Suite", "Tally & GST",
    "Digital Marketing", "Graphic Design", "Python Programming", "Web Development",
}


@pytest.fixture(scope="module")
def token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": "admin@etieducom.com", "password": "admin@123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# --- programs endpoint ---
class TestPrograms:
    def test_programs_ok_and_seed_names(self, auth):
        r = requests.get(f"{BASE_URL}/api/programs", headers=auth, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list) and len(data) >= 8
        names = {p["name"] for p in data}
        assert REQUIRED_PROGRAMS.issubset(names), f"Missing: {REQUIRED_PROGRAMS - names}"
        for p in data:
            for k in ("id", "name", "duration", "max_discount_percent"):
                assert k in p, f"Program missing field: {k}"


# --- certificate manual create + download payload preserves program_name ---
class TestCertificateFlow:
    @pytest.fixture(scope="class")
    def created_cert(self, auth):
        payload = {
            "student_name": "TEST_Iter3 User",
            "program_name": "Advanced Excel",
            "program_duration": "3 Months",
            "program_start_date": "2026-07-06",
            "program_end_date": "2026-08-05",
            "training_mode": "Offline",
            "initial_status": "Approved",
        }
        r = requests.post(
            f"{BASE_URL}/api/certificate-requests/manual",
            json=payload, headers={**auth, "Content-Type": "application/json"}, timeout=30,
        )
        assert r.status_code in (200, 201), r.text
        data = r.json()
        # some backends return {message,id}; support both
        cid = data.get("id") or data.get("request_id") or data.get("certificate_id")
        if not cid:
            # fallback - list & find
            lst = requests.get(f"{BASE_URL}/api/certificate-requests", headers=auth, timeout=30).json()
            match = [x for x in lst if x.get("student_name") == "TEST_Iter3 User"]
            assert match
            cid = match[0]["id"]
        yield cid
        # teardown
        requests.delete(f"{BASE_URL}/api/certificate-requests/{cid}", headers=auth, timeout=30)

    def test_get_shows_advanced_excel(self, auth, created_cert):
        r = requests.get(f"{BASE_URL}/api/certificate-requests/{created_cert}", headers=auth, timeout=30)
        assert r.status_code == 200
        assert r.json()["program_name"] == "Advanced Excel"

    def test_download_payload_uses_program_name(self, auth, created_cert):
        r = requests.post(
            f"{BASE_URL}/api/certificate-requests/{created_cert}/download",
            headers={**auth, "Content-Type": "application/json"}, json={}, timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["program_name"] == "Advanced Excel"
        assert "MS-Office Suite Specialist" not in data["program_name"]

    def test_put_update_program_name_persists(self, auth, created_cert):
        cur = requests.get(f"{BASE_URL}/api/certificate-requests/{created_cert}", headers=auth, timeout=30).json()
        # simulate frontend editFormData shape but with proper types
        payload = {
            "student_name": cur.get("student_name") or "",
            "program_name": "Tally & GST",
            "program_duration": "3 Months",
            "branch_name": cur.get("branch_name") or "",
            "email": cur.get("email") or "",
            "phone": cur.get("phone") or "",
            "program_start_date": cur.get("program_start_date") or "2026-07-06",
            "program_end_date": cur.get("program_end_date") or "2026-08-05",
            "training_mode": cur.get("training_mode") or "Offline",
            "training_hours": None,  # must be None, NOT ''
            "registration_number": cur.get("registration_number") or "",
            "certificate_id": cur.get("certificate_id") or "",
        }
        r = requests.put(
            f"{BASE_URL}/api/certificate-requests/{created_cert}",
            json=payload, headers={**auth, "Content-Type": "application/json"}, timeout=30,
        )
        assert r.status_code == 200, r.text
        got = requests.get(f"{BASE_URL}/api/certificate-requests/{created_cert}", headers=auth, timeout=30).json()
        assert got["program_name"] == "Tally & GST"

    def test_put_with_empty_training_hours_returns_422(self, auth, created_cert):
        """Regression: empty-string training_hours must NOT be sent by FE; backend rejects."""
        payload = {
            "student_name": "x", "program_name": "Tally & GST", "program_duration": "3 Months",
            "branch_name": "", "email": "", "phone": "",
            "program_start_date": "2026-07-06", "program_end_date": "2026-08-05",
            "training_mode": "Offline",
            "training_hours": "",  # <-- the buggy value the frontend sends today
            "registration_number": "", "certificate_id": "",
        }
        r = requests.put(
            f"{BASE_URL}/api/certificate-requests/{created_cert}",
            json=payload, headers={**auth, "Content-Type": "application/json"}, timeout=30,
        )
        assert r.status_code == 422
