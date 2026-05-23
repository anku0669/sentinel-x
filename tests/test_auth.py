"""Tests for authentication endpoints."""
import pytest


@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_login_success(client, db_setup):
    r = await client.post("/api/auth/login",
                          data={"username": "testadmin", "password": "testpass123"})
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client, db_setup):
    r = await client.post("/api/auth/login",
                          data={"username": "testadmin", "password": "wrongpass"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_user(client, db_setup):
    r = await client.post("/api/auth/login",
                          data={"username": "nobody", "password": "anything"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_without_token(client, db_setup):
    r = await client.post("/api/ai/redteam/score", json={"prompt": "test"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_with_token(client, auth_headers):
    r = await client.post("/api/ai/redteam/score",
                          json={"prompt": "hello world"},
                          headers=auth_headers)
    assert r.status_code == 200
