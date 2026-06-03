import asyncio
from duckduckgo_search import DDGS
from google.genai import types


async def run_web_search(query: str) -> str:
    results = await asyncio.to_thread(_ddg_search, query)
    return results


def _ddg_search(query: str) -> str:
    raw = DDGS().text(query, max_results=3)
    lines = []
    for r in raw:
        lines.append(f"{r.get('title', '')}\n{r.get('href', '')}\n{r.get('body', '')}")
    return "\n\n".join(lines)


WEB_SEARCH_TOOL = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="web_search",
            description="Search the web for current information about a topic",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "query": types.Schema(type=types.Type.STRING),
                },
                required=["query"],
            ),
        )
    ]
)
