from collections import deque


def topological_sort(concept_ids: list[str], prerequisites: list[tuple[str, str]]) -> list[str]:
    in_degree = {concept_id: 0 for concept_id in concept_ids}
    dependents: dict[str, list[str]] = {concept_id: [] for concept_id in concept_ids}

    for concept_id, prerequisite_id in prerequisites:
        dependents[prerequisite_id].append(concept_id)
        in_degree[concept_id] += 1

    queue = deque(concept_id for concept_id in concept_ids if in_degree[concept_id] == 0)
    sorted_ids: list[str] = []

    while queue:
        current = queue.popleft()
        sorted_ids.append(current)
        for dependent in dependents[current]:
            in_degree[dependent] -= 1
            if in_degree[dependent] == 0:
                queue.append(dependent)

    if len(sorted_ids) != len(concept_ids):
        raise ValueError("Cycle detected in concept prerequisite graph")

    return sorted_ids
