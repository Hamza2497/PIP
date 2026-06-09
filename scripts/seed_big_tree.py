"""
Seed script: creates a rich "Python CLI Tool" project with 30 concepts
across 5 levels for visual testing of the concept tree.

Run from project root (with .venv active):
    python scripts/seed_big_tree.py --email your@email.com

Pass --replace to delete any existing project named "Python CLI Tool" first.
"""

import asyncio
import argparse
import uuid
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import select, delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.database import AsyncSessionLocal
from app.enums import ConceptPhase, ConceptStatus
from app.models import (
    User, Stack, Project, ProjectConcept,
    Concept, ConceptPrerequisite, UserConcept,
)
from app.utils.graph import topological_sort

# ─────────────────────────────────────────────────────────────────────────────
# Concept definitions: (name, description, domain, [prerequisite names], state)
# state is used to pre-populate UserConcept rows for visual variety.
# ─────────────────────────────────────────────────────────────────────────────
CONCEPTS = [
    # ── Level 1: Python Foundations ──────────────────────────────────────────
    ("Python Basics",           "Interpreter, REPL, running scripts, indentation", "python",     [],                                              "mastered"),
    ("Variables & Data Types",  "int, float, str, bool, None; dynamic typing",      "python",     ["Python Basics"],                               "mastered"),
    ("Control Flow",            "if/elif/else, while, for, break, continue",        "python",     ["Variables & Data Types"],                      "mastered"),
    ("Functions",               "def, return, scope, default args, *args, **kwargs","python",     ["Control Flow"],                                "mastered"),
    ("String Operations",       "Slicing, f-strings, methods, regex basics",        "python",     ["Variables & Data Types"],                      "mastered"),

    # ── Level 2: Data Structures ─────────────────────────────────────────────
    ("Lists & Tuples",          "Mutable vs immutable sequences, slicing, methods", "python",     ["Variables & Data Types"],                      "mastered"),
    ("Dictionaries & Sets",     "Hash maps, key lookups, set operations",           "python",     ["Lists & Tuples"],                              "in_progress"),
    ("List Comprehensions",     "Concise list building, conditional comprehensions","python",     ["Lists & Tuples", "Control Flow"],              "in_progress"),
    ("Generators & Iterators",  "yield, lazy evaluation, itertools",                "python",     ["List Comprehensions", "Functions"],            "active"),

    # ── Level 3: Modules & OOP ───────────────────────────────────────────────
    ("Modules & Packages",      "import, __init__.py, relative imports, sys.path",  "python",     ["Functions"],                                   "ready"),
    ("Error Handling",          "try/except/finally, custom exceptions, raising",   "python",     ["Functions"],                                   "ready"),
    ("File I/O",                "open(), context managers, pathlib, json/csv",      "python",     ["Modules & Packages", "Error Handling"],        "ready"),
    ("OOP Basics",              "class, __init__, self, attributes, methods",       "python",     ["Functions"],                                   "ready"),
    ("Inheritance",             "super(), method overriding, MRO, abstract classes","python",     ["OOP Basics"],                                  "locked"),
    ("Decorators",              "@functools.wraps, class decorators, stacking",     "python",     ["Functions", "OOP Basics"],                     "locked"),
    ("Context Managers",        "__enter__/__exit__, contextlib.contextmanager",    "python",     ["OOP Basics", "File I/O"],                      "locked"),

    # ── Level 4: CLI Tools ───────────────────────────────────────────────────
    ("sys.argv",                "Raw argument parsing, sys.stdin, sys.stdout",      "cli",        ["Modules & Packages"],                          "locked"),
    ("argparse",                "ArgumentParser, subcommands, type coercion",       "cli",        ["sys.argv"],                                    "locked"),
    ("click Framework",         "@click.command, @click.option, groups, callbacks", "cli",        ["Decorators", "argparse"],                      "locked"),
    ("Rich Library",            "Console, Table, Progress, Syntax highlighting",   "cli",        ["click Framework"],                             "locked"),
    ("Subprocess Module",       "subprocess.run, Popen, pipes, shell commands",     "cli",        ["Error Handling", "Modules & Packages"],        "locked"),
    ("Environment Variables",   "os.environ, dotenv, config patterns",              "cli",        ["Modules & Packages"],                          "locked"),
    ("Config Files",            "configparser, TOML (tomllib), YAML, JSON config",  "cli",        ["File I/O", "Environment Variables"],           "locked"),

    # ── Level 5: Quality & Distribution ──────────────────────────────────────
    ("Type Hints & mypy",       "PEP 484, Optional, Union, TypeVar, mypy --strict", "tooling",   ["OOP Basics"],                                  "locked"),
    ("Virtual Envs & pip",      "venv, pip, requirements.txt, pip-tools",           "tooling",   ["Modules & Packages"],                          "locked"),
    ("Poetry",                  "pyproject.toml, dependency groups, publishing",    "tooling",   ["Virtual Envs & pip"],                          "locked"),
    ("Testing with pytest",     "fixtures, parametrize, mocking, conftest.py",     "tooling",   ["Error Handling", "Decorators"],                "locked"),
    ("Logging",                 "logging module, handlers, formatters, levels",     "tooling",   ["Modules & Packages"],                          "locked"),
    ("Packaging CLI Tools",     "entry_points, console_scripts, wheel, sdist",     "tooling",   ["Poetry", "click Framework"],                   "locked"),
    ("PyPI Distribution",       "twine, TestPyPI, versioning, classifiers",        "tooling",   ["Packaging CLI Tools"],                         "locked"),
]

STATUS_MAP = {
    "mastered":    (ConceptPhase.COMPLETE,   ConceptStatus.MASTERED),
    "in_progress": (ConceptPhase.TEACHING,   ConceptStatus.IN_PROGRESS),
    "active":      (ConceptPhase.ORIENTING,  None),
    "ready":       (ConceptPhase.ORIENTING,  None),
    "locked":      (ConceptPhase.ORIENTING,  None),
}

CONFIDENCE_MAP = {
    "mastered":    5,
    "in_progress": 2,
}


async def seed(email: str, replace: bool) -> None:
    async with AsyncSessionLocal() as session:
        # Find user
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user is None:
            print(f"No user found with email {email!r}. Log in first.")
            return

        print(f"Found user: {user.name} ({user.email})")

        # Optionally remove existing project
        if replace:
            result = await session.execute(
                select(Project)
                .join(Stack, Stack.id == Project.stack_id)
                .where(Project.user_id == user.id,
                       Stack.name == "Python CLI Tool")
            )
            for proj in result.scalars().all():
                await session.execute(delete(ProjectConcept).where(ProjectConcept.project_id == proj.id))
                await session.delete(proj)
            await session.flush()
            print("Removed existing 'Python CLI Tool' project(s).")

        # Upsert stack
        result = await session.execute(
            select(Stack).where(Stack.user_id == user.id, Stack.name == "Python CLI Tool")
        )
        stack = result.scalar_one_or_none()
        if stack is None:
            stack = Stack(user_id=user.id, name="Python CLI Tool")
            session.add(stack)
        await session.flush()

        # Create concepts
        name_to_concept: dict[str, Concept] = {}
        for name, desc, domain, _prereqs, _state in CONCEPTS:
            result = await session.execute(
                select(Concept).where(Concept.stack_id == stack.id, Concept.name == name)
            )
            concept = result.scalar_one_or_none()
            if concept is None:
                concept = Concept(
                    stack_id=stack.id, name=name,
                    description=desc, domain=domain,
                )
                session.add(concept)
            name_to_concept[name] = concept

        await session.flush()

        # Wire prerequisites
        prereq_pairs: list[tuple] = []
        for name, _d, _dom, prereq_names, _state in CONCEPTS:
            concept = name_to_concept[name]
            for pname in prereq_names:
                prereq = name_to_concept.get(pname)
                if prereq is None:
                    continue
                await session.execute(
                    pg_insert(ConceptPrerequisite)
                    .values(concept_id=concept.id, prerequisite_id=prereq.id)
                    .on_conflict_do_nothing()
                )
                prereq_pairs.append((concept.id, prereq.id))

        await session.flush()

        # Topological sort
        concept_ids = [name_to_concept[name].id for name, *_ in CONCEPTS]
        sorted_ids = topological_sort(concept_ids, prereq_pairs)

        # Create project
        project = Project(
            user_id=user.id, stack_id=stack.id,
            plan="Build a production-ready Python CLI tool from scratch.",
            status="active",
        )
        session.add(project)
        await session.flush()

        # State tracking: find which concepts are "complete" (mastered/in_progress)
        # so we can set phase correctly
        id_to_name = {v.id: k for k, v in name_to_concept.items()}
        name_to_state = {name: state for name, _d, _dom, _p, state in CONCEPTS}

        for order_index, concept_id in enumerate(sorted_ids):
            name = id_to_name[concept_id]
            state = name_to_state[name]
            phase, _ = STATUS_MAP[state]
            session.add(ProjectConcept(
                project_id=project.id,
                concept_id=concept_id,
                order_index=order_index,
                phase=phase,
            ))

        # UserConcept rows for mastered/in_progress
        for name, state in name_to_state.items():
            if state not in CONFIDENCE_MAP:
                continue
            concept = name_to_concept[name]
            result = await session.execute(
                select(UserConcept).where(
                    UserConcept.user_id == user.id,
                    UserConcept.concept_id == concept.id,
                )
            )
            uc = result.scalar_one_or_none()
            _, status = STATUS_MAP[state]
            conf = CONFIDENCE_MAP[state]
            if uc is None:
                session.add(UserConcept(
                    user_id=user.id, concept_id=concept.id,
                    confidence=conf, status=status,
                ))
            else:
                uc.confidence = conf
                uc.status = status

        await session.commit()
        print(f"Done! Project id: {project.id}")
        print(f"Created {len(CONCEPTS)} concepts across 5 levels.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed a big Python CLI project")
    parser.add_argument("--email", required=True, help="Your account email")
    parser.add_argument("--replace", action="store_true",
                        help="Delete existing Python CLI Tool project first")
    args = parser.parse_args()
    asyncio.run(seed(args.email, args.replace))
