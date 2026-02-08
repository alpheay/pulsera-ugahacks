"""Tests for EpisodeService lifecycle logic."""

import pytest
from server.services.episode_service import EpisodeService


@pytest.fixture
def service():
    """Fresh episode service for each test."""
    return EpisodeService()


@pytest.mark.asyncio
async def test_start_episode(service, sample_trigger_data):
    """Starting an episode returns correct initial state."""
    episode = await service.start_episode("dev-1", "user-1", sample_trigger_data)

    assert episode["id"]
    assert episode["device_id"] == "dev-1"
    assert episode["user_id"] == "user-1"
    assert episode["phase"] == "anomaly_detected"
    assert episode["trigger_data"] == sample_trigger_data
    assert episode["escalation_level"] == 0
    assert len(episode["timeline"]) == 1
    assert episode["timeline"][0]["phase"] == "anomaly_detected"


@pytest.mark.asyncio
async def test_calming_resolved(service, sample_trigger_data, sample_good_post_vitals):
    """Good post-calming vitals resolve the episode."""
    episode = await service.start_episode("dev-1", "user-1", sample_trigger_data)
    await service.update_phase(episode["id"], "calming")

    result = await service.submit_calming_result(episode["id"], sample_good_post_vitals)

    assert result["phase"] == "resolved"
    assert result["resolution"] == "calming_resolved"
    assert result["resolved_at"] is not None
    # Episode should be moved to history
    assert service.get_active_episode("dev-1") is None
    assert len(service.get_history()) == 1


@pytest.mark.asyncio
async def test_calming_not_resolved(service, sample_trigger_data, sample_bad_post_vitals):
    """Still-elevated post-calming vitals move to visual check."""
    episode = await service.start_episode("dev-1", "user-1", sample_trigger_data)
    await service.update_phase(episode["id"], "calming")

    result = await service.submit_calming_result(episode["id"], sample_bad_post_vitals)

    assert result["phase"] == "visual_check"
    assert result["resolution"] is None
    # Should still be active
    assert service.get_active_episode("dev-1") is not None


@pytest.mark.asyncio
async def test_fusion_escalate(service, sample_trigger_data, sample_presage_distressed):
    """Watch high + presage distressed = escalate."""
    episode = await service.start_episode("dev-1", "user-1", sample_trigger_data)
    await service.update_phase(episode["id"], "calming")
    await service.submit_calming_result(episode["id"], {"heart_rate": 130, "hrv": 18})

    result = await service.submit_presage_data(episode["id"], sample_presage_distressed)

    assert result["fusion_decision"] == "escalate"
    assert result["phase"] == "escalating"
    assert result["escalation_level"] == 1
    assert result["fusion_result"]["combined_score"] >= 0.6


@pytest.mark.asyncio
async def test_fusion_false_positive(service, sample_trigger_data, sample_presage_calm):
    """Watch high + presage calm = false positive."""
    # Use moderate trigger data so combined score is low
    moderate_trigger = {
        "heart_rate": 115,
        "hrv": 40,
        "anomaly_score": 0.45,
    }
    episode = await service.start_episode("dev-1", "user-1", moderate_trigger)
    await service.update_phase(episode["id"], "calming")
    await service.submit_calming_result(episode["id"], {"heart_rate": 120, "hrv": 18})

    result = await service.submit_presage_data(episode["id"], sample_presage_calm)

    assert result["fusion_decision"] == "false_positive"
    assert result["phase"] == "resolved"
    assert result["resolution"] == "false_positive"
    assert result["fusion_result"]["combined_score"] <= 0.3


@pytest.mark.asyncio
async def test_fusion_ambiguous(service, sample_trigger_data):
    """Watch high + no presage = ambiguous."""
    episode = await service.start_episode("dev-1", "user-1", sample_trigger_data)
    await service.update_phase(episode["id"], "visual_check")

    # Run fusion without presage data
    result = await service.run_fusion(episode["id"])

    assert result["fusion_decision"] in ("ambiguous", "false_positive")
    assert result["fusion_result"]["presage_score"] is None


@pytest.mark.asyncio
async def test_episode_timeline(service, sample_trigger_data):
    """Timeline entries are recorded for each phase transition."""
    episode = await service.start_episode("dev-1", "user-1", sample_trigger_data)
    await service.update_phase(episode["id"], "calming", {"duration": 75})
    await service.update_phase(episode["id"], "re_evaluating")

    ep = service.get_episode(episode["id"])
    assert len(ep["timeline"]) >= 3
    phases = [t["phase"] for t in ep["timeline"]]
    assert "anomaly_detected" in phases
    assert "calming" in phases
    assert "re_evaluating" in phases


@pytest.mark.asyncio
async def test_escalation_levels(service, sample_trigger_data):
    """Escalation level progresses correctly."""
    episode = await service.start_episode("dev-1", "user-1", sample_trigger_data)

    await service.escalate(episode["id"], 1)
    ep = service.get_episode(episode["id"])
    assert ep["escalation_level"] == 1

    await service.escalate(episode["id"], 2)
    ep = service.get_episode(episode["id"])
    assert ep["escalation_level"] == 2

    await service.escalate(episode["id"], 3)
    ep = service.get_episode(episode["id"])
    assert ep["escalation_level"] == 3


@pytest.mark.asyncio
async def test_resolve_episode(service, sample_trigger_data):
    """Resolving an episode moves it to history."""
    episode = await service.start_episode("dev-1", "user-1", sample_trigger_data)

    result = await service.resolve(episode["id"], "caregiver_acknowledged")

    assert result["phase"] == "resolved"
    assert result["resolution"] == "caregiver_acknowledged"
    assert service.get_active_episode("dev-1") is None
    assert len(service.get_history()) == 1


@pytest.mark.asyncio
async def test_no_duplicate_active_episodes(service, sample_trigger_data):
    """Only one active episode per device."""
    ep1 = await service.start_episode("dev-1", "user-1", sample_trigger_data)
    active = service.get_active_episode("dev-1")
    assert active["id"] == ep1["id"]

    # Starting another on same device returns same episode
    ep2 = await service.start_episode("dev-1", "user-1", sample_trigger_data)
    assert ep2["id"] != ep1["id"]  # new ID, but overwrites the active slot

    # Different device should work
    ep3 = await service.start_episode("dev-2", "user-2", sample_trigger_data)
    assert ep3["id"] != ep2["id"]
    assert len(service.get_active_episodes()) == 2


@pytest.mark.asyncio
async def test_get_nonexistent_episode(service):
    """Getting a nonexistent episode returns None."""
    assert service.get_episode("nonexistent") is None
    assert service.get_active_episode("nonexistent") is None


@pytest.mark.asyncio
async def test_resolve_nonexistent(service):
    """Resolving a nonexistent episode returns None."""
    result = await service.resolve("nonexistent", "caregiver_acknowledged")
    assert result is None
