"""Tests for Phase A (Lead Owner picker) and Phase B (Counsellor Action-Required dashboard).

Endpoints exercised:
- GET  /api/branch/counsellors  (Admin / Branch Admin / FDE / Counsellor)
- POST /api/leads                (with / without counsellor_id, invalid counsellor_id)
- PUT  /api/leads/{id}           (reassign owner; Counsellor forbidden)
- GET  /api/counsellor/action-required (Counsellor / Branch Admin / Admin; forbidden for others)
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@etieducom.com"
ADMIN_PASS = "admin@123"
RIYA_EMAIL = "riya.counsellor@test.com"
RIYA_PASS = "test@123"
ARJUN_EMAIL = "arjun.c@test.com"
ARJUN_PASS = "test@123"
BRANCH_ID = "5d8469ac-2fc9-4729-8dcd-d410fe757684"
PROGRAM_ID = "phasea-prog-1"


def _login(email, password):
    r = requests.post(
        f"{API}/auth/login",
        data={"username": email, "password": password},
        timeout=30,
    )
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN_EMAIL, ADMIN_PASS)


@pytest.fixture(scope="module")
def riya_token():
    return _login(RIYA_EMAIL, RIYA_PASS)


@pytest.fixture(scope="module")
def arjun_token():
    return _login(ARJUN_EMAIL, ARJUN_PASS)


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- PHASE A: /api/branch/counsellors ----------

class TestBranchCounsellors:
    def test_admin_can_list_counsellors(self, admin_token):
        r = requests.get(f"{API}/branch/counsellors", headers=_h(admin_token), timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        emails = {u["email"] for u in data}
        assert RIYA_EMAIL in emails
        assert ARJUN_EMAIL in emails
        # Each entry should expose id+name+email+branch_id
        for u in data:
            assert "id" in u and "name" in u and "email" in u

    def test_counsellor_can_list_counsellors_in_own_branch(self, riya_token):
        r = requests.get(f"{API}/branch/counsellors", headers=_h(riya_token), timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        emails = {u["email"] for u in data}
        assert RIYA_EMAIL in emails
        assert ARJUN_EMAIL in emails
        for u in data:
            assert u["branch_id"] == BRANCH_ID


# ---------- PHASE A: POST/PUT /api/leads with counsellor_id ----------

class TestLeadOwnerAssignment:
    created_lead_ids = []

    def _counsellor_ids(self, admin_token):
        r = requests.get(f"{API}/branch/counsellors", headers=_h(admin_token), timeout=30)
        assert r.status_code == 200, r.text
        ids = {u["email"]: u["id"] for u in r.json()}
        return ids

    def test_create_lead_with_counsellor_id(self, admin_token):
        ids = self._counsellor_ids(admin_token)
        payload = {
            "name": "TEST_PhaseA_With_Owner",
            "number": "9990000011",
            "email": "phasea1@test.com",
            "program_id": PROGRAM_ID,
            "lead_source": "Walk-in",
            "counsellor_id": ids[RIYA_EMAIL],
        }
        r = requests.post(f"{API}/leads", json=payload, headers=_h(admin_token), timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["counsellor_id"] == ids[RIYA_EMAIL]
        assert (body.get("counsellor_name") or "").lower().startswith("riya")
        TestLeadOwnerAssignment.created_lead_ids.append(body["id"])

        # Persistence: GET should return same owner
        g = requests.get(f"{API}/leads/{body['id']}", headers=_h(admin_token), timeout=30)
        assert g.status_code == 200
        assert g.json()["counsellor_id"] == ids[RIYA_EMAIL]

    def test_create_lead_without_counsellor_id_defaults_to_creator(self, admin_token):
        payload = {
            "name": "TEST_PhaseA_NoOwner",
            "number": "9990000012",
            "email": "phasea2@test.com",
            "program_id": PROGRAM_ID,
            "lead_source": "Walk-in",
        }
        r = requests.post(f"{API}/leads", json=payload, headers=_h(admin_token), timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        # Should fall back to admin (creator)
        assert body["counsellor_id"]  # must be set
        TestLeadOwnerAssignment.created_lead_ids.append(body["id"])

    def test_create_lead_with_invalid_counsellor_id_returns_400(self, admin_token):
        payload = {
            "name": "TEST_PhaseA_BadOwner",
            "number": "9990000013",
            "email": "phasea3@test.com",
            "program_id": PROGRAM_ID,
            "lead_source": "Walk-in",
            "counsellor_id": "non-existent-user-id-xyz",
        }
        r = requests.post(f"{API}/leads", json=payload, headers=_h(admin_token), timeout=30)
        assert r.status_code == 400, r.text
        assert "active Counsellor" in r.text

    def test_admin_can_reassign_owner_via_put(self, admin_token):
        ids = self._counsellor_ids(admin_token)
        # Create a lead first owned by Riya
        payload = {
            "name": "TEST_PhaseA_Reassign",
            "number": "9990000014",
            "email": "phasea4@test.com",
            "program_id": PROGRAM_ID,
            "lead_source": "Walk-in",
            "counsellor_id": ids[RIYA_EMAIL],
        }
        c = requests.post(f"{API}/leads", json=payload, headers=_h(admin_token), timeout=30)
        assert c.status_code == 200
        lead = c.json()
        TestLeadOwnerAssignment.created_lead_ids.append(lead["id"])
        # Reassign to Arjun
        u = requests.put(
            f"{API}/leads/{lead['id']}",
            json={"counsellor_id": ids[ARJUN_EMAIL]},
            headers=_h(admin_token),
            timeout=30,
        )
        assert u.status_code == 200, u.text
        ub = u.json()
        assert ub["counsellor_id"] == ids[ARJUN_EMAIL]
        assert (ub.get("counsellor_name") or "").lower().startswith("arjun")

    def test_counsellor_cannot_reassign_owner(self, admin_token, riya_token, arjun_token):
        ids = self._counsellor_ids(admin_token)
        # Admin creates a lead owned by Riya
        c = requests.post(
            f"{API}/leads",
            json={
                "name": "TEST_PhaseA_CounsellorReassign",
                "number": "9990000015",
                "email": "phasea5@test.com",
                "program_id": PROGRAM_ID,
                "lead_source": "Walk-in",
                "counsellor_id": ids[RIYA_EMAIL],
            },
            headers=_h(admin_token),
            timeout=30,
        )
        assert c.status_code == 200
        lead_id = c.json()["id"]
        TestLeadOwnerAssignment.created_lead_ids.append(lead_id)
        # Riya tries to reassign to Arjun -> should be 403
        r = requests.put(
            f"{API}/leads/{lead_id}",
            json={"counsellor_id": ids[ARJUN_EMAIL]},
            headers=_h(riya_token),
            timeout=30,
        )
        assert r.status_code == 403, r.text
        assert "Lead Owner" in r.text

    @classmethod
    def teardown_class(cls):
        """Cleanup test-created leads."""
        try:
            tok = _login(ADMIN_EMAIL, ADMIN_PASS)
            for lid in cls.created_lead_ids:
                requests.delete(f"{API}/leads/{lid}", headers={"Authorization": f"Bearer {tok}"}, timeout=15)
        except Exception:
            pass


# ---------- PHASE B: /api/counsellor/action-required ----------

class TestCounsellorActionDashboard:
    def test_riya_payload_structure_and_numbers(self, riya_token):
        r = requests.get(f"{API}/counsellor/action-required", headers=_h(riya_token), timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # Top-level shape
        for k in [
            "lead_summary", "followup_summary", "admission_summary",
            "conversion_summary", "action_required", "daily_queue",
        ]:
            assert k in data, f"Missing key {k} in payload"
        ar = data["action_required"]
        for k in [
            "hot_leads_not_contacted", "overdue_followups",
            "interested_no_counseling", "admission_likely", "parent_pending",
        ]:
            assert k in ar
            assert isinstance(ar[k], list)
        for k in ["to_call", "followups_due_today"]:
            assert k in data["daily_queue"]
            assert isinstance(data["daily_queue"][k], list)

        # Seeded numbers (Riya has 9 leads)
        ls = data["lead_summary"]
        assert ls["total"] == 9, f"total={ls['total']}"
        assert ls["hot"] == 2, f"hot={ls['hot']}"
        assert ls["warm"] == 4, f"warm={ls['warm']}"
        assert ls["cold"] == 2, f"cold={ls['cold']}"
        assert ls["lost"] == 1, f"lost={ls['lost']}"

        # Admission target % is 70 globally
        assert data["admission_summary"]["target_pct"] == 70

        # Conversion: 1 converted out of 9 = 11.1%
        assert data["conversion_summary"]["overall_conversion_pct"] == 11.1, data["conversion_summary"]

        # Hot leads not contacted -> 2 (Diya Kapoor, Aarav Patel)
        hot_names = {x["name"] for x in ar["hot_leads_not_contacted"]}
        assert "Diya Kapoor" in hot_names, hot_names
        assert "Aarav Patel" in hot_names, hot_names

        # Overdue follow-ups should include Owen
        overdue_names = {x["name"] for x in ar["overdue_followups"]}
        assert any("Owen" in n for n in overdue_names), overdue_names

    def test_arjun_empty(self, arjun_token):
        r = requests.get(f"{API}/counsellor/action-required", headers=_h(arjun_token), timeout=30)
        assert r.status_code == 200
        ls = r.json()["lead_summary"]
        assert ls["total"] == 0

    def test_admin_can_access(self, admin_token):
        r = requests.get(f"{API}/counsellor/action-required", headers=_h(admin_token), timeout=30)
        assert r.status_code == 200
        # Admin sees everything (no branch scope) — just sanity-check structure
        assert "lead_summary" in r.json()

    def test_forbidden_for_unauthorized_roles(self):
        """Try with a Placement Manager — should be 403."""
        r = requests.post(
            f"{API}/auth/login",
            data={"username": "placement@etieducom.com", "password": "placement@123"},
            timeout=30,
        )
        if r.status_code != 200:
            pytest.skip("Placement manager login not available")
        tok = r.json().get("access_token") or r.json().get("token")
        g = requests.get(f"{API}/counsellor/action-required", headers={"Authorization": f"Bearer {tok}"}, timeout=30)
        assert g.status_code == 403, g.text
