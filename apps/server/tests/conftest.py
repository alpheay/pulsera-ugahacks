"""Shared test fixtures for Pulsera server tests."""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def test_app():
    """Create a FastAPI TestClient."""
    from server.main import app
    return TestClient(app)


@pytest.fixture
def sample_trigger_data():
    """Sample watch trigger data for episode creation."""
    return {
        "heart_rate": 142,
        "hrv": 22,
        "acceleration": 1.2,
        "skin_temp": 37.1,
        "anomaly_score": 0.75,
        "anomaly_type": "sustained_elevated_hr",
    }


@pytest.fixture
def sample_good_post_vitals():
    """Post-calming vitals that indicate resolution."""
    return {
        "heart_rate": 78,
        "hrv": 45,
        "acceleration": 1.0,
        "skin_temp": 36.5,
        "status": "normal",
    }


@pytest.fixture
def sample_bad_post_vitals():
    """Post-calming vitals that are still elevated."""
    return {
        "heart_rate": 135,
        "hrv": 20,
        "acceleration": 1.1,
        "skin_temp": 37.0,
        "status": "elevated",
    }


@pytest.fixture
def sample_presage_distressed():
    """Presage data showing distress."""
    return {
        "visual_heart_rate": 138,
        "breathing_rate": 24,
        "facial_expression": "distressed",
        "blink_rate": 28,
        "eye_responsiveness": "slow",
        "confidence_score": 0.85,
    }


@pytest.fixture
def sample_presage_calm():
    """Presage data showing calm state."""
    return {
        "visual_heart_rate": 82,
        "breathing_rate": 14,
        "facial_expression": "calm",
        "blink_rate": 16,
        "eye_responsiveness": "normal",
        "confidence_score": 0.90,
    }
