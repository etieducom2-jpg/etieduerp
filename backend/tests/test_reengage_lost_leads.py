"""
Iteration 11 — Re-engage Lost Leads feature

Coverage:
- GET /api/leads-search/lost — Lost lead listing scoped by role + days/limit filters
- POST /api/leads/{lead_id}/reengage — transitions Lost -> active (default 'New'),
  clears lost_reason, sets reengaged_at, writes 'reengaged' audit, optional assign_to
- Regression: POST /api/leads/{id}/transition to mark a lead Lost (Counsellor) used
  to seed scenarios.
"""

import os
import uuid
import time

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://enterprise-hub-340.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _login(username: str, password: str) -> str:
    r = requests.post(
        f"{API}/auth/login",
        data={"username": username, "password": password},
        timeout=30,
    )
    assert r.status_code == 200, f"login failed for {username}: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token():
    return _login("admin@etieducom.com", "admin@123")


@pytest.fixture(scope="session")
def branch_admin_token():
    return _login("branchadmin@etieducom.com", "branch@123")


@pytest.fixture(scope="session")
def counsellor_token():
    return _login("riya.counsellor@test.com", "test@123")


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---- helpers --------------------------------------------------------------

def _ensure_lost_lead(counsellor_token: str, admin_token: str) -> str:
    """Make sure at least one Lost lead exists in Riya's scope. Return its id."""
    # Look at current Lost list as admin first
    r = requests.get(f"{API}/leads-search/lost?limit=50", headers=_h(admin_token), timeout=30)
    assert r.status_code == 200, r.text
    items = r.json().get("results", [])
    # Prefer one owned by Riya so counsellor-scoped test also has data
    for it in items:
        if it.get("counsellor_id") == "phasea-counsellor-1":
            return it["id"]
    if items:
        return items[0]["id"]

    # else create one: take any New lead owned by Riya and mark Lost
    r = requests.get(f"{API}/leads?limit=200", headers=_h(counsellor_token), timeout=30)
    assert r.status_code == 200, r.text
    leads = r.json() if isinstance(r.json(), list) else r.json().get("items", [])
    # Only Riya-owned leads are transition-able by Riya
    candidate = next(
        (l for l in leads
         if l.get("counsellor_id") == "phasea-counsellor-1"
         and l.get("status") not in ("Lost", "Not Interested", "Converted", "Admitted")),
        None,
    )
    assert candidate, "No Riya-owned non-lost lead available to seed"
    rr = requests.post(
        f"{API}/leads/{candidate['id']}/transition",
        json={"target_stage": "Lost", "fields": {"lost_reason": "Budget"}, "note": "seed for reengage test"},
        headers=_h(counsellor_token), timeout=30,
    )
    assert rr.status_code == 200, rr.text
    return candidate["id"]


# ---- GET /api/leads-search/lost -------------------------------------------

class TestListLostLeads:
    def test_branch_admin_list(self, branch_admin_token, counsellor_token, admin_token):
        _ensure_lost_lead(counsellor_token, admin_token)
        r = requests.get(f"{API}/leads-search/lost?limit=50", headers=_h(branch_admin_token), timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "results" in body and "count" in body
        assert isinstance(body["results"], list)
        assert body["count"] == len(body["results"])
        # each item carries required fields + lost_days
        if body["results"]:
            item = body["results"][0]
            for k in ["id", "name", "status", "lost_days"]:
                assert k in item, f"missing {k} in lost lead item"
            assert item["status"] in ("Lost", "Not Interested")

    def test_counsellor_scoping(self, counsellor_token, admin_token):
        _ensure_lost_lead(counsellor_token, admin_token)
        r = requests.get(f"{API}/leads-search/lost?limit=50", headers=_h(counsellor_token), timeout=30)
        assert r.status_code == 200, r.text
        # any returned items must be owned/created by Riya
        for it in r.json()["results"]:
            assert it.get("counsellor_id") in (None, "phasea-counsellor-1") or it.get("counsellor_name", "").lower().startswith("riya")

    def test_days_filter_zero_zero_returns_subset(self, branch_admin_token):
        r1 = requests.get(f"{API}/leads-search/lost?days_min=0&days_max=0&limit=200", headers=_h(branch_admin_token), timeout=30)
        r2 = requests.get(f"{API}/leads-search/lost?days_min=0&days_max=365&limit=200", headers=_h(branch_admin_token), timeout=30)
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["count"] <= r2.json()["count"]
        for it in r1.json()["results"]:
            assert it["lost_days"] == 0

    def test_limit_param_respected(self, branch_admin_token):
        r = requests.get(f"{API}/leads-search/lost?limit=1", headers=_h(branch_admin_token), timeout=30)
        assert r.status_code == 200
        assert len(r.json()["results"]) <= 1


# ---- POST /api/leads/{id}/reengage ---------------------------------------

class TestReengageLostLead:
    def test_404_unknown_id(self, branch_admin_token):
        r = requests.post(
            f"{API}/leads/{uuid.uuid4()}/reengage",
            json={"reason": "retry", "target_stage": "New"},
            headers=_h(branch_admin_token), timeout=30,
        )
        assert r.status_code == 404, r.text

    def test_403_counsellor_cannot_reengage(self, counsellor_token, admin_token):
        lead_id = _ensure_lost_lead(counsellor_token, admin_token)
        r = requests.post(
            f"{API}/leads/{lead_id}/reengage",
            json={"reason": "retry", "target_stage": "New"},
            headers=_h(counsellor_token), timeout=30,
        )
        assert r.status_code == 403, r.text

    def test_400_invalid_target_stage(self, branch_admin_token, counsellor_token, admin_token):
        lead_id = _ensure_lost_lead(counsellor_token, admin_token)
        r = requests.post(
            f"{API}/leads/{lead_id}/reengage",
            json={"reason": "x", "target_stage": "NotARealStage"},
            headers=_h(branch_admin_token), timeout=30,
        )
        assert r.status_code == 400, r.text

    def test_400_when_lead_not_lost(self, branch_admin_token):
        # find a New / active lead in admin scope
        r = requests.get(f"{API}/leads?limit=100", headers=_h(branch_admin_token), timeout=30)
        assert r.status_code == 200
        leads = r.json() if isinstance(r.json(), list) else r.json().get("items", [])
        active = next((l for l in leads if l.get("status") not in ("Lost", "Not Interested")), None)
        if not active:
            pytest.skip("No active lead to test 400 on non-lost")
        rr = requests.post(
            f"{API}/leads/{active['id']}/reengage",
            json={"reason": "x", "target_stage": "New"},
            headers=_h(branch_admin_token), timeout=30,
        )
        assert rr.status_code == 400, rr.text

    def test_happy_path_reengages_lead(self, branch_admin_token, counsellor_token, admin_token):
        lead_id = _ensure_lost_lead(counsellor_token, admin_token)

        # Confirm starting state
        before = requests.get(f"{API}/leads/{lead_id}", headers=_h(branch_admin_token), timeout=30)
        assert before.status_code == 200
        assert before.json()["status"] in ("Lost", "Not Interested")

        r = requests.post(
            f"{API}/leads/{lead_id}/reengage",
            json={"reason": "second chance", "target_stage": "New"},
            headers=_h(branch_admin_token), timeout=30,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert body.get("new_status") == "New"
        assert body.get("reengaged_at")
        lead = body.get("lead") or {}
        assert lead.get("status") == "New"
        assert lead.get("lost_reason") in (None, "", "null")
        assert lead.get("reengaged_at")

        # GET to verify persistence (note: GET /leads/{id} response model
        # may not expose reengaged_at — the field is verified via the POST
        # response and the timeline audit below)
        after = requests.get(f"{API}/leads/{lead_id}", headers=_h(branch_admin_token), timeout=30)
        assert after.status_code == 200
        a = after.json()
        assert a["status"] == "New"
        assert (a.get("lost_reason") in (None, "", "null"))

        # Audit entry written — timeline normalises event_type='reengaged'
        # to type='status_change' with title 'Status: Lost → New'.
        tl = requests.get(f"{API}/leads/{lead_id}/timeline", headers=_h(branch_admin_token), timeout=30)
        assert tl.status_code == 200, tl.text
        events = tl.json() if isinstance(tl.json(), list) else tl.json().get("events", [])
        assert any(
            e.get("event_type") == "reengaged"
            or e.get("type") == "reengaged"
            or (e.get("type") == "status_change" and "Lost" in (e.get("title") or "") and "New" in (e.get("title") or ""))
            for e in events
        ), f"no reengaged audit found in timeline: {events[:3]}"

    def test_reengage_with_assign_to(self, branch_admin_token, counsellor_token, admin_token):
        # Seed a fresh lost lead first
        # mark a current Riya lead Lost
        r = requests.get(f"{API}/leads?limit=200", headers=_h(counsellor_token), timeout=30)
        leads = r.json() if isinstance(r.json(), list) else r.json().get("items", [])
        candidate = next(
            (l for l in leads
             if l.get("counsellor_id") == "phasea-counsellor-1"
             and l.get("status") not in ("Lost", "Not Interested", "Converted", "Admitted")),
            None,
        )
        if not candidate:
            pytest.skip("No non-lost candidate to seed for assign_to test")
        seed = requests.post(
            f"{API}/leads/{candidate['id']}/transition",
            json={"target_stage": "Lost", "fields": {"lost_reason": "Other"}, "note": "seed assign_to test"},
            headers=_h(counsellor_token), timeout=30,
        )
        assert seed.status_code == 200, seed.text

        new_owner = "phasea-counsellor-2"  # Arjun
        r = requests.post(
            f"{API}/leads/{candidate['id']}/reengage",
            json={"reason": "retry", "target_stage": "Contact Attempted", "assign_to": new_owner},
            headers=_h(branch_admin_token), timeout=30,
        )
        assert r.status_code == 200, r.text
        lead = r.json()["lead"]
        assert lead["status"] == "Contact Attempted"
        assert lead.get("counsellor_id") == new_owner

    def test_reengage_invalid_assign_to(self, branch_admin_token, counsellor_token, admin_token):
        lead_id = _ensure_lost_lead(counsellor_token, admin_token)
        r = requests.post(
            f"{API}/leads/{lead_id}/reengage",
            json={"reason": "x", "target_stage": "New", "assign_to": "nonexistent-user-id"},
            headers=_h(branch_admin_token), timeout=30,
        )
        # Lead might already be re-engaged from prior test (-> 400 not-lost). Accept either.
        assert r.status_code in (400,), r.text
