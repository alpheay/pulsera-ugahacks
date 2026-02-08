"""Tests for episode REST API endpoints."""

import pytest
from fastapi.testclient import TestClient
from server.services.episode_service import EpisodeService, episode_service


@pytest.fixture(autouse=True)
def reset_episode_service():
    """Reset the singleton episode service before each test."""
    episode_service._active_episodes.clear()
    episode_service._episode_by_id.clear()
    episode_service._episode_history.clear()
    yield


@pytest.fixture
def client():
    """Create test client without lifespan (skips PulseNet init)."""
    from server.main import app
    return TestClient(app, raise_server_exceptions=False)


def test_start_episode_endpoint(client, sample_trigger_data):
    """POST /api/episodes/start creates an episode."""
    resp = client.post("/api/episodes/start", json={
        "device_id": "dev-1",
        "user_id": "user-1",
        "trigger_data": sample_trigger_data,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"]
    assert data["device_id"] == "dev-1"
    assert data["phase"] == "anomaly_detected"


def test_get_active_episodes(client, sample_trigger_data):
    """GET /api/episodes/active returns active episodes."""
    client.post("/api/episodes/start", json={
        "device_id": "dev-1",
        "user_id": "user-1",
        "trigger_data": sample_trigger_data,
    })

    resp = client.get("/api/episodes/active")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["device_id"] == "dev-1"


def test_get_episode_detail(client, sample_trigger_data):
    """GET /api/episodes/{id} returns episode details."""
    start_resp = client.post("/api/episodes/start", json={
        "device_id": "dev-1",
        "user_id": "user-1",
        "trigger_data": sample_trigger_data,
    })
    episode_id = start_resp.json()["id"]

    resp = client.get(f"/api/episodes/{episode_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == episode_id
    assert len(data["timeline"]) >= 1


def test_get_episode_not_found(client):
    """GET /api/episodes/{id} returns 404 for nonexistent."""
    resp = client.get("/api/episodes/nonexistent")
    assert resp.status_code == 404


def test_submit_calming(client, sample_trigger_data):
    """POST /api/episodes/{id}/calming processes post-calming vitals."""
    start_resp = client.post("/api/episodes/start", json={
        "device_id": "dev-1",
        "user_id": "user-1",
        "trigger_data": sample_trigger_data,
    })
    episode_id = start_resp.json()["id"]

    resp = client.post(f"/api/episodes/{episode_id}/calming", json={
        "heart_rate": 75,
        "hrv": 48,
    })
    assert resp.status_code == 200
    data = resp.json()
    # Good vitals should resolve
    assert data["phase"] == "resolved"
    assert data["resolution"] == "calming_resolved"


def test_submit_presage(client, sample_trigger_data, sample_presage_distressed):
    """POST /api/episodes/{id}/presage runs fusion."""
    start_resp = client.post("/api/episodes/start", json={
        "device_id": "dev-1",
        "user_id": "user-1",
        "trigger_data": sample_trigger_data,
    })
    episode_id = start_resp.json()["id"]

    # First calming doesn't resolve (still elevated)
    client.post(f"/api/episodes/{episode_id}/calming", json={
        "heart_rate": 130,
        "hrv": 18,
    })

    # Then submit presage
    resp = client.post(f"/api/episodes/{episode_id}/presage", json=sample_presage_distressed)
    assert resp.status_code == 200
    data = resp.json()
    assert data["fusion_decision"] is not None
    assert data["fusion_result"] is not None


def test_resolve_episode(client, sample_trigger_data):
    """POST /api/episodes/{id}/resolve resolves the episode."""
    start_resp = client.post("/api/episodes/start", json={
        "device_id": "dev-1",
        "user_id": "user-1",
        "trigger_data": sample_trigger_data,
    })
    episode_id = start_resp.json()["id"]

    resp = client.post(f"/api/episodes/{episode_id}/resolve", json={
        "resolution": "caregiver_acknowledged",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["phase"] == "resolved"
    assert data["resolution"] == "caregiver_acknowledged"


def test_episode_history(client, sample_trigger_data):
    """GET /api/episodes/history returns resolved episodes."""
    start_resp = client.post("/api/episodes/start", json={
        "device_id": "dev-1",
        "user_id": "user-1",
        "trigger_data": sample_trigger_data,
    })
    episode_id = start_resp.json()["id"]

    client.post(f"/api/episodes/{episode_id}/resolve", json={
        "resolution": "false_positive",
    })

    resp = client.get("/api/episodes/history")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["resolution"] == "false_positive"


def test_duplicate_start_returns_existing(client, sample_trigger_data):
    """Starting a second episode for same device returns existing."""
    resp1 = client.post("/api/episodes/start", json={
        "device_id": "dev-1",
        "user_id": "user-1",
        "trigger_data": sample_trigger_data,
    })
    resp2 = client.post("/api/episodes/start", json={
        "device_id": "dev-1",
        "user_id": "user-1",
        "trigger_data": sample_trigger_data,
    })
    assert resp1.json()["id"] == resp2.json()["id"]
