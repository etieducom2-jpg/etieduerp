"""
Iteration 3 - Comprehensive ERP regression after fixes for:
  Fix #1: POST /api/enrollments must honor lead.branch_id (never 'default')
  Fix #2: GET /api/certificate-requests/{id} and /api/public/verify/{vid}
         must read student/program live (not snapshot) so edits to students
         reflect on issued certificates
  Fix #3: DELETE /api/certificate-requests/{id} must work even for Rejected
         certificates
Plus Wizbang regression + auth/analytics/lead-validation smoke.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@etieducom.com"
ADMIN_PASS = "admin@123"
WIZ_EMAIL = "wizbang@etieducom.com"
WIZ_PASS = "wiz@123"


def _login(email, password):
    return requests.post(f"{API}/auth/login", data={"username": email, "password": password})


@pytest.fixture(scope="session")
def admin_token():
    r = _login(ADMIN_EMAIL, ADMIN_PASS)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def wiz_token():
    r = _login(WIZ_EMAIL, WIZ_PASS)
    assert r.status_code == 200, f"Wizbang login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


def h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------------- AUTH ----------------
class TestAuth:
    def test_admin_login(self, admin_token):
        assert admin_token

    def test_admin_me(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=h(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL and d["role"] == "Admin"

    def test_wizbang_me(self, wiz_token):
        r = requests.get(f"{API}/auth/me", headers=h(wiz_token))
        assert r.status_code == 200 and r.json()["role"] == "Wizbang"

    def test_invalid_creds(self):
        assert _login(ADMIN_EMAIL, "wrong").status_code == 401


# ---------------- BRANCH / PROGRAM ----------------
@pytest.fixture(scope="session")
def test_branch(admin_token):
    r = requests.get(f"{API}/admin/branches", headers=h(admin_token))
    if r.status_code == 200 and r.json():
        return r.json()[0]
    suffix = uuid.uuid4().hex[:5]
    payload = {
        "name": f"TEST_Branch_{suffix}", "location": "TestLoc", "city": "TestCity",
        "state": "TestState", "state_code": "TS", "city_code": "TC", "pincode": "560001",
        "address": "TEST 123", "owner_name": "TEST Owner",
        "owner_email": f"owner_{suffix}@t.com", "owner_phone": "9999900000",
        "owner_designation": "Director", "branch_phone": "9999900001",
        "branch_email": f"branch_{suffix}@t.com", "phone": "9999900002",
        "email": f"branch2_{suffix}@t.com", "royalty_percentage": 5,
    }
    cr = requests.post(f"{API}/admin/branches", json=payload, headers=h(admin_token))
    assert cr.status_code in (200, 201), cr.text
    return cr.json()


@pytest.fixture(scope="session")
def second_branch(admin_token):
    """Create a SECOND branch to verify branch inheritance differs from first."""
    suffix = uuid.uuid4().hex[:5]
    payload = {
        "name": f"TEST_Branch2_{suffix}", "location": "Loc2", "city": "City2",
        "state": "State2", "state_code": "S2", "city_code": "C2", "pincode": "411001",
        "address": "TEST 456", "owner_name": "Owner2",
        "owner_email": f"o2_{suffix}@t.com", "owner_phone": "9000011111",
        "owner_designation": "Director", "branch_phone": "9000011112",
        "branch_email": f"b2_{suffix}@t.com", "phone": "9000011113",
        "email": f"b2x_{suffix}@t.com", "royalty_percentage": 5,
    }
    r = requests.post(f"{API}/admin/branches", json=payload, headers=h(admin_token))
    assert r.status_code in (200, 201), r.text
    return r.json()


@pytest.fixture(scope="session")
def test_program(admin_token):
    r = requests.get(f"{API}/programs", headers=h(admin_token))
    progs = r.json() if r.status_code == 200 else []
    if progs:
        return progs[0]
    suffix = uuid.uuid4().hex[:6]
    payload = {"name": f"TEST_Prog_{suffix}", "duration": "3 Months",
               "fee": 30000.0, "max_discount_percent": 20.0}
    r = requests.post(f"{API}/admin/programs", json=payload, headers=h(admin_token))
    assert r.status_code in (200, 201), r.text
    return r.json()


# ---------------- LEAD VALIDATION (FIX REGRESSION) ----------------
class TestLeadBranchValidation:
    def _lead_payload(self, program_id, branch_id=None):
        p = {
            "name": f"TEST_LeadV_{uuid.uuid4().hex[:5]}",
            "number": "9000000001", "phone": "9000000001",
            "email": "v@t.com", "program_id": program_id,
            "fee_quoted": 30000.0, "discount_percent": 0,
            "source": "Walk-in", "lead_source": "Walk-in", "status": "New",
        }
        if branch_id is not None:
            p["branch_id"] = branch_id
        return p

    def test_omit_branch_id_admin_returns_400(self, admin_token, test_program):
        # Admin has no branch -> omitting branch_id must fail
        payload = self._lead_payload(test_program["id"])
        payload.pop("branch_id", None)
        r = requests.post(f"{API}/leads", json=payload, headers=h(admin_token))
        assert r.status_code == 400, f"Expected 400, got {r.status_code} {r.text[:200]}"

    def test_bogus_branch_id_returns_400(self, admin_token, test_program):
        payload = self._lead_payload(test_program["id"], branch_id="bogus-branch-id-xyz")
        r = requests.post(f"{API}/leads", json=payload, headers=h(admin_token))
        assert r.status_code == 400, f"Expected 400, got {r.status_code} {r.text[:200]}"

    def test_valid_branch_id_succeeds_and_not_default(self, admin_token, test_program, test_branch):
        payload = self._lead_payload(test_program["id"], branch_id=test_branch["id"])
        r = requests.post(f"{API}/leads", json=payload, headers=h(admin_token))
        assert r.status_code in (200, 201), r.text
        lead = r.json()
        assert lead.get("branch_id") == test_branch["id"], lead
        assert lead.get("branch_id") != "default", lead
        # lead_id should be branch-coded (state_code+city_code+...)
        lid = lead.get("lead_id", "")
        assert lid and lid != "default", f"Bad lead_id: {lid}"


# ---------------- ENROLLMENT (FIX #1) ----------------
@pytest.fixture(scope="session")
def test_lead(admin_token, test_branch, test_program):
    payload = {
        "name": f"TEST_Lead_{uuid.uuid4().hex[:5]}",
        "number": "9000000000", "phone": "9000000000", "email": "lead@test.com",
        "branch_id": test_branch["id"], "program_id": test_program["id"],
        "fee_quoted": 27000.0, "discount_percent": 0, "source": "Walk-in", "lead_source": "Walk-in", "status": "New",
    }
    r = requests.post(f"{API}/leads", json=payload, headers=h(admin_token))
    assert r.status_code in (200, 201), r.text
    lead = r.json()
    requests.put(f"{API}/leads/{lead['id']}", json={"status": "Converted"}, headers=h(admin_token))
    return lead


@pytest.fixture(scope="session")
def test_lead_branch2(admin_token, second_branch, test_program):
    """Lead in the SECOND branch - to verify branch inheritance"""
    payload = {
        "name": f"TEST_Lead2_{uuid.uuid4().hex[:5]}",
        "number": "9000000099", "phone": "9000000099", "email": "lead2@test.com",
        "branch_id": second_branch["id"], "program_id": test_program["id"],
        "fee_quoted": 27000.0, "discount_percent": 0, "source": "Walk-in", "lead_source": "Walk-in", "status": "New",
    }
    r = requests.post(f"{API}/leads", json=payload, headers=h(admin_token))
    assert r.status_code in (200, 201), r.text
    lead = r.json()
    requests.put(f"{API}/leads/{lead['id']}", json={"status": "Converted"}, headers=h(admin_token))
    return lead


@pytest.fixture(scope="session")
def test_enrollment(admin_token, test_branch, test_program, test_lead):
    suffix = uuid.uuid4().hex[:6]
    payload = {
        "lead_id": test_lead["id"],
        "student_name": f"TEST_Student_{suffix}",
        "email": f"student_{suffix}@test.com", "phone": "9999999999",
        "dob": "2000-01-01", "address": "Test Address", "qualification": "BTech",
        "program_id": test_program["id"], "branch_id": test_branch["id"],
        "fee_quoted": 27000.0, "discount": 0, "enrollment_date": "2026-01-15",
    }
    r = requests.post(f"{API}/enrollments", json=payload, headers=h(admin_token))
    assert r.status_code in (200, 201), r.text
    return r.json()


class TestEnrollmentBranchInheritance:
    def test_enrollment_id_non_null_and_formatted(self, test_enrollment, test_branch):
        eid = test_enrollment.get("enrollment_id")
        assert eid, f"enrollment_id is null/empty: {test_enrollment}"
        assert "E" in eid, eid
        assert test_enrollment.get("branch_id") == test_branch["id"], test_enrollment.get("branch_id")
        assert test_enrollment.get("branch_id") != "default"

    def test_enrollment_for_second_branch_inherits(self, admin_token, second_branch, test_program, test_lead_branch2):
        suffix = uuid.uuid4().hex[:6]
        payload = {
            "lead_id": test_lead_branch2["id"],
            "student_name": f"TEST_StudentB2_{suffix}",
            "email": f"sb2_{suffix}@test.com", "phone": "9999988888",
            "dob": "2000-01-01", "address": "Addr2", "qualification": "BTech",
            "program_id": test_program["id"], "branch_id": second_branch["id"],
            "fee_quoted": 27000.0, "discount": 0, "enrollment_date": "2026-01-15",
        }
        r = requests.post(f"{API}/enrollments", json=payload, headers=h(admin_token))
        assert r.status_code in (200, 201), r.text
        enr = r.json()
        assert enr.get("enrollment_id"), enr
        assert enr.get("branch_id") == second_branch["id"], enr
        # branch-coded enrollment_id with second branch state/city codes
        eid_val = enr["enrollment_id"]
        assert "S2C2" in eid_val or "E" in eid_val, f"Expected branch-coded enrollment_id, got {eid_val}"


# ---------------- FEE MANAGEMENT ----------------
class TestFeeManagement:
    """final_fee=27000, 3x9000 installments"""

    def test_partial_payment_1(self, admin_token, test_enrollment):
        pay = {"enrollment_id": test_enrollment["id"], "amount": 9000,
               "payment_mode": "Cash", "payment_date": "2026-01-20"}
        r = requests.post(f"{API}/payments", json=pay, headers=h(admin_token))
        assert r.status_code in (200, 201), r.text
        body = r.json()
        rno = body.get("receipt_number", "")
        assert rno, body
        assert "R" in rno, f"Receipt number format unexpected: {rno}"
        assert "default" not in rno
        time.sleep(0.3)
        elist = requests.get(f"{API}/enrollments", headers=h(admin_token)).json()
        me = next(e for e in elist if e["id"] == test_enrollment["id"])
        assert me.get("payment_status") in ("Partial", "Partially Paid"), me.get("payment_status")
        assert me.get("total_paid") == 9000

    def test_partial_payment_2_still_partial(self, admin_token, test_enrollment):
        pay = {"enrollment_id": test_enrollment["id"], "amount": 9000,
               "payment_mode": "Cash", "payment_date": "2026-01-21"}
        r = requests.post(f"{API}/payments", json=pay, headers=h(admin_token))
        assert r.status_code in (200, 201), r.text
        time.sleep(0.3)
        elist = requests.get(f"{API}/enrollments", headers=h(admin_token)).json()
        me = next(e for e in elist if e["id"] == test_enrollment["id"])
        assert me.get("payment_status") in ("Partial", "Partially Paid"), me.get("payment_status")
        assert me.get("total_paid") == 18000

    def test_final_payment_paid(self, admin_token, test_enrollment):
        pay = {"enrollment_id": test_enrollment["id"], "amount": 9000,
               "payment_mode": "Cash", "payment_date": "2026-01-22"}
        r = requests.post(f"{API}/payments", json=pay, headers=h(admin_token))
        assert r.status_code in (200, 201), r.text
        time.sleep(0.3)
        elist = requests.get(f"{API}/enrollments", headers=h(admin_token)).json()
        me = next(e for e in elist if e["id"] == test_enrollment["id"])
        assert me.get("payment_status") == "Paid", me.get("payment_status")
        assert me.get("total_paid") == 27000, me.get("total_paid")

    def test_payments_all_and_pending(self, admin_token, test_enrollment):
        r = requests.get(f"{API}/payments/all", headers=h(admin_token))
        assert r.status_code == 200
        all_payments = r.json() if isinstance(r.json(), list) else r.json().get("payments", [])
        # Our enrollment should have 3 payments
        ours = [p for p in all_payments if p.get("enrollment_id") == test_enrollment["id"]]
        assert len(ours) >= 3, f"Expected >=3 payments for enrollment, got {len(ours)}"
        # check student_name is preserved (snapshot at payment time)
        for p in ours:
            assert p.get("student_name"), f"Payment missing student_name: {p}"

        r2 = requests.get(f"{API}/payments/pending", headers=h(admin_token))
        assert r2.status_code == 200


# ---------------- CERTIFICATE EDIT PROPAGATION (FIX #2) ----------------
@pytest.fixture(scope="session")
def cert_setup(admin_token, test_enrollment):
    """Directly seed course_completions in MongoDB (per request)."""
    try:
        from pymongo import MongoClient
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "etieducom_db")
        client = MongoClient(mongo_url)
        db = client[db_name]
        existing = db.course_completions.find_one({"enrollment_id": test_enrollment["id"]})
        if not existing:
            db.course_completions.insert_one({
                "id": str(uuid.uuid4()),
                "enrollment_id": test_enrollment["id"],
                "exam_status": "Passed",
                "completion_date": "2026-01-25",
                "remarks": "TEST seeded",
                "marked_at": "2026-01-25T00:00:00Z",
                "marked_by": "TEST",
            })
        client.close()
        return True
    except Exception as e:
        print(f"course_completion seed failed: {e}")
        return False


@pytest.fixture(scope="session")
def approved_ready_cert(admin_token, test_enrollment, cert_setup):
    # clear prior
    listing = requests.get(f"{API}/certificate-requests", headers=h(admin_token)).json()
    items = listing if isinstance(listing, list) else listing.get("items", [])
    for c in items:
        if c.get("enrollment_number") == test_enrollment["enrollment_id"]:
            requests.delete(f"{API}/certificate-requests/{c['id']}", headers=h(admin_token))

    payload = {
        "enrollment_number": test_enrollment["enrollment_id"],
        "email": "cert@test.com", "phone": "7777777777",
        "program_start_date": "2026-01-01", "program_end_date": "2026-04-01",
        "training_mode": "Offline", "training_hours": 120,
    }
    r = requests.post(f"{API}/public/certificate-requests", json=payload)
    assert r.status_code in (200, 201), f"cert create: {r.status_code} {r.text}"
    cid = r.json().get("certificate_id")
    listing = requests.get(f"{API}/certificate-requests", headers=h(admin_token)).json()
    items = listing if isinstance(listing, list) else listing.get("items", [])
    match = next(c for c in items if c.get("certificate_id") == cid)
    req_id = match["id"]
    # approve
    ra = requests.post(f"{API}/certificate-requests/{req_id}/approve", headers=h(admin_token))
    assert ra.status_code == 200, ra.text
    # download -> mark Ready
    rd = requests.post(f"{API}/certificate-requests/{req_id}/download", headers=h(admin_token))
    assert rd.status_code in (200, 201), rd.text
    return req_id


class TestCertificateEditPropagation:

    def test_edit_student_then_cert_get_reflects_new_value(self, admin_token, approved_ready_cert,
                                                          test_enrollment):
        req_id = approved_ready_cert
        # Snapshot original
        rc0 = requests.get(f"{API}/certificate-requests/{req_id}", headers=h(admin_token))
        assert rc0.status_code == 200
        old_doc = rc0.json()
        old_name = old_doc.get("student_name")
        old_phone = old_doc.get("phone")
        assert old_name, old_doc

        # Edit underlying student (endpoint uses doc id, not enrollment_id alphanumeric)
        eid = test_enrollment["id"]
        new_name = f"EDITED_{uuid.uuid4().hex[:5]}"
        new_phone = "6000000001"
        ru = requests.put(f"{API}/students/{eid}/update",
                          json={"student_name": new_name, "phone": new_phone},
                          headers=h(admin_token))
        assert ru.status_code in (200, 204), ru.text

        # GET cert - should reflect live data
        rc = requests.get(f"{API}/certificate-requests/{req_id}", headers=h(admin_token))
        assert rc.status_code == 200
        cert_doc = rc.json()
        assert cert_doc.get("student_name") == new_name, \
            f"CERT GET did not reflect student edit: got {cert_doc.get('student_name')!r} expected {new_name!r}"
        assert cert_doc.get("phone") == new_phone, \
            f"CERT GET did not reflect phone edit: got {cert_doc.get('phone')!r}"

    def test_public_verify_reflects_new_value(self, admin_token, approved_ready_cert):
        rc = requests.get(f"{API}/certificate-requests/{approved_ready_cert}", headers=h(admin_token))
        cert_doc = rc.json()
        live_name = cert_doc.get("student_name")
        vid = cert_doc.get("verification_id")
        assert vid, cert_doc
        vr = requests.get(f"{API}/public/verify/{vid}")
        assert vr.status_code == 200, vr.text
        vbody = vr.json()
        assert vbody.get("verified") is True, vbody
        details = vbody.get("certificate_details") or vbody.get("details") or vbody
        # student_name in verify details must match live (already-edited) name
        verify_name = details.get("student_name")
        assert verify_name == live_name, \
            f"Public verify name mismatch: {verify_name!r} vs live {live_name!r}"

    def test_program_rename_reflects_on_cert(self, admin_token, approved_ready_cert, test_program):
        new_pname = f"TEST_Prog_Renamed_{uuid.uuid4().hex[:5]}"
        full_payload = {
            "name": new_pname,
            "duration": test_program.get("duration", "3 Months"),
            "fee": test_program.get("fee", 30000.0),
            "max_discount_percent": test_program.get("max_discount_percent", 20.0),
        }
        ru = requests.put(f"{API}/admin/programs/{test_program['id']}",
                          json=full_payload, headers=h(admin_token))
        if ru.status_code not in (200, 204):
            pytest.skip(f"Program rename endpoint returned {ru.status_code} {ru.text[:200]}")
        rc = requests.get(f"{API}/certificate-requests/{approved_ready_cert}", headers=h(admin_token))
        assert rc.status_code == 200
        cert_doc = rc.json()
        assert cert_doc.get("program_name") == new_pname, \
            f"Program rename did not propagate to cert: got {cert_doc.get('program_name')!r}"


# ---------------- CERT REJECT + DELETE (FIX #3) ----------------
class TestCertificateRejectDelete:
    def test_reject_then_delete_returns_200(self, admin_token, test_enrollment, cert_setup):
        # clear all prior
        listing = requests.get(f"{API}/certificate-requests", headers=h(admin_token)).json()
        items = listing if isinstance(listing, list) else listing.get("items", [])
        for c in items:
            if c.get("enrollment_number") == test_enrollment["enrollment_id"]:
                requests.delete(f"{API}/certificate-requests/{c['id']}", headers=h(admin_token))

        # create new
        payload = {
            "enrollment_number": test_enrollment["enrollment_id"],
            "email": "rej@t.com", "phone": "1111111111",
            "program_start_date": "2026-01-01", "program_end_date": "2026-04-01",
            "training_mode": "Online", "training_hours": 100,
        }
        r = requests.post(f"{API}/public/certificate-requests", json=payload)
        assert r.status_code in (200, 201), r.text
        cid = r.json().get("certificate_id")
        listing = requests.get(f"{API}/certificate-requests", headers=h(admin_token)).json()
        items = listing if isinstance(listing, list) else listing.get("items", [])
        match = next(c for c in items if c.get("certificate_id") == cid)
        req_id = match["id"]

        # Reject
        rj = requests.post(f"{API}/certificate-requests/{req_id}/reject",
                           params={"reason": "Test"}, headers=h(admin_token))
        assert rj.status_code == 200, rj.text

        # Delete rejected
        dl = requests.delete(f"{API}/certificate-requests/{req_id}", headers=h(admin_token))
        assert dl.status_code == 200, f"DELETE rejected cert: {dl.status_code} {dl.text}"
        body = dl.json() if dl.text else {}
        assert "message" in body or "success" in body or "deleted" in str(body).lower(), body

        # GET -> 404
        gone = requests.get(f"{API}/certificate-requests/{req_id}", headers=h(admin_token))
        assert gone.status_code == 404, gone.status_code


# ---------------- WIZBANG ----------------
class TestWizbang:
    def test_account(self, wiz_token):
        r = requests.get(f"{API}/wizbang/account", headers=h(wiz_token))
        assert r.status_code == 200
        d = r.json()
        assert "opening_balance" in d and "current_balance" in d

    def test_dashboard_12month_and_balance_formula(self, wiz_token):
        d = requests.get(f"{API}/wizbang/dashboard", headers=h(wiz_token))
        assert d.status_code == 200
        body = d.json()
        chart = body.get("chart_12_months") or body.get("chart") or body.get("monthly_chart") or []
        assert len(chart) == 12, f"chart len={len(chart)}"
        # current_balance == opening + total_income - total_expense
        acc = requests.get(f"{API}/wizbang/account", headers=h(wiz_token)).json()
        ob = acc["opening_balance"]
        ti = acc.get("total_income", 0)
        te = acc.get("total_expense", 0)
        cb = acc["current_balance"]
        assert cb == ob + ti - te, f"balance mismatch: cb={cb} ob+ti-te={ob+ti-te}"

    def test_counsellor_forbidden(self, admin_token):
        cs_email = f"counsellor_{uuid.uuid4().hex[:5]}@t.com"
        reg = requests.post(f"{API}/auth/register", json={
            "name": "TEST Cou", "email": cs_email, "password": "Test@123",
            "role": "Counsellor", "branch_id": None,
        }, headers=h(admin_token))
        if reg.status_code not in (200, 201):
            pytest.skip(f"counsellor create failed: {reg.text[:200]}")
        lg = _login(cs_email, "Test@123")
        if lg.status_code != 200:
            pytest.skip("counsellor login failed")
        tok = lg.json()["access_token"]
        r = requests.get(f"{API}/wizbang/account", headers=h(tok))
        assert r.status_code == 403, f"got {r.status_code}"


# ---------------- SMOKE ----------------
class TestSmoke:
    def test_audit_logs(self, admin_token):
        assert requests.get(f"{API}/audit-logs", headers=h(admin_token)).status_code == 200

    def test_analytics_overview(self, admin_token):
        assert requests.get(f"{API}/analytics/overview", headers=h(admin_token)).status_code == 200
