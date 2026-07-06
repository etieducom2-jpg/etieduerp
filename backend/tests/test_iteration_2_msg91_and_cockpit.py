"""Iteration 2 - MSG91 WhatsApp LIVE + Counsellor Cockpit backend tests."""
import os
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://enterprise-app-69.preview.emergentagent.com").rstrip("/")


def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", data={"username": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_token():
    return _login("admin@etieducom.com", "admin@123")


@pytest.fixture(scope="module")
def counsellor_token():
    return _login("priya@eti.com", "priya@123")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def counsellor_headers(counsellor_token):
    return {"Authorization": f"Bearer {counsellor_token}"}


# -- MSG91 WhatsApp LIVE tests --
class TestMsg91WhatsAppLive:
    def test_enquiry_saved_live(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/admin/whatsapp-test?event_type=enquiry_saved", headers=admin_headers, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        debug = data.get("debug", {})
        assert debug.get("msg91_key_configured") is True, f"debug={debug}"
        assert debug.get("recipient_used") == "918800747989", f"debug={debug}"
        msg91 = data.get("msg91_result", {})
        assert msg91.get("success") is True, f"msg91_result={msg91}"
        req_id = (msg91.get("response") or {}).get("request_id") or ""
        assert req_id, f"empty request_id: {msg91}"

    def test_demo_booked_live(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/admin/whatsapp-test?event_type=demo_booked", headers=admin_headers, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        msg91 = data.get("msg91_result", {})
        assert msg91.get("success") is True, f"msg91_result={msg91}"
        assert data.get("debug", {}).get("template_name") == "eti_demo_confirmation", f"template_name={data.get('debug', {}).get('template_name')} full={data}"

    def test_whatsapp_test_requires_admin(self, counsellor_headers):
        r = requests.post(f"{BASE_URL}/api/admin/whatsapp-test?event_type=enquiry_saved", headers=counsellor_headers, timeout=30)
        assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text}"


# -- Counsellor dashboard enhanced tests --
class TestCounsellorDashboardEnhanced:
    def test_enhanced_keys_present(self, counsellor_headers):
        r = requests.get(f"{BASE_URL}/api/analytics/counsellor-dashboard-enhanced", headers=counsellor_headers, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        expected = {"scheduled_demos", "upcoming_followups", "today_followups", "missed_followups",
                    "hot_leads", "lead_stats", "monthly_revenue", "streak", "today_priority", "scorecard", "funnel"}
        missing = expected - set(data.keys())
        assert not missing, f"missing keys: {missing}. got={list(data.keys())}"

    def test_scheduled_demos_shape(self, counsellor_headers):
        r = requests.get(f"{BASE_URL}/api/analytics/counsellor-dashboard-enhanced", headers=counsellor_headers, timeout=60)
        data = r.json()
        demos = data.get("scheduled_demos", [])
        assert isinstance(demos, list)
        assert len(demos) > 0, "scheduled_demos empty; expected seed data"
        required = {"lead_id", "name", "number", "program", "demo_date", "demo_time", "status", "trainer", "days_away"}
        for d in demos:
            missing = required - set(d.keys())
            assert not missing, f"demo missing keys {missing}: {d}"
            assert 0 <= d["days_away"] <= 7, f"demo out of window: {d}"
        # sorted ascending by demo_date
        dates = [d["demo_date"] for d in demos]
        assert dates == sorted(dates), f"not sorted asc: {dates}"

    def test_upcoming_followups_shape(self, counsellor_headers):
        r = requests.get(f"{BASE_URL}/api/analytics/counsellor-dashboard-enhanced", headers=counsellor_headers, timeout=60)
        data = r.json()
        fus = data.get("upcoming_followups", [])
        assert isinstance(fus, list)
        assert len(fus) > 0, "upcoming_followups empty; expected seed data"
        required = {"id", "lead_id", "lead_name", "lead_number", "lead_status", "program", "note", "followup_date", "days_away"}
        for f in fus:
            missing = required - set(f.keys())
            assert not missing, f"followup missing keys {missing}: {f}"
            assert 1 <= f["days_away"] <= 7, f"followup out of (today, today+7d] window: {f}"
        dates = [f["followup_date"] for f in fus]
        assert dates == sorted(dates), f"followups not sorted asc: {dates}"

    def test_enhanced_forbidden_for_placement_manager(self, admin_headers):
        # placement manager should be forbidden
        tok = _login("placement@etieducom.com", "placement@123")
        h = {"Authorization": f"Bearer {tok}"}
        r = requests.get(f"{BASE_URL}/api/analytics/counsellor-dashboard-enhanced", headers=h, timeout=30)
        assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text}"
