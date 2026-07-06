"""Backend tests for the new Meta Sheets preview + column-mapping flow.

Covers:
- POST /api/branches/{id}/meta-sheets/preview  (public sheet -> ok=true)
- POST /api/branches/{id}/meta-sheets/preview  (private sheet -> 400 friendly)
- POST /api/branches/{id}/meta-sheets/preview  (invalid URL -> 400 friendly)
- POST /api/branches/{id}/meta-sheets          (saves column_mapping)
- GET  /api/branches/{id}/meta-sheets          (returns saved mapping)
- PUT  /api/branches/{id}/meta-sheets/{sid}    (updates mapping / label)
- PUT  /api/branches/{id}/meta-sheets/{sid}    (invalid mapping values dropped)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://enterprise-hub-340.preview.emergentagent.com").rstrip("/")
BRANCH_ID = "5d8469ac-2fc9-4729-8dcd-d410fe757684"
USERNAME = "branchadmin@etieducom.com"
PASSWORD = "branch@123"

PUBLIC_SHEET_URL = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0"
PRIVATE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1abc_private_xyz/edit"
INVALID_URL = "https://example.com/not-a-sheet"


@pytest.fixture(scope="module")
def token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": USERNAME, "password": PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token")
    assert tok, f"no access_token: {r.json()}"
    return tok


@pytest.fixture(scope="module")
def client(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module")
def created_sheet_id(client):
    """Cleanup-tracking: yield the sheet_id created during tests."""
    holder = {"id": None}
    yield holder
    # Teardown: delete the created sheet
    sid = holder.get("id")
    if sid:
        client.delete(
            f"{BASE_URL}/api/branches/{BRANCH_ID}/meta-sheets/{sid}",
            timeout=20,
        )


# ---------- preview endpoint ----------

class TestPreview:
    def test_preview_public_sheet(self, client):
        r = client.post(
            f"{BASE_URL}/api/branches/{BRANCH_ID}/meta-sheets/preview",
            json={"url": PUBLIC_SHEET_URL},
            timeout=30,
        )
        assert r.status_code == 200, f"unexpected: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert isinstance(data.get("headers"), list) and len(data["headers"]) > 0
        assert isinstance(data.get("sample_rows"), list)
        assert isinstance(data.get("row_count"), int)
        assert isinstance(data.get("auto_mapping"), dict)

    def test_preview_private_sheet_returns_friendly_400(self, client):
        r = client.post(
            f"{BASE_URL}/api/branches/{BRANCH_ID}/meta-sheets/preview",
            json={"url": PRIVATE_SHEET_URL},
            timeout=30,
        )
        assert r.status_code == 400
        detail = r.json().get("detail", "")
        # User-friendly text — should NOT be raw 'http_400'
        assert "http_400" not in detail.lower()
        assert "Anyone with the link" in detail or "Viewer" in detail

    def test_preview_invalid_url_returns_friendly_400(self, client):
        r = client.post(
            f"{BASE_URL}/api/branches/{BRANCH_ID}/meta-sheets/preview",
            json={"url": INVALID_URL},
            timeout=30,
        )
        assert r.status_code == 400
        detail = r.json().get("detail", "")
        assert detail.startswith("Not a valid Google Sheets URL")


# ---------- add + persist column_mapping ----------

class TestAddAndPersistMapping:
    def test_add_sheet_with_column_mapping(self, client, created_sheet_id):
        payload = {
            "url": PUBLIC_SHEET_URL,
            "label": "TEST_mapping_sheet",
            "column_mapping": {"0": "name", "1": "phone"},
        }
        r = client.post(
            f"{BASE_URL}/api/branches/{BRANCH_ID}/meta-sheets",
            json=payload,
            timeout=30,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        body = r.json()
        assert body.get("ok") is True
        sheet = body["sheet"]
        assert sheet["label"] == "TEST_mapping_sheet"
        assert sheet["column_mapping"] == {"0": "name", "1": "phone"}
        assert sheet.get("id")
        created_sheet_id["id"] = sheet["id"]

    def test_list_returns_persisted_mapping(self, client, created_sheet_id):
        sid = created_sheet_id["id"]
        assert sid, "previous create test must have set sheet id"
        r = client.get(
            f"{BASE_URL}/api/branches/{BRANCH_ID}/meta-sheets",
            timeout=20,
        )
        assert r.status_code == 200
        body = r.json()
        # The endpoint may return a list directly OR an object with 'sheets'
        sheets = body if isinstance(body, list) else body.get("sheets", [])
        match = next((s for s in sheets if s.get("id") == sid), None)
        assert match is not None, f"created sheet not in list: {body}"
        assert match.get("column_mapping") == {"0": "name", "1": "phone"}


# ---------- PUT update mapping ----------

class TestUpdateMapping:
    def test_update_column_mapping(self, client, created_sheet_id):
        sid = created_sheet_id["id"]
        assert sid
        r = client.put(
            f"{BASE_URL}/api/branches/{BRANCH_ID}/meta-sheets/{sid}",
            json={"column_mapping": {"2": "email"}},
            timeout=20,
        )
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        assert r.json().get("ok") is True
        # Verify via list
        lst = client.get(f"{BASE_URL}/api/branches/{BRANCH_ID}/meta-sheets", timeout=20).json()
        sheets = lst if isinstance(lst, list) else lst.get("sheets", [])
        match = next((s for s in sheets if s.get("id") == sid), None)
        assert match["column_mapping"] == {"2": "email"}

    def test_update_label_only(self, client, created_sheet_id):
        sid = created_sheet_id["id"]
        r = client.put(
            f"{BASE_URL}/api/branches/{BRANCH_ID}/meta-sheets/{sid}",
            json={"label": "TEST_relabeled"},
            timeout=20,
        )
        assert r.status_code == 200
        lst = client.get(f"{BASE_URL}/api/branches/{BRANCH_ID}/meta-sheets", timeout=20).json()
        sheets = lst if isinstance(lst, list) else lst.get("sheets", [])
        match = next((s for s in sheets if s.get("id") == sid), None)
        assert match["label"] == "TEST_relabeled"
        # mapping preserved from previous test
        assert match["column_mapping"] == {"2": "email"}

    def test_invalid_mapping_values_dropped(self, client, created_sheet_id):
        sid = created_sheet_id["id"]
        r = client.put(
            f"{BASE_URL}/api/branches/{BRANCH_ID}/meta-sheets/{sid}",
            json={"column_mapping": {"0": "invalid_field", "1": "phone", "2": "junk"}},
            timeout=20,
        )
        assert r.status_code == 200
        lst = client.get(f"{BASE_URL}/api/branches/{BRANCH_ID}/meta-sheets", timeout=20).json()
        sheets = lst if isinstance(lst, list) else lst.get("sheets", [])
        match = next((s for s in sheets if s.get("id") == sid), None)
        # Only the valid mapping should remain
        assert match["column_mapping"] == {"1": "phone"}
