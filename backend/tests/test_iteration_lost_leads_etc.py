"""
Backend tests for ETIeduerp clone iteration covering:
- Lost leads list/restore and exclusion from /api/leads
- Branch Admin demos-today
- Certificate request delete + cert manager edit (student_name/program_name/program_duration)
- AI Insights endpoint with EMERGENT_LLM_KEY
- Exam booking incentive-paid using id or booking_id
- WhatsApp default eti_* templates
"""

import os
import time
import uuid
import asyncio
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://business-suite-141.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@etieducom.com"
ADMIN_PASSWORD = "admin@123"


# ---------- Helpers / Fixtures ----------

def _login(email: str, password: str) -> str:
    r = requests.post(
        f"{API}/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=20,
    )
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    return r.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def admin_token() -> str:
    return _login(ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture(scope="session")
def test_run_id() -> str:
    return uuid.uuid4().hex[:8]


@pytest.fixture(scope="session")
def branch(admin_token, test_run_id):
    """Create a TEST_ branch if needed and return it."""
    r = requests.get(f"{API}/admin/branches", headers=_auth(admin_token), timeout=20)
    assert r.status_code == 200
    existing = [b for b in r.json() if b.get("name", "").startswith("TEST_")]
    if existing:
        return existing[0]

    payload = {
        "name": f"TEST_Branch_{test_run_id}",
        "location": "Test City",
        "address": "123 Test Lane",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560001",
        "owner_name": "Test Owner",
        "owner_email": f"owner_{test_run_id}@test.com",
        "owner_phone": "9999000000",
        "owner_designation": "Owner",
        "branch_phone": "9999000001",
        "branch_email": f"branch_{test_run_id}@test.com",
        "royalty_percentage": 0,
    }
    r = requests.post(f"{API}/admin/branches", json=payload, headers=_auth(admin_token), timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="session")
def program(admin_token, test_run_id):
    r = requests.get(f"{API}/programs", headers=_auth(admin_token), timeout=20)
    if r.status_code == 200 and r.json():
        return r.json()[0]
    payload = {"name": f"TEST_Program_{test_run_id}", "duration": "3 months",
               "fee": 10000.0, "max_discount_percent": 20.0}
    r = requests.post(f"{API}/admin/programs", json=payload, headers=_auth(admin_token), timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


def _create_user(admin_token, role, branch_id, test_run_id, suffix):
    email = f"test_{suffix}_{test_run_id}@test.com"
    payload = {
        "email": email,
        "password": "Test@123",
        "name": f"TEST_{suffix}",
        "role": role,
        "branch_id": branch_id,
    }
    r = requests.post(f"{API}/admin/users", json=payload, headers=_auth(admin_token), timeout=20)
    if r.status_code in (400, 409) and "exist" in r.text.lower():
        return email
    assert r.status_code == 200, f"create_user {role} failed: {r.status_code} {r.text}"
    return email


@pytest.fixture(scope="session")
def users(admin_token, branch, test_run_id):
    bid = branch["id"]
    info = {
        "branch_admin": _create_user(admin_token, "Branch Admin", bid, test_run_id, "ba"),
        "counsellor": _create_user(admin_token, "Counsellor", bid, test_run_id, "couns"),
        "cert_manager": _create_user(admin_token, "Certificate Manager", bid, test_run_id, "cm"),
        "fde": _create_user(admin_token, "Front Desk Executive", bid, test_run_id, "fde"),
    }
    tokens = {k: _login(v, "Test@123") for k, v in info.items()}
    return {"emails": info, "tokens": tokens, "branch_id": bid}


# ---------- Tests ----------

class TestWhatsAppDefaults:
    def test_default_eti_templates_present(self, admin_token):
        r = requests.get(f"{API}/admin/whatsapp-settings", headers=_auth(admin_token), timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "events" in data, f"events missing: {data}"
        ev = data["events"]
        expected = {
            "enquiry_saved": "eti_enquiry_confirmation",
            "demo_booked": "eti_demo_confirmation",
            "enrollment_confirmed": "eti_enrollment_confirmation",
            "payment_received": "eti_payment",
            "fee_reminder": "eti_fee_reminder",
            "birthday_wishes": "eti_birthday_wishes",
            "certificate_ready": "eti_certificate",
        }
        for key, tmpl in expected.items():
            assert key in ev, f"event {key} missing in {list(ev.keys())}"
            assert ev[key].get("template_name") == tmpl, f"{key} template={ev[key].get('template_name')} != {tmpl}"


class TestLostLeads:
    @pytest.fixture(scope="class")
    def lost_lead(self, admin_token, branch, program, users):
        couns_token = users["tokens"]["counsellor"]
        # Create lead as counsellor
        payload = {
            "name": "TEST_LostLead",
            "number": "9000111222",
            "email": "lostlead@test.com",
            "program_id": program["id"],
            "lead_source": "Walk-in",
        }
        r = requests.post(f"{API}/leads", json=payload, headers=_auth(couns_token), timeout=20)
        assert r.status_code == 200, r.text
        lead = r.json()
        # Mark as Lost via update
        r2 = requests.put(f"{API}/leads/{lead['id']}", json={"status": "Lost"},
                          headers=_auth(couns_token), timeout=20)
        assert r2.status_code == 200, r2.text
        return lead

    def test_get_leads_excludes_lost(self, users, lost_lead):
        token = users["tokens"]["counsellor"]
        r = requests.get(f"{API}/leads", headers=_auth(token), timeout=20)
        assert r.status_code == 200
        ids = [l["id"] for l in r.json()]
        assert lost_lead["id"] not in ids, "Lost lead should be excluded from /api/leads"

    def test_get_leads_status_lost_includes(self, users, lost_lead):
        token = users["tokens"]["counsellor"]
        r = requests.get(f"{API}/leads?status=Lost", headers=_auth(token), timeout=20)
        assert r.status_code == 200
        ids = [l["id"] for l in r.json()]
        assert lost_lead["id"] in ids

    def test_lost_leads_endpoint_allowed_roles(self, users, lost_lead):
        for role in ("counsellor", "branch_admin"):
            token = users["tokens"][role]
            r = requests.get(f"{API}/leads/lost", headers=_auth(token), timeout=20)
            assert r.status_code == 200, f"{role}: {r.status_code} {r.text}"

    def test_lost_leads_endpoint_admin(self, admin_token, lost_lead):
        r = requests.get(f"{API}/leads/lost", headers=_auth(admin_token), timeout=20)
        assert r.status_code == 200

    def test_lost_leads_endpoint_denied_roles(self, users):
        for role in ("cert_manager", "fde"):
            token = users["tokens"][role]
            r = requests.get(f"{API}/leads/lost", headers=_auth(token), timeout=20)
            assert r.status_code == 403, f"{role} should be 403, got {r.status_code}"

    def test_restore_from_lost(self, users, lost_lead):
        token = users["tokens"]["counsellor"]
        r = requests.put(
            f"{API}/leads/{lost_lead['id']}/restore-from-lost?new_status=Contacted",
            headers=_auth(token), timeout=20)
        assert r.status_code == 200, r.text
        # verify status
        r2 = requests.get(f"{API}/leads/{lost_lead['id']}", headers=_auth(token), timeout=20)
        assert r2.status_code == 200
        assert r2.json()["status"] == "Contacted"

    def test_restore_400_when_not_lost(self, users, lost_lead):
        token = users["tokens"]["counsellor"]
        # Now lead is Contacted, calling restore should 400
        r = requests.put(
            f"{API}/leads/{lost_lead['id']}/restore-from-lost?new_status=New",
            headers=_auth(token), timeout=20)
        assert r.status_code == 400, f"expected 400, got {r.status_code} {r.text}"

    def test_restore_denied_for_fde(self, users, lost_lead):
        token = users["tokens"]["fde"]
        r = requests.put(
            f"{API}/leads/{lost_lead['id']}/restore-from-lost?new_status=New",
            headers=_auth(token), timeout=20)
        assert r.status_code == 403


class TestDemosToday:
    def test_demos_today_admin(self, admin_token):
        r = requests.get(f"{API}/branch-admin/demos-today", headers=_auth(admin_token), timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert "date" in data and "count" in data and "demos" in data
        assert isinstance(data["demos"], list)

    def test_demos_today_branch_admin(self, users):
        token = users["tokens"]["branch_admin"]
        r = requests.get(f"{API}/branch-admin/demos-today", headers=_auth(token), timeout=20)
        assert r.status_code == 200

    def test_demos_today_with_demo_booked_lead(self, users, program, admin_token):
        """Create a lead, mark demo-booked today, ensure it appears."""
        couns = users["tokens"]["counsellor"]
        payload = {
            "name": "TEST_DemoToday",
            "number": "9000111333",
            "email": "demotoday@test.com",
            "program_id": program["id"],
            "lead_source": "Walk-in",
        }
        r = requests.post(f"{API}/leads", json=payload, headers=_auth(couns), timeout=20)
        assert r.status_code == 200, r.text
        lead = r.json()
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        upd = {"status": "Demo Booked", "demo_date": today_str, "demo_time": "10:00"}
        r2 = requests.put(f"{API}/leads/{lead['id']}", json=upd, headers=_auth(couns), timeout=20)
        assert r2.status_code == 200, r2.text

        ba_token = users["tokens"]["branch_admin"]
        r3 = requests.get(f"{API}/branch-admin/demos-today", headers=_auth(ba_token), timeout=20)
        assert r3.status_code == 200
        ids = [d.get("id") for d in r3.json().get("demos", [])]
        assert lead["id"] in ids, f"Demo today not listed. demos={r3.json()}"

    def test_demos_today_denied_for_fde(self, users):
        token = users["tokens"]["fde"]
        r = requests.get(f"{API}/branch-admin/demos-today", headers=_auth(token), timeout=20)
        assert r.status_code == 403

    def test_demos_today_denied_for_cert_manager(self, users):
        token = users["tokens"]["cert_manager"]
        r = requests.get(f"{API}/branch-admin/demos-today", headers=_auth(token), timeout=20)
        assert r.status_code == 403


class TestAIInsights:
    def test_ai_insights_counsellor(self, users):
        token = users["tokens"]["counsellor"]
        r = requests.get(f"{API}/analytics/ai-leads-insights", headers=_auth(token), timeout=90)
        assert r.status_code == 200, r.text
        data = r.json()
        # Required structure
        assert "insights" in data
        assert "recommendations" in data
        assert "summary" in data
        # ai_powered flag - may be true (LLM ok) or false (fallback); both acceptable
        assert "ai_powered" in data, f"ai_powered missing: {data}"

    def test_ai_insights_branch_admin(self, users):
        token = users["tokens"]["branch_admin"]
        r = requests.get(f"{API}/analytics/ai-leads-insights", headers=_auth(token), timeout=90)
        assert r.status_code == 200
        data = r.json()
        assert "insights" in data and "recommendations" in data and "summary" in data

    def test_ai_insights_denied_for_admin(self, admin_token):
        r = requests.get(f"{API}/analytics/ai-leads-insights", headers=_auth(admin_token), timeout=20)
        assert r.status_code == 403


class TestCertificateRequestCRUD:
    """Insert cert request directly via mongo for clean testability of edit/delete."""

    @pytest.fixture(scope="class")
    def cert_request_id(self, admin_token, branch):
        # Insert directly via Mongo since the public POST has many prerequisites.
        from pymongo import MongoClient
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")
        client = MongoClient(mongo_url)
        db = client[db_name]
        cert_id = str(uuid.uuid4())
        doc = {
            "id": cert_id,
            "certificate_id": f"ETI-TEST-{uuid.uuid4().hex[:6]}",
            "verification_id": uuid.uuid4().hex[:10],
            "enrollment_number": f"TESTENR{uuid.uuid4().hex[:6]}",
            "student_name": "Original Name",
            "program_name": "Original Program",
            "program_duration": "2 months",
            "email": "cert@test.com",
            "phone": "9000111444",
            "program_start_date": "2025-01-01",
            "program_end_date": "2025-03-01",
            "training_mode": "Offline",
            "training_hours": 60,
            "branch_id": branch["id"],
            "status": "Pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        db.certificate_requests.insert_one(doc)
        client.close()
        return cert_id

    def test_cert_manager_can_edit_name_program_duration(self, users, cert_request_id):
        token = users["tokens"]["cert_manager"]
        upd = {
            "student_name": "Updated Student",
            "program_name": "Updated Program",
            "program_duration": "6 months",
            "email": "updated@test.com",
        }
        r = requests.put(f"{API}/certificate-requests/{cert_request_id}",
                         json=upd, headers=_auth(token), timeout=20)
        assert r.status_code == 200, r.text
        # GET to verify persistence
        r2 = requests.get(f"{API}/certificate-requests/{cert_request_id}",
                          headers=_auth(token), timeout=20)
        assert r2.status_code == 200, r2.text
        data = r2.json()
        assert data["student_name"] == "Updated Student"
        assert data["program_name"] == "Updated Program"
        assert data["program_duration"] == "6 months"
        assert data["email"] == "updated@test.com"

    def test_cert_request_update_denied_for_counsellor(self, users, cert_request_id):
        token = users["tokens"]["counsellor"]
        r = requests.put(f"{API}/certificate-requests/{cert_request_id}",
                         json={"student_name": "Hack"}, headers=_auth(token), timeout=20)
        assert r.status_code == 403

    def test_cert_request_delete_denied_for_counsellor(self, users, cert_request_id):
        token = users["tokens"]["counsellor"]
        r = requests.delete(f"{API}/certificate-requests/{cert_request_id}",
                            headers=_auth(token), timeout=20)
        assert r.status_code == 403

    def test_cert_request_delete_by_cert_manager(self, users, cert_request_id):
        token = users["tokens"]["cert_manager"]
        r = requests.delete(f"{API}/certificate-requests/{cert_request_id}",
                            headers=_auth(token), timeout=20)
        assert r.status_code == 200, r.text
        # confirm deletion
        r2 = requests.get(f"{API}/certificate-requests/{cert_request_id}",
                          headers=_auth(token), timeout=20)
        assert r2.status_code == 404


class TestIncentivePaid:
    """Insert exam_bookings directly to test both id and booking_id flows."""

    @pytest.fixture(scope="class")
    def bookings(self, branch):
        from pymongo import MongoClient
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")
        client = MongoClient(mongo_url)
        db = client[db_name]
        bid = branch["id"]
        b_with_id = {
            "id": str(uuid.uuid4()),
            "booking_id": f"EBK-{uuid.uuid4().hex[:6]}",
            "branch_id": bid,
            "status": "Completed",
            "exam_price": 5000,
            "incentive_status": "Pending",
        }
        b_legacy_only = {
            # legacy doc with only booking_id (no `id`)
            "booking_id": f"EBK-{uuid.uuid4().hex[:6]}",
            "branch_id": bid,
            "status": "Completed",
            "exam_price": 3000,
            "incentive_status": "Pending",
        }
        db.exam_bookings.insert_one(b_with_id)
        db.exam_bookings.insert_one(b_legacy_only)
        client.close()
        return {"by_id": b_with_id, "by_booking_id": b_legacy_only}

    def test_incentive_paid_by_id(self, users, bookings):
        token = users["tokens"]["branch_admin"]
        bid = bookings["by_id"]["id"]
        r = requests.put(f"{API}/exam-bookings/{bid}/incentive-paid",
                         headers=_auth(token), timeout=20)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert data["incentive_status"] == "Paid"
        assert data["incentive_amount"] == 500.0  # 10% of 5000

    def test_incentive_paid_by_booking_id_legacy(self, users, bookings):
        token = users["tokens"]["branch_admin"]
        bk = bookings["by_booking_id"]["booking_id"]
        r = requests.put(f"{API}/exam-bookings/{bk}/incentive-paid",
                         headers=_auth(token), timeout=20)
        assert r.status_code == 200, f"Got 404? {r.status_code} {r.text}"
        data = r.json()
        assert data["incentive_status"] == "Paid"
        assert data["incentive_amount"] == 300.0  # 10% of 3000

    def test_incentive_paid_404_for_unknown(self, users):
        token = users["tokens"]["branch_admin"]
        r = requests.put(f"{API}/exam-bookings/nonexistent-id-xyz/incentive-paid",
                         headers=_auth(token), timeout=20)
        assert r.status_code == 404


# ---------- Cleanup ----------
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data(admin_token):
    yield
    # Best-effort cleanup; do not fail tests if cleanup fails
    try:
        from pymongo import MongoClient
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")
        client = MongoClient(mongo_url)
        db = client[db_name]
        db.leads.delete_many({"name": {"$regex": "^TEST_"}})
        db.certificate_requests.delete_many({"student_name": {"$in": ["Original Name", "Updated Student"]}})
        db.exam_bookings.delete_many({"booking_id": {"$regex": "^EBK-"}})
        client.close()
    except Exception:
        pass
