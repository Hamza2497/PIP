from enum import Enum


class ConceptStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    MASTERED = "mastered"


class ConceptPhase(str, Enum):
    ORIENTING = "orienting"
    TEACHING = "teaching"
    AWAITING_CODE_RETURN = "awaiting_code_return"
    DEBRIEFING = "debriefing"
    CHECKPOINTING = "checkpointing"
    COMPLETE = "complete"
