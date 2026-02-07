"""Episode model — lifecycle tracking for detection-to-resolution events."""

import enum
from datetime import datetime
from typing import Any, Optional
from uuid import uuid4

from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON


class EpisodePhase(str, enum.Enum):
    monitoring = "monitoring"
    anomaly_detected = "anomaly_detected"
    calming = "calming"
    re_evaluating = "re_evaluating"
    visual_check = "visual_check"
    fusing = "fusing"
    escalating = "escalating"
    resolved = "resolved"


class FusionDecision(str, enum.Enum):
    escalate = "escalate"
    false_positive = "false_positive"
    ambiguous = "ambiguous"


class Resolution(str, enum.Enum):
    calming_resolved = "calming_resolved"
    false_positive = "false_positive"
    caregiver_acknowledged = "caregiver_acknowledged"
    emergency_dispatched = "emergency_dispatched"


class Episode(SQLModel, table=True):
    id: str = Field(default_factory=lambda: uuid4().hex[:12], primary_key=True)
    device_id: str = Field(index=True)
    user_id: str = Field(index=True)
    group_id: Optional[str] = Field(default=None, index=True)

    phase: str = Field(default=EpisodePhase.monitoring.value)

    # Trigger
    trigger_data: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))

    # Calming
    calming_started_at: Optional[datetime] = None
    calming_ended_at: Optional[datetime] = None

    # Re-evaluation
    re_evaluation_result: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))

    # Visual check-in (Presage)
    presage_data: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))

    # Fusion
    fusion_result: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    fusion_decision: Optional[str] = None

    # Escalation
    escalation_level: int = Field(default=0)
    severity_score: float = Field(default=0.0)

    # Timeline
    timeline: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))

    # Resolution
    resolved_at: Optional[datetime] = None
    resolution: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
