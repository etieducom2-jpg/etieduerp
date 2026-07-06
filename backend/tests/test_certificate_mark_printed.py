"""
Iteration 4: certificate module fixes.
  1. Manual create + PUT edit persists new fields (dates, hours, name, branch, reg#).
  2. POST /download returns those edited values.
  3. POST /download does NOT trigger WhatsApp.
  4. POST /mark-printed on Ready cert triggers WhatsApp.
  5. POST /mark-printed on Approved cert (skip Ready) also transitions to Printed and fires WhatsApp.
  6. whatsapp_settings.events.certificate_ready.variables == ['course','name','certificate_id'].
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
ADMIN_EMAIL = "admin@etieducom.com"
ADMIN_PASSWORD = "admin@123"

LOG_PATH = "/var/log/supervisor/backend.err.log"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _log_tail_since(marker_offset: int) -> str:
    try:
        with open(LOG_PATH, "rb") as f:
            f.seek(0, 2)
            end = f.tell()
            f.seek(max(0, marker_offset))
            return f.read(end - marker_offset).decode(errors="ignore")
    except FileNotFoundError:
        return ""


def _log_size() -> int:
    try:
        return os.path.getsize(LOG_PATH)
    except FileNotFoundError:
        return 0


def _create_manual_cert(headers, name, phone="9812345678"):
    payload = {
        "student_name": name,
        "program_name": "Advanced Excel",
        "program_duration": "3 Months",
        "program_start_date": "2025-01-01",
        "program_end_date": "2025-03-31",
        "training_mode": "Offline",
        "training_hours": 90,
        "email": "test@example.com",
        "phone": phone,
        "initial_status": "Approved",
    }
    r = requests.post(f"{BASE_URL}/api/certificate-requests/manual",
                      json=payload, headers=headers, timeout=30)
    assert r.status_code in (200, 201), r.text
    return r.json()


class TestCertificatePrintFlow:

    def test_whatsapp_settings_variable_order(self, headers):
        r = requests.get(f"{BASE_URL}/api/admin/whatsapp-settings", headers=headers, timeout=15)
        assert r.status_code == 200, r.text
        events = r.json().get("events", {})
        cr = events.get("certificate_ready", {})
        assert cr.get("variables") == ["course", "name", "certificate_id"], \
            f"Wrong variable order: {cr.get('variables')}"

    def test_full_flow_edit_download_markprinted(self, headers):
        # 1. Create manual approved cert
        cert = _create_manual_cert(headers, "TEST_Iter4 EditFlow")
        cid = cert["id"]

        # 2. PUT edits
        edit_payload = {
            "student_name": "TEST_Iter4 EditFlow Edited",
            "program_name": "Advanced Excel",
            "program_duration": "4 Months",
            "program_start_date": "2025-02-01",
            "program_end_date": "2025-05-31",
            "training_hours": 100,
            "branch_name": "ETI Patiala (Demo)",
            "registration_number": "ETI-STU-TEST-4001",
        }
        r = requests.put(f"{BASE_URL}/api/certificate-requests/{cid}",
                         json=edit_payload, headers=headers, timeout=30)
        assert r.status_code == 200, r.text

        # 3. GET one and confirm persisted
        r = requests.get(f"{BASE_URL}/api/certificate-requests/{cid}",
                         headers=headers, timeout=15)
        assert r.status_code == 200, r.text
        got = r.json()
        for k, v in edit_payload.items():
            assert got.get(k) == v, f"Field {k} not persisted; got {got.get(k)}"

        # 4. Download — snapshot log offset first
        pre = _log_size()
        r = requests.post(f"{BASE_URL}/api/certificate-requests/{cid}/download",
                          headers=headers, timeout=30)
        assert r.status_code == 200, r.text
        dl = r.json()
        assert dl["program_start_date"] == "2025-02-01"
        assert dl["program_end_date"] == "2025-05-31"
        assert dl["training_hours"] == 100
        assert dl["program_name"] == "Advanced Excel"
        assert dl["branch_name"] == "ETI Patiala (Demo)"
        assert dl["registration_number"] == "ETI-STU-TEST-4001"
        assert dl["student_name"] == "TEST_Iter4 EditFlow Edited"

        # Give any (unexpected) async whatsapp call a moment
        time.sleep(2)
        log_after_download = _log_tail_since(pre)

        # 4a. NO WhatsApp send during download
        assert "certificate_ready" not in log_after_download, \
            f"Download unexpectedly triggered certificate_ready: ...{log_after_download[-500:]}"

        # 5. Status should now be Ready (first download transition)
        r = requests.get(f"{BASE_URL}/api/certificate-requests/{cid}",
                         headers=headers, timeout=15)
        assert r.json()["status"] == "Ready"

        # 6. Mark printed on Ready cert => WhatsApp fires
        pre2 = _log_size()
        r = requests.post(f"{BASE_URL}/api/certificate-requests/{cid}/mark-printed",
                          headers=headers, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "Printed"
        time.sleep(4)
        log_after_mp = _log_tail_since(pre2)
        assert "certificate_ready" in log_after_mp, \
            f"Mark-Printed did NOT log certificate_ready send: ...{log_after_mp[-800:]}"
        assert "[WHATSAPP TEST MODE]" in log_after_mp, \
            "TEST MODE redirect log line missing"
        # Best-effort: MSG91 200
        assert ("MSG91 WhatsApp API response: 200" in log_after_mp
                or "request_id" in log_after_mp), \
            f"No MSG91 success indicator in log tail: ...{log_after_mp[-1200:]}"

        # 7. Cleanup — hard delete not required but attempt
        requests.post(f"{BASE_URL}/api/certificate-requests/{cid}/delete",
                      headers=headers, timeout=15)

    def test_mark_printed_directly_on_approved(self, headers):
        cert = _create_manual_cert(headers, "TEST_Iter4 DirectPrint")
        cid = cert["id"]
        assert cert["status"] == "Approved"

        pre = _log_size()
        r = requests.post(f"{BASE_URL}/api/certificate-requests/{cid}/mark-printed",
                          headers=headers, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "Printed"

        # DB check
        r = requests.get(f"{BASE_URL}/api/certificate-requests/{cid}", headers=headers, timeout=15)
        assert r.json()["status"] == "Printed"

        time.sleep(4)
        tail = _log_tail_since(pre)
        assert "certificate_ready" in tail, \
            f"WhatsApp not fired on Approved->Printed transition: ...{tail[-800:]}"
        assert "[WHATSAPP TEST MODE]" in tail

        requests.post(f"{BASE_URL}/api/certificate-requests/{cid}/delete",
                      headers=headers, timeout=15)
