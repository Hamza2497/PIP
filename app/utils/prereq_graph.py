import heapq

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import OverruledPrerequisite


def rank(concept) -> tuple:
    # Single swappable function. Swap body later without
    # touching anything else.
    return (concept.creation_seq, str(concept.id))


class PrerequisiteGraph:
    def __init__(self, project_id: str):
        self.project_id = project_id
        self.concepts: dict[str, any] = {}       # id -> Concept ORM object
        self.prereqs: dict[str, set[str]] = {}   # concept_id -> set of prereq ids
        self.overruled: list[tuple[str, str]] = []

    def add_concept(self, concept) -> None:
        cid = str(concept.id)
        self.concepts.setdefault(cid, concept)
        self.prereqs.setdefault(cid, set())

    def add_prerequisite(self, prereq_id: str, concept_id: str) -> bool:
        """
        Only stores the edge if rank(prereq) < rank(concept).
        If not, logs to self.overruled and returns False.
        Never reverses the edge — reversing injects a false
        pedagogical claim the LLM never made.
        """
        if prereq_id == concept_id:
            return False
        p = self.concepts[prereq_id]
        c = self.concepts[concept_id]
        if rank(p) < rank(c):
            self.prereqs[concept_id].add(prereq_id)
            return True
        self.overruled.append((prereq_id, concept_id))
        return False

    def learning_order(self) -> list[str]:
        """
        Kahn's algorithm with a min-heap keyed by rank.
        Produces a stable, deterministic learning order.
        Safety net assert at the end — should never fire
        if the invariant holds.
        """
        indeg = {cid: len(ps) for cid, ps in self.prereqs.items()}
        dependents: dict[str, list[str]] = {cid: [] for cid in self.concepts}
        for cid, ps in self.prereqs.items():
            for p in ps:
                dependents[p].append(cid)

        heap = []
        for cid, d in indeg.items():
            if d == 0:
                heapq.heappush(heap, (rank(self.concepts[cid]), cid))

        order = []
        while heap:
            _, cid = heapq.heappop(heap)
            order.append(cid)
            for dep in dependents[cid]:
                indeg[dep] -= 1
                if indeg[dep] == 0:
                    heapq.heappush(
                        heap,
                        (rank(self.concepts[dep]), dep)
                    )

        assert len(order) == len(self.concepts), \
            "cycle detected — rank invariant was violated"
        return order

    async def flush_overruled(self, session: AsyncSession) -> None:
        """
        Persists all overruled edges to the overruled_prerequisites
        table. Call this after generation completes, inside the same
        session used for the roadmap generation.
        """
        for prereq_id, concept_id in self.overruled:
            session.add(OverruledPrerequisite(
                prereq_id=prereq_id,
                concept_id=concept_id,
                reason="rank invariant violated: prereq creation_seq "
                       ">= concept creation_seq",
                project_id=self.project_id
            ))
        await session.flush()
