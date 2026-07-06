"""
Iteration: Placement Manager Module + Meta Ads Sheet sync + Demos-today access widen.
Backend regression covering review_request items.
"""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")

ADMIN_EMAIL = "admin@etieducom.com"
ADMIN_PWD = "admin@123"
PLACE_EMAIL = "placement@etieducom.com"
PLACE_PWD = "placement@123"


# ---------------- helpers ----------------
def _unwrap(obj, *keys):
    """Endpoints may return either a list or {key: [...]}. Normalize to list."""
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict):
        for k in keys:
            if isinstance(obj.get(k), list):
                return obj[k]
    return obj


def _login(email, password):
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": email, "password": password},
        timeout=20,
    )
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text[:200]}"
    j = r.json()
    return j["access_token"], j["user"]


@pytest.fixture(scope="module")
def admin_headers():
    tok, _ = _login(ADMIN_EMAIL, ADMIN_PWD)
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def placement_headers():
    tok, user = _login(PLACE_EMAIL, PLACE_PWD)
    assert user["role"] == "Placement Manager"
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def counsellor_headers():
    """Register a transient counsellor for negative/positive role checks."""
    email = f"TEST_counsellor_{int(time.time())}@etieducom.com"
    pwd = "test@123"
    payload = {
        "email": email,
        "password": pwd,
        "name": "TEST Counsellor",
        "role": "Counsellor",
    }
    r = requests.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=20)
    # Some envs return 200 with token, some 201 with user
    assert r.status_code in (200, 201), f"register: {r.status_code} {r.text[:200]}"
    tok, _ = _login(email, pwd)
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def rahul_student_id(placement_headers):
    r = requests.get(f"{BASE_URL}/api/placement/students", headers=placement_headers, timeout=20)
    assert r.status_code == 200
    students = _unwrap(r.json(), "students", "items", "data")
    assert isinstance(students, list)
    rahul = next((s for s in students if "Rahul" in (s.get("student_name") or s.get("name") or "")), None)
    assert rahul is not None, f"Rahul Sharma not in placement students. Got: {[s.get('student_name') or s.get('name') for s in students]}"
    sid = rahul.get("id") or rahul.get("enrollment_id") or rahul.get("_id")
    assert sid
    return sid


@pytest.fixture(scope="module")
def main_branch_id(admin_headers):
    r = requests.get(f"{BASE_URL}/api/admin/branches", headers=admin_headers, timeout=20)
    assert r.status_code == 200
    branches = r.json()
    assert isinstance(branches, list) and len(branches) >= 1
    return branches[0]["id"], branches


# ---------------- AUTH ----------------
class TestAuth:
    def test_admin_login(self):
        tok, user = _login(ADMIN_EMAIL, ADMIN_PWD)
        assert tok
        assert user["role"] == "Admin"

    def test_placement_login(self):
        tok, user = _login(PLACE_EMAIL, PLACE_PWD)
        assert tok
        assert user["role"] == "Placement Manager"


# ---------------- PLACEMENT ----------------
class TestPlacement:
    def test_dashboard_stats(self, placement_headers):
        r = requests.get(f"{BASE_URL}/api/placement/dashboard-stats", headers=placement_headers, timeout=20)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        for k in ("completed_students", "placed_students", "pending_for_placement", "upcoming_interviews"):
            assert k in d, f"missing {k}; got {list(d.keys())}"

    def test_list_students_contains_rahul(self, placement_headers, rahul_student_id):
        assert rahul_student_id  # fixture ensured presence

    def test_get_student_detail(self, placement_headers, rahul_student_id):
        r = requests.get(f"{BASE_URL}/api/placement/students/{rahul_student_id}", headers=placement_headers, timeout=20)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        # endpoint should return student + interviews + remarks + placement
        keys = set(d.keys())
        for k in ("student", "interviews", "remarks", "placement"):
            assert k in keys, f"missing {k} in detail keys={keys}"

    def test_generate_resume_pdf(self, placement_headers, rahul_student_id):
        # Per review_request: pdf_base64 must come back even when LLM proxy is down
        # (template fallback path). Sending skills as a list per spec.
        payload = {
            "student_id": rahul_student_id,
            "skills": ["Python", "FastAPI", "MongoDB"],
            "objective": "To secure a backend engineer role",
            "projects": [
                {"title": "ERP App", "description": "Built FastAPI ERP module"}
            ],
        }
        r = requests.post(
            f"{BASE_URL}/api/placement/resume/generate",
            headers=placement_headers,
            json=payload,
            timeout=90,
        )
        assert r.status_code == 200, f"resume generate: {r.status_code} {r.text[:400]}"
        d = r.json()
        assert d.get("ok") is True, f"ok!=true; got {d}"
        assert d.get("pdf_base64"), "pdf_base64 must be non-empty"
        assert d.get("filename")
        assert isinstance(d.get("resume"), dict)
        for k in ("summary", "skills", "education"):
            assert k in d["resume"], f"resume missing key {k}; got {list(d['resume'].keys())}"

    def test_generate_resume_with_string_skills(self, placement_headers, rahul_student_id):
        """Alternate input shape — skills as comma-separated string."""
        payload = {
            "student_id": rahul_student_id,
            "skills": "Python, FastAPI, MongoDB",
            "objective": "Backend role",
            "projects": [],
        }
        r = requests.post(
            f"{BASE_URL}/api/placement/resume/generate",
            headers=placement_headers,
            json=payload,
            timeout=90,
        )
        assert r.status_code == 200, f"string-skills resume: {r.status_code} {r.text[:300]}"

    def test_create_interview(self, placement_headers, rahul_student_id):
        # Payload mirrors what the frontend StudentPlacementDrawer actually sends
        payload = {
            "student_id": rahul_student_id,
            "student_name": "Rahul Sharma",
            "company_name": "TEST_Corp",
            "interview_date": "2030-01-15",
            "interview_time": "10:00",
            "mode": "Online",
            "role": "SDE-1",
            "notes": "TEST interview",
        }
        r = requests.post(
            f"{BASE_URL}/api/placement/interview",
            headers=placement_headers,
            json=payload,
            timeout=20,
        )
        assert r.status_code == 200, f"create-interview failed: {r.status_code} body={r.text[:300]}"
        d = r.json()
        assert d.get("ok") is True
        pytest.interview_id = (d.get("interview") or {}).get("id") or d.get("id")

    def test_list_interviews(self, placement_headers):
        r = requests.get(f"{BASE_URL}/api/placement/interviews", headers=placement_headers, timeout=20)
        assert r.status_code == 200
        items = _unwrap(r.json(), "interviews", "items", "data")
        assert isinstance(items, list)
        assert any((i.get("company_name") == "TEST_Corp") for i in items), "TEST_Corp interview not found"
        # capture id if we don't have one
        if not getattr(pytest, "interview_id", None):
            for i in items:
                if i.get("company_name") == "TEST_Corp":
                    pytest.interview_id = i.get("id")
                    break

    def test_upcoming_interviews_filter(self, placement_headers):
        r = requests.get(
            f"{BASE_URL}/api/placement/interviews?upcoming=true",
            headers=placement_headers, timeout=20,
        )
        assert r.status_code == 200
        items = _unwrap(r.json(), "interviews", "items", "data")
        assert isinstance(items, list)
        assert any(i.get("company_name") == "TEST_Corp" for i in items)

    def test_update_interview_status(self, placement_headers):
        iid = getattr(pytest, "interview_id", None)
        assert iid, "no interview id captured from previous tests"
        r = requests.put(
            f"{BASE_URL}/api/placement/interview/{iid}",
            headers=placement_headers,
            json={"status": "Selected"},
            timeout=20,
        )
        assert r.status_code == 200, r.text[:300]
        # verify persistence
        r2 = requests.get(f"{BASE_URL}/api/placement/interviews", headers=placement_headers, timeout=20)
        assert r2.status_code == 200
        items2 = _unwrap(r2.json(), "interviews", "items", "data")
        match = next((x for x in items2 if x.get("id") == iid), None)
        assert match and match.get("status") == "Selected", f"status not persisted: {match}"

    def test_add_remark(self, placement_headers, rahul_student_id):
        r = requests.post(
            f"{BASE_URL}/api/placement/remark",
            headers=placement_headers,
            json={"student_id": rahul_student_id, "remark": "TEST remark - good candidate"},
            timeout=20,
        )
        assert r.status_code == 200, r.text[:300]
        # verify via detail
        d = requests.get(f"{BASE_URL}/api/placement/students/{rahul_student_id}", headers=placement_headers).json()
        remarks = d.get("remarks", [])
        assert any("TEST remark" in (rm.get("remark") or "") for rm in remarks)

    def test_mark_placed_and_upsert(self, placement_headers, rahul_student_id):
        # mirrors frontend payload
        payload = {
            "student_id": rahul_student_id,
            "student_name": "Rahul Sharma",
            "company_name": "TEST_BigCo",
            "designation": "SDE-1",
            "salary_lpa": 8.5,
            "city": "Bengaluru",
        }
        r1 = requests.post(f"{BASE_URL}/api/placement/mark-placed", headers=placement_headers, json=payload, timeout=20)
        assert r1.status_code == 200, f"mark-placed: {r1.status_code} {r1.text[:300]}"
        # second call should upsert (no duplicate)
        payload2 = {**payload, "salary_lpa": 9.0}
        r2 = requests.post(f"{BASE_URL}/api/placement/mark-placed", headers=placement_headers, json=payload2, timeout=20)
        assert r2.status_code == 200, r2.text[:300]
        # check placements list has only one row for student
        lst = requests.get(f"{BASE_URL}/api/placement/placements", headers=placement_headers, timeout=20)
        assert lst.status_code == 200
        placements = _unwrap(lst.json(), "placements", "items", "data")
        rows = [p for p in placements if (p.get("student_id") == rahul_student_id) or (p.get("enrollment_id") == rahul_student_id)]
        assert len(rows) == 1, f"upsert failed; rows={len(rows)}"
        # salary should be updated to 9.0
        sal = rows[0].get("salary_lpa") or rows[0].get("salary")
        assert sal in (9.0, 9, "9.0", "9"), f"salary not updated: {sal}"

    def test_list_placements(self, placement_headers):
        r = requests.get(f"{BASE_URL}/api/placement/placements", headers=placement_headers, timeout=20)
        assert r.status_code == 200
        placements = _unwrap(r.json(), "placements", "items", "data")
        assert isinstance(placements, list)

    def test_non_placement_role_blocked(self, counsellor_headers):
        r = requests.get(f"{BASE_URL}/api/placement/students", headers=counsellor_headers, timeout=20)
        assert r.status_code == 403, f"expected 403 for counsellor; got {r.status_code} {r.text[:200]}"


# ---------------- META ADS SHEET ----------------
class TestMetaSheet:
    def test_set_meta_sheet_url_and_reset_lastrow(self, admin_headers, main_branch_id):
        bid, _ = main_branch_id
        sheet_url = f"https://docs.google.com/spreadsheets/d/TEST_{int(time.time())}/edit"
        r = requests.put(
            f"{BASE_URL}/api/branches/{bid}/meta-sheet",
            headers=admin_headers,
            json={"meta_ads_sheet_url": sheet_url},
            timeout=20,
        )
        assert r.status_code == 200, r.text[:300]
        # verify it shows up in branches with last_row reset
        b = requests.get(f"{BASE_URL}/api/admin/branches", headers=admin_headers).json()
        target = next((x for x in b if x["id"] == bid), None)
        assert target
        assert target.get("meta_ads_sheet_url") == sheet_url
        assert target.get("meta_ads_sheet_last_row") in (0, "0", None) or target.get("meta_ads_sheet_last_row") == 0

    def test_meta_sheet_sync_graceful(self, admin_headers, main_branch_id):
        bid, _ = main_branch_id
        r = requests.post(
            f"{BASE_URL}/api/branches/{bid}/meta-sheet/sync",
            headers=admin_headers,
            timeout=30,
        )
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        # bogus url -> graceful with ok=false reason like 'http_xxx'
        assert "ok" in d
        if d.get("ok") is False:
            assert d.get("reason"), f"reason missing on failure: {d}"

    def test_branches_response_has_meta_fields(self, admin_headers, main_branch_id):
        _, branches = main_branch_id
        b0 = branches[0]
        # Just verify keys exist in the response model
        for k in ("meta_ads_sheet_url", "meta_ads_sheet_last_sync", "meta_ads_sheet_last_row"):
            assert k in b0, f"branch model missing field {k}; got {list(b0.keys())}"


# ---------------- DEMOS TODAY ----------------
class TestDemosToday:
    def test_demos_today_admin(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/branch-admin/demos-today", headers=admin_headers, timeout=20)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        for k in ("date", "count", "demos"):
            assert k in d, f"missing key {k}; got {list(d.keys())}"
        assert isinstance(d["demos"], list)

    def test_demos_today_counsellor_allowed(self, counsellor_headers):
        r = requests.get(f"{BASE_URL}/api/branch-admin/demos-today", headers=counsellor_headers, timeout=20)
        assert r.status_code == 200, f"counsellor should now be allowed (was 403); got {r.status_code} {r.text[:200]}"


# ---------------- REGRESSION ----------------
class TestRegression:
    def test_admin_branches_list(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/branches", headers=admin_headers, timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
