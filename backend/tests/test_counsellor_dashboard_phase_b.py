"""Tests for Counsellor Dashboard Phase B + Branch Admin financial-stats regression.

Endpoints covered:
- GET /api/analytics/counsellor-dashboard-enhanced (extended fields)
- GET /api/analytics/counsellor-leaderboard (period/metric variants)
- GET /api/leads-search/universal (universal search)
- GET /api/branch-admin/financial-stats (regression for monthly_revenue/monthly_admissions/active_unique_students/branch_streak)
"""

import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://enterprise-hub-340.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# ---- helpers ----------------------------------------------------------------

def _login(email: str, password: str) -> str:
    r = requests.post(
        f"{API}/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    tok = r.json().get("access_token")
    assert tok, f"no access_token in response: {r.text}"
    return tok


@pytest.fixture(scope="module")
def counsellor_token():
    return _login("riya.counsellor@test.com", "test@123")


@pytest.fixture(scope="module")
def branch_admin_token():
    return _login("branchadmin@etieducom.com", "branch@123")


@pytest.fixture(scope="module")
def counsellor_headers(counsellor_token):
    return {"Authorization": f"Bearer {counsellor_token}"}


@pytest.fixture(scope="module")
def branch_admin_headers(branch_admin_token):
    return {"Authorization": f"Bearer {branch_admin_token}"}


# ---- 1. counsellor-dashboard-enhanced --------------------------------------

class TestCounsellorDashboardEnhanced:
    def test_endpoint_returns_200(self, counsellor_headers):
        r = requests.get(f"{API}/analytics/counsellor-dashboard-enhanced", headers=counsellor_headers, timeout=30)
        assert r.status_code == 200, r.text

    def test_today_priority_shape(self, counsellor_headers):
        d = requests.get(f"{API}/analytics/counsellor-dashboard-enhanced", headers=counsellor_headers, timeout=30).json()
        tp = d.get("today_priority")
        assert isinstance(tp, dict), f"today_priority missing/not dict: {tp}"
        for k in [
            "hot_leads_pending", "calls_pending", "followups_due_today",
            "followups_overdue", "admissions_needed", "admissions_this_month",
            "monthly_admission_target",
        ]:
            assert k in tp, f"missing key {k} in today_priority -> {tp}"
            assert isinstance(tp[k], (int, float)), f"{k} not numeric: {tp[k]}"
        # default monthly target should be 10
        assert tp["monthly_admission_target"] == 10

    def test_lead_aging_shape(self, counsellor_headers):
        d = requests.get(f"{API}/analytics/counsellor-dashboard-enhanced", headers=counsellor_headers, timeout=30).json()
        la = d.get("lead_aging")
        assert isinstance(la, dict)
        for k in ["bucket_0_24h", "bucket_1_3d", "bucket_3_7d", "bucket_7_plus"]:
            assert k in la and isinstance(la[k], int), f"{k} bad in {la}"
        assert isinstance(la.get("sample_7_plus"), list)
        assert isinstance(la.get("sample_3_7d"), list)

    def test_funnel_shape(self, counsellor_headers):
        d = requests.get(f"{API}/analytics/counsellor-dashboard-enhanced", headers=counsellor_headers, timeout=30).json()
        f = d.get("funnel")
        assert isinstance(f, dict)
        assert isinstance(f.get("stages"), list) and len(f["stages"]) > 0
        for s in f["stages"]:
            for k in ("status", "count", "drop_off_pct", "drop_off_count"):
                assert k in s, f"stage missing {k}: {s}"
        assert "overall_conversion_pct" in f
        assert isinstance(f["overall_conversion_pct"], (int, float))

    def test_scorecard_shape(self, counsellor_headers):
        d = requests.get(f"{API}/analytics/counsellor-dashboard-enhanced", headers=counsellor_headers, timeout=30).json()
        sc = d.get("scorecard")
        assert isinstance(sc, dict)
        # Per-tile primary value key differs (intentional, matches frontend):
        # calls.made, followups.completed, demos.scheduled, admissions.today
        expected_keys = {
            "calls": "made",
            "followups": "completed",
            "demos": "scheduled",
            "admissions": "today",
        }
        for k, primary in expected_keys.items():
            assert k in sc and isinstance(sc[k], dict), f"scorecard.{k} missing/bad: {sc}"
            for sub in (primary, "target", "pct"):
                assert sub in sc[k], f"scorecard.{k} missing {sub}: {sc[k]}"
        assert sc["calls"]["target"] == 30, f"default daily-call target should be 30, got {sc['calls']['target']}"
        assert "new_leads_today" in sc


# ---- 2. counsellor-leaderboard ---------------------------------------------

class TestCounsellorLeaderboard:
    def _fetch(self, headers, period, metric):
        r = requests.get(f"{API}/analytics/counsellor-leaderboard", params={"period": period, "metric": metric}, headers=headers, timeout=30)
        assert r.status_code == 200, r.text
        return r.json()

    def test_default_month_admissions(self, counsellor_headers):
        d = self._fetch(counsellor_headers, "month", "admissions")
        assert d["period"] == "month" and d["metric"] == "admissions"
        lb = d["leaderboard"]
        assert isinstance(lb, list) and len(lb) >= 1
        # sorted desc by admissions
        for a, b in zip(lb, lb[1:]):
            assert a["admissions"] >= b["admissions"], "leaderboard not sorted by admissions"
        # ranks assigned 1..n
        assert [r["rank"] for r in lb] == list(range(1, len(lb) + 1))
        # exactly one row should be current user (Riya)
        cur = [r for r in lb if r["is_current_user"]]
        assert len(cur) == 1, f"expected exactly one is_current_user row, got {len(cur)}"
        assert cur[0]["name"] and "ri" in cur[0]["name"].lower()
        for r in lb:
            for k in ("counsellor_id", "name", "admissions", "revenue", "conversion_rate", "rank", "is_current_user"):
                assert k in r

    def test_week_period(self, counsellor_headers):
        d = self._fetch(counsellor_headers, "week", "admissions")
        assert d["period"] == "week"

    def test_metric_revenue_sort(self, counsellor_headers):
        d = self._fetch(counsellor_headers, "month", "revenue")
        assert d["metric"] == "revenue"
        lb = d["leaderboard"]
        for a, b in zip(lb, lb[1:]):
            assert a["revenue"] >= b["revenue"], "leaderboard not sorted by revenue desc"

    def test_metric_conversion_sort(self, counsellor_headers):
        d = self._fetch(counsellor_headers, "month", "conversion")
        assert d["metric"] == "conversion"
        lb = d["leaderboard"]
        for a, b in zip(lb, lb[1:]):
            assert a["conversion_rate"] >= b["conversion_rate"], "leaderboard not sorted by conversion desc"

    def test_invalid_metric_falls_back(self, counsellor_headers):
        d = self._fetch(counsellor_headers, "month", "garbage")
        assert d["metric"] == "admissions"


# ---- 3. universal search ---------------------------------------------------

class TestUniversalSearch:
    def test_min_2_chars(self, counsellor_headers):
        r = requests.get(f"{API}/leads-search/universal", params={"q": "a"}, headers=counsellor_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["results"] == [], "must return empty for q<2 chars"

    def test_returns_results_for_ri(self, counsellor_headers):
        r = requests.get(f"{API}/leads-search/universal", params={"q": "ri"}, headers=counsellor_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "results" in d and "query" in d and "count" in d
        assert d["query"] == "ri"
        # response shape sanity (count may legitimately be 0 in some fork seedings; just check shape)
        assert isinstance(d["results"], list)
        assert d["count"] == len(d["results"])

    def test_route_does_not_collide_with_lead_id(self, counsellor_headers):
        """Calling /api/leads-search/universal?q=riya must NOT 404 with 'Lead not found'."""
        r = requests.get(f"{API}/leads-search/universal", params={"q": "riya"}, headers=counsellor_headers, timeout=30)
        assert r.status_code == 200, f"route collision suspected: {r.status_code} {r.text}"
        body = r.json()
        # If FastAPI had routed to /leads/{lead_id}, we'd get {"detail":"Lead not found"}
        assert "detail" not in body or "Lead not found" not in str(body.get("detail", "")), \
            f"route collided with /leads/{{lead_id}}: {body}"
        assert "results" in body

    def test_counsellor_scoping(self, counsellor_headers):
        # Run a broad search and verify shape; we cannot easily inspect ownership here without DB,
        # but every returned lead should have an id.
        r = requests.get(f"{API}/leads-search/universal", params={"q": "ri", "limit": 50}, headers=counsellor_headers, timeout=30)
        d = r.json()
        for lead in d["results"]:
            assert "id" in lead and lead["id"]


# ---- 4. branch-admin financial-stats regression ----------------------------

class TestBranchAdminFinancialStatsRegression:
    def test_returns_required_fields(self, branch_admin_headers):
        r = requests.get(f"{API}/branch-admin/financial-stats", headers=branch_admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("monthly_revenue", "monthly_admissions", "active_unique_students", "branch_streak"):
            assert k in d, f"financial-stats missing {k}: keys={list(d.keys())}"
        assert isinstance(d["monthly_revenue"], (int, float))
        assert isinstance(d["monthly_admissions"], int)
        assert isinstance(d["active_unique_students"], int)
        assert isinstance(d["branch_streak"], dict)
