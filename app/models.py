import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, Vector
from app.enums import ConceptPhase, ConceptStatus


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    google_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Stack(Base):
    __tablename__ = "stacks"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (UniqueConstraint("user_id", "name"),)


class BuildJournal(Base):
    __tablename__ = "build_journals"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("projects.id"), nullable=False)
    concept_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("concepts.id"), nullable=False)
    phase: Mapped[ConceptPhase] = mapped_column(SAEnum(ConceptPhase, name="conceptphase"), nullable=False)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    stack_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("stacks.id"), nullable=True)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    plan: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ProjectConcept(Base):
    __tablename__ = "project_concepts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("projects.id"), nullable=False)
    concept_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("concepts.id"), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer)
    phase: Mapped[ConceptPhase] = mapped_column(SAEnum(ConceptPhase, name="conceptphase"), default=ConceptPhase.PENDING)
    what_to_build: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Concept(Base):
    __tablename__ = "concepts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    stack_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("stacks.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text)
    description_embedding: Mapped[list[float]] = mapped_column(Vector(3072), nullable=True)
    domain: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ConceptPrerequisite(Base):
    __tablename__ = "concept_prerequisites"

    concept_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("concepts.id"), primary_key=True)
    prerequisite_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("concepts.id"), primary_key=True)


class UserConcept(Base):
    __tablename__ = "user_concepts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    concept_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("concepts.id"), nullable=False)
    confidence: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[ConceptStatus] = mapped_column(SAEnum(ConceptStatus, name="conceptstatus"), default=ConceptStatus.NOT_STARTED)
    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (UniqueConstraint("user_id", "concept_id"),)


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    key_hash: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
