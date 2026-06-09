from enum import Enum


class ConceptStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    MASTERED = "mastered"


class ConceptPhase(str, Enum):
    PENDING = "pending"
    ORIENTING = "orienting"
    IN_PROGRESS = "in_progress"
    CHECKPOINTING = "checkpointing"
    COMPLETE = "complete"
    # Legacy phases kept for backward compat
    TEACHING = "teaching"
    AWAITING_CODE_RETURN = "awaiting_code_return"
    DEBRIEFING = "debriefing"
