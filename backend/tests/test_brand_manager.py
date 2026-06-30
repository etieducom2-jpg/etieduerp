"""
Backend tests for Wizbang Brand Manager features (iteration 6).

Covers:
- Login as Wizbang Brand Manager
- List clients (Acme Cafe seeded)
- Create monthly content plan (day-by-day)
- Share -> public token -> public fetch (no auth) -> respond (remark only)
- Respond with accept -> status becomes Accepted
- Monthly Social Media Report generation via Claude Sonnet 4.5 -> pdf_b64
- Role rename: 'Wizbang Admin' label, 'Wizbang Brand Manager' new role exists
- Admin login regression
"""
import os
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://enterprise-hub-340.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

BM_EMAIL = "brandmgr@etieducom.com"
BM_PASS = "brand@123"
ADMIN_EMAIL = "admin@etieducom.com"
ADMIN_PASS = "admin@123"


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def bm_token():
    r = requests.post(f"{API}/auth/login", data={"username": BM_EMAIL, "password": BM_PASS}, timeout=20)
    assert r.status_code == 200, f"BM login failed: {r.status_code} {r.text}"
    body = r.json()
    assert body.get("user", {}).get("role") == "Wizbang Brand Manager"
    return body["access_token"]


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", data={"username": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=20)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def bm_headers(bm_token):
    return {"Authorization": f"Bearer {bm_token}"}


# ---------- clients ----------
def test_list_clients_has_acme(bm_headers):
    r = requests.get(f"{API}/wizbang/brand/clients", headers=bm_headers, timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    names = [c.get("name") for c in data]
    assert "Acme Cafe" in names, f"Acme Cafe missing in clients: {names}"


@pytest.fixture(scope="module")
def acme_client_id(bm_headers):
    r = requests.get(f"{API}/wizbang/brand/clients", headers=bm_headers, timeout=20)
    for c in r.json():
        if c.get("name") == "Acme Cafe":
            return c["id"]
    pytest.skip("Acme Cafe not seeded")


# ---------- plan create / share / public flow (accept) ----------
@pytest.fixture(scope="module")
def created_plan(bm_headers, acme_client_id):
    payload = {
        "client_id": acme_client_id,
        "title": "TEST_Plan_Accept_Flow",
        "month": "2026-04",
        "days": [
            {"day": 1, "platform": "Instagram", "content_type": "Reel", "caption": "Launch reel", "notes": "Trending audio"},
            {"day": 5, "platform": "Facebook", "content_type": "Post", "caption": "FB launch post", "notes": ""},
        ],
    }
    r = requests.post(f"{API}/wizbang/brand/plans", headers=bm_headers, json=payload, timeout=20)
    assert r.status_code in (200, 201), f"create plan failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["title"] == payload["title"]
    assert data["client_id"] == acme_client_id
    assert isinstance(data.get("days"), list) and len(data["days"]) == 2
    return data


def test_get_plan_after_create(bm_headers, created_plan):
    r = requests.get(f"{API}/wizbang/brand/plans/{created_plan['id']}", headers=bm_headers, timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == created_plan["title"]
    assert len(data["days"]) == 2


def test_share_plan_returns_token(bm_headers, created_plan):
    r = requests.post(f"{API}/wizbang/brand/plans/{created_plan['id']}/share", headers=bm_headers, timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert data.get("share_token"), "share_token missing"
    assert "/public/brand-plan/" in (data.get("public_path") or "")
    created_plan["share_token"] = data["share_token"]


def test_public_fetch_no_auth(created_plan):
    token = created_plan["share_token"]
    # Explicitly NO auth header
    r = requests.get(f"{API}/public/brand-plan/{token}", timeout=20)
    assert r.status_code == 200, f"public fetch failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["title"] == created_plan["title"]
    assert data["status"] in ("Shared", "Acknowledged", "Draft")
    assert isinstance(data["days"], list) and len(data["days"]) == 2


def test_public_respond_accept(created_plan):
    token = created_plan["share_token"]
    payload = {
        "action": "accept",
        "remarks": "Looks great, please proceed.",
        "accepted_by_name": "Sneha Test",
    }
    r = requests.post(f"{API}/public/brand-plan/{token}/respond", json=payload, timeout=20)
    assert r.status_code == 200, f"public respond accept failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("status") == "Accepted", f"Status not Accepted: {data}"


def test_plan_status_persisted_as_accepted(bm_headers, created_plan):
    r = requests.get(f"{API}/wizbang/brand/plans/{created_plan['id']}", headers=bm_headers, timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "Accepted"
    assert data.get("accepted_by_name") == "Sneha Test"
    assert "Looks great" in (data.get("client_remarks") or "")


# ---------- comments-only on a second plan ----------
@pytest.fixture(scope="module")
def comment_only_plan(bm_headers, acme_client_id):
    payload = {
        "client_id": acme_client_id,
        "title": "TEST_Plan_CommentOnly",
        "month": "2026-05",
        "days": [
            {"day": 2, "platform": "LinkedIn", "content_type": "Post", "caption": "LI post", "notes": ""},
        ],
    }
    r = requests.post(f"{API}/wizbang/brand/plans", headers=bm_headers, json=payload, timeout=20)
    assert r.status_code in (200, 201)
    plan = r.json()
    s = requests.post(f"{API}/wizbang/brand/plans/{plan['id']}/share", headers=bm_headers, timeout=20)
    assert s.status_code == 200
    plan["share_token"] = s.json()["share_token"]
    return plan


def test_public_respond_remark_only(comment_only_plan):
    token = comment_only_plan["share_token"]
    payload = {"action": "remark", "remarks": "Please tweak day 2 caption.", "accepted_by_name": None}
    r = requests.post(f"{API}/public/brand-plan/{token}/respond", json=payload, timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") != "Accepted", f"Should NOT be Accepted after remark-only: {data}"


def test_remark_only_plan_status_not_accepted(bm_headers, comment_only_plan):
    r = requests.get(f"{API}/wizbang/brand/plans/{comment_only_plan['id']}", headers=bm_headers, timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] != "Accepted"
    assert "tweak day 2" in (data.get("client_remarks") or "")


# ---------- monthly social media report (Claude Sonnet 4.5 -> PDF) ----------
def test_create_monthly_report_with_ai_and_pdf(bm_headers, acme_client_id):
    payload = {
        "client_id": acme_client_id,
        "month": "2026-05",
        "title": "TEST_Monthly_Report_May",
        "profiles": [
            {"platform": "Instagram", "handle": "@acmecafe", "followers": 4200, "growth": 8.5, "engagement_rate": 4.1},
            {"platform": "Facebook", "handle": "AcmeCafe", "followers": 5100, "growth": 3.2, "engagement_rate": 2.6},
        ],
        "posts": [
            {"platform": "Instagram", "title": "Reel: New Cold Brew", "impressions": 18000, "likes": 920, "comments": 64, "shares": 41},
            {"platform": "Facebook", "title": "Weekend Combo Offer", "impressions": 9000, "likes": 310, "comments": 22, "shares": 18},
        ],
    }
    r = requests.post(f"{API}/wizbang/brand/reports", headers=bm_headers, json=payload, timeout=120)
    assert r.status_code in (200, 201), f"report create failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("ai_summary"), "ai_summary missing"
    assert len(data["ai_summary"]) > 100, f"ai_summary too short: {len(data['ai_summary'])}"
    pdf_b64 = data.get("pdf_b64")
    assert pdf_b64, "pdf_b64 missing"
    raw = base64.b64decode(pdf_b64)
    assert raw[:4] == b"%PDF", "pdf_b64 doesn't decode to a PDF"
    assert len(raw) > 1000


# ---------- role rename / new role visible in roles list ----------
def test_admin_login_and_roles_meta(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    # try common meta endpoint
    paths = ["/auth/roles", "/roles", "/users/roles", "/meta/roles"]
    found = None
    for p in paths:
        rr = requests.get(f"{API}{p}", headers=headers, timeout=15)
        if rr.status_code == 200:
            found = (p, rr.json())
            break
    if not found:
        # Not exposed — still verify register accepts the new role name
        body = {"email": "TEST_dummy_should_fail_existing@example.com",
                "password": "x", "name": "X", "role": "Wizbang Brand Manager"}
        rr = requests.post(f"{API}/auth/register", headers=headers, json=body, timeout=15)
        # We accept 200/201 (created) or 400 (email exists) — both prove the role enum is accepted.
        assert rr.status_code in (200, 201, 400, 409), f"role not accepted: {rr.status_code} {rr.text}"
        # Reject failure modes like 422 (unknown enum)
        assert rr.status_code != 422, f"Wizbang Brand Manager not in enum: {rr.text}"
    else:
        _path, roles = found
        text = str(roles)
        assert "Wizbang Brand Manager" in text
        assert "Wizbang" in text


def test_wizbang_role_value_still_wizbang(admin_token):
    """The legacy Wizbang enum value stays 'Wizbang' (UI label says 'Wizbang Admin')."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    body = {"email": "TEST_dummy_existing@example.com",
            "password": "x", "name": "X", "role": "Wizbang"}
    rr = requests.post(f"{API}/auth/register", headers=headers, json=body, timeout=15)
    assert rr.status_code != 422, f"'Wizbang' role enum no longer accepted: {rr.text}"


# ---------- cleanup ----------
def test_cleanup_created_plans(bm_headers, created_plan, comment_only_plan):
    for p in (created_plan, comment_only_plan):
        try:
            requests.delete(f"{API}/wizbang/brand/plans/{p['id']}", headers=bm_headers, timeout=15)
        except Exception:
            pass
    # No assertion: best-effort cleanup
