"""
Iteration 10 — Lead Conversion Management System
Tests:
  - GET /api/leads-kanban/board (counsellor + branch admin scopes)
  - POST /api/leads/{lead_id}/transition (validation, audit, auth)
  - GET /api/leads/{lead_id}/timeline (status_change events)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

COUNSELLOR_EMAIL = "riya.counsellor@test.com"
COUNSELLOR_PASS = "test@123"
OTHER_COUNS_EMAIL = "arjun.c@test.com"
OTHER_COUNS_PASS = "test@123"
BRANCH_ADMIN_EMAIL = "branchadmin@etieducom.com"
BRANCH_ADMIN_PASS = "branch@123"

PIPELINE_STAGES = [
    "New", "Contact Attempted", "Connected", "Interested",
    "Counselling Scheduled", "Demo Scheduled", "Demo Attended",
    "Admission Likely", "Converted", "Lost",
]


def _login(email, password):
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": email, "password": password},
    )
    if r.status_code != 200:
        pytest.skip(f"Login failed for {email}: {r.status_code} {r.text[:120]}")
    return r.json().get("access_token")


@pytest.fixture(scope="module")
def counsellor_token():
    return _login(COUNSELLOR_EMAIL, COUNSELLOR_PASS)


@pytest.fixture(scope="module")
def other_counsellor_token():
    return _login(OTHER_COUNS_EMAIL, OTHER_COUNS_PASS)


@pytest.fixture(scope="module")
def branch_admin_token():
    return _login(BRANCH_ADMIN_EMAIL, BRANCH_ADMIN_PASS)


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- Kanban board ----------
class TestKanbanBoard:
    def test_counsellor_kanban_10_stages(self, counsellor_token):
        r = requests.get(f"{BASE_URL}/api/leads-kanban/board", headers=_h(counsellor_token))
        assert r.status_code == 200, r.text
        data = r.json()
        assert "stages" in data and "total" in data and "required_fields" in data
        assert len(data["stages"]) == 10
        order = [s["status"] for s in data["stages"]]
        assert order == PIPELINE_STAGES
        # is_won / is_lost flags
        for s in data["stages"]:
            assert s["is_won"] == (s["status"] == "Converted")
            assert s["is_lost"] == (s["status"] == "Lost")
        # required_fields structure
        rf = data["required_fields"]
        assert rf.get("Converted") == ["final_fee", "enrollment_date"]
        assert rf.get("Lost") == ["lost_reason"]

    def test_counsellor_kanban_has_leads(self, counsellor_token):
        r = requests.get(f"{BASE_URL}/api/leads-kanban/board", headers=_h(counsellor_token))
        data = r.json()
        # Counsellor (Riya) should see leads
        assert data["total"] >= 1, f"expected at least 1 lead, got {data['total']}"

    def test_branch_admin_kanban_scope(self, branch_admin_token):
        r = requests.get(f"{BASE_URL}/api/leads-kanban/board", headers=_h(branch_admin_token))
        assert r.status_code == 200
        data = r.json()
        assert len(data["stages"]) == 10


# ---------- Transition validation ----------
class TestTransitionValidation:
    @pytest.fixture
    def first_new_lead_id(self, counsellor_token):
        r = requests.get(f"{BASE_URL}/api/leads-kanban/board", headers=_h(counsellor_token))
        data = r.json()
        for s in data["stages"]:
            if s["status"] == "New" and s["leads"]:
                return s["leads"][0]["id"]
        # fallback: any non-converted/non-lost lead
        for s in data["stages"]:
            if s["status"] not in ("Converted", "Lost") and s["leads"]:
                return s["leads"][0]["id"]
        pytest.skip("No suitable lead for transition tests")

    def test_converted_missing_fields_400(self, counsellor_token, first_new_lead_id):
        r = requests.post(
            f"{BASE_URL}/api/leads/{first_new_lead_id}/transition",
            json={"target_stage": "Converted", "fields": {}, "note": "x"},
            headers=_h(counsellor_token),
        )
        assert r.status_code == 400, r.text
        detail = r.json().get("detail")
        assert isinstance(detail, dict)
        assert set(detail.get("missing_fields", [])) == {"final_fee", "enrollment_date"}

    def test_lost_missing_reason_400(self, counsellor_token, first_new_lead_id):
        r = requests.post(
            f"{BASE_URL}/api/leads/{first_new_lead_id}/transition",
            json={"target_stage": "Lost", "fields": {}, "note": "x"},
            headers=_h(counsellor_token),
        )
        assert r.status_code == 400
        detail = r.json().get("detail")
        assert detail.get("missing_fields") == ["lost_reason"]

    def test_demo_scheduled_missing_fields_400(self, counsellor_token, first_new_lead_id):
        r = requests.post(
            f"{BASE_URL}/api/leads/{first_new_lead_id}/transition",
            json={"target_stage": "Demo Scheduled", "fields": {}, "note": "x"},
            headers=_h(counsellor_token),
        )
        assert r.status_code == 400
        miss = set(r.json()["detail"].get("missing_fields", []))
        # at least one required field missing
        assert miss.issubset({"demo_date", "program_id"})
        assert len(miss) >= 1

    def test_counselling_scheduled_missing_date(self, counsellor_token, first_new_lead_id):
        r = requests.post(
            f"{BASE_URL}/api/leads/{first_new_lead_id}/transition",
            json={"target_stage": "Counselling Scheduled", "fields": {}, "note": "x"},
            headers=_h(counsellor_token),
        )
        assert r.status_code == 400
        assert "counselling_date" in r.json()["detail"]["missing_fields"]

    def test_admission_likely_missing_fee(self, counsellor_token, first_new_lead_id):
        r = requests.post(
            f"{BASE_URL}/api/leads/{first_new_lead_id}/transition",
            json={"target_stage": "Admission Likely", "fields": {}, "note": "x"},
            headers=_h(counsellor_token),
        )
        assert r.status_code == 400
        assert "fee_quoted" in r.json()["detail"]["missing_fields"]

    def test_invalid_target_stage_400(self, counsellor_token, first_new_lead_id):
        r = requests.post(
            f"{BASE_URL}/api/leads/{first_new_lead_id}/transition",
            json={"target_stage": "Bogus Stage", "fields": {}},
            headers=_h(counsellor_token),
        )
        assert r.status_code == 400


# ---------- Successful transition + audit log ----------
class TestSuccessfulTransition:
    def test_transition_new_to_contact_attempted_and_audit(self, counsellor_token):
        # Find a 'New' lead
        r = requests.get(f"{BASE_URL}/api/leads-kanban/board", headers=_h(counsellor_token))
        stages = {s["status"]: s for s in r.json()["stages"]}
        new_leads = stages["New"]["leads"]
        if not new_leads:
            pytest.skip("No 'New' leads available for transition")
        lead_id = new_leads[0]["id"]

        note = "TEST_called the lead"
        r2 = requests.post(
            f"{BASE_URL}/api/leads/{lead_id}/transition",
            json={"target_stage": "Contact Attempted", "note": note},
            headers=_h(counsellor_token),
        )
        assert r2.status_code == 200, r2.text
        data = r2.json()
        assert data["ok"] is True
        assert data["old_status"] == "New"
        assert data["new_status"] == "Contact Attempted"
        assert data["lead"]["status"] == "Contact Attempted"
        assert "transitioned_at" in data

        # Timeline must include status_change with the note + actor_name
        r3 = requests.get(f"{BASE_URL}/api/leads/{lead_id}/timeline", headers=_h(counsellor_token))
        assert r3.status_code == 200, r3.text
        tl = r3.json()
        events = tl.get("events", []) if isinstance(tl, dict) else tl
        status_changes = [e for e in events if e.get("type") == "status_change" or e.get("event_type") == "status_change"]
        assert status_changes, f"no status_change events in timeline: {events[:3]}"
        # most recent should contain our note and actor name
        latest = status_changes[0]
        actor = latest.get("actor_name") or latest.get("changed_by_name") or ""
        reason = latest.get("note") or latest.get("reason") or ""
        assert note in reason or reason == note, f"note mismatch: {reason}"
        assert actor, "actor_name/changed_by_name missing on status_change event"

        # Revert for idempotency? Not required — leave moved.

    def test_transition_to_interested_no_required_fields(self, counsellor_token):
        # Find any 'Contact Attempted' or 'Connected' lead, move to Interested
        r = requests.get(f"{BASE_URL}/api/leads-kanban/board", headers=_h(counsellor_token))
        stages = {s["status"]: s for s in r.json()["stages"]}
        candidates = []
        for st in ("Contact Attempted", "Connected", "New"):
            candidates.extend(stages.get(st, {}).get("leads", []))
        if not candidates:
            pytest.skip("No candidate lead for Interested transition")
        lead_id = candidates[0]["id"]
        r2 = requests.post(
            f"{BASE_URL}/api/leads/{lead_id}/transition",
            json={"target_stage": "Interested", "note": "TEST_quick jump"},
            headers=_h(counsellor_token),
        )
        assert r2.status_code == 200, r2.text
        assert r2.json()["new_status"] == "Interested"


# ---------- Authorisation ----------
class TestTransitionAuthorisation:
    def test_other_counsellor_cannot_transition(self, counsellor_token, other_counsellor_token):
        # Riya's lead
        r = requests.get(f"{BASE_URL}/api/leads-kanban/board", headers=_h(counsellor_token))
        stages = r.json()["stages"]
        lead_id = None
        for s in stages:
            if s["leads"]:
                lead_id = s["leads"][0]["id"]
                break
        if not lead_id:
            pytest.skip("No leads to test cross-counsellor auth")
        # Arjun tries to transition Riya's lead
        r2 = requests.post(
            f"{BASE_URL}/api/leads/{lead_id}/transition",
            json={"target_stage": "Interested", "note": "should fail"},
            headers=_h(other_counsellor_token),
        )
        assert r2.status_code == 403, f"expected 403, got {r2.status_code} {r2.text[:150]}"

    def test_counsellor_cannot_transition_away_from_converted(self, counsellor_token, branch_admin_token):
        """Branch admin first moves a lead to Converted (with required fields). Then
        counsellor tries to move it away — must fail with 400."""
        r = requests.get(f"{BASE_URL}/api/leads-kanban/board", headers=_h(counsellor_token))
        stages = {s["status"]: s for s in r.json()["stages"]}
        # If there's already a Converted lead owned by Riya, use it
        converted_leads = stages.get("Converted", {}).get("leads", [])
        lead_id = converted_leads[0]["id"] if converted_leads else None

        if not lead_id:
            # Take any non-converted lead, promote to Converted as branch admin
            for st in PIPELINE_STAGES:
                if st in ("Converted", "Lost"):
                    continue
                leads = stages.get(st, {}).get("leads", [])
                if leads:
                    lead_id = leads[0]["id"]
                    break
            if not lead_id:
                pytest.skip("No lead to promote to Converted")
            rp = requests.post(
                f"{BASE_URL}/api/leads/{lead_id}/transition",
                json={
                    "target_stage": "Converted",
                    "fields": {"final_fee": 50000, "enrollment_date": "2026-06-25"},
                    "note": "TEST_converting for auth test",
                },
                headers=_h(branch_admin_token),
            )
            assert rp.status_code == 200, f"branch admin convert failed: {rp.text[:200]}"

        # Counsellor tries to move away
        r2 = requests.post(
            f"{BASE_URL}/api/leads/{lead_id}/transition",
            json={"target_stage": "Interested", "note": "should fail"},
            headers=_h(counsellor_token),
        )
        assert r2.status_code == 400, f"expected 400, got {r2.status_code}: {r2.text[:200]}"
        msg = (r2.json().get("detail") or "")
        if isinstance(msg, dict):
            msg = msg.get("message", "") + " " + msg.get("error", "")
        assert "converted" in msg.lower(), f"expected message about converted leads, got: {msg}"


# ---------- Required-fields satisfied flow ----------
class TestConvertedTransitionSuccess:
    def test_convert_with_required_fields_succeeds(self, branch_admin_token):
        # branch admin promotes any non-converted lead to Converted
        r = requests.get(f"{BASE_URL}/api/leads-kanban/board", headers=_h(branch_admin_token))
        stages = {s["status"]: s for s in r.json()["stages"]}
        lead_id = None
        for st in PIPELINE_STAGES:
            if st in ("Converted", "Lost"):
                continue
            leads = stages.get(st, {}).get("leads", [])
            if leads:
                lead_id = leads[0]["id"]
                break
        if not lead_id:
            pytest.skip("No promotable lead")
        r2 = requests.post(
            f"{BASE_URL}/api/leads/{lead_id}/transition",
            json={
                "target_stage": "Converted",
                "fields": {"final_fee": 75000, "enrollment_date": "2026-07-01"},
                "note": "TEST_converted via admin",
            },
            headers=_h(branch_admin_token),
        )
        assert r2.status_code == 200, r2.text
        data = r2.json()
        assert data["new_status"] == "Converted"
        assert data["lead"]["final_fee"] in (75000, 75000.0, "75000")
        assert str(data["lead"].get("enrollment_date", "")).startswith("2026-07-01")
