from html.parser import HTMLParser
from html import unescape
import httpx
from google.genai import types

_TIMEOUT = 5.0
_MAX_CHARS = 3000


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self._parts: list[str] = []
        self._skip = False

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript"}:
            self._skip = True

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript"}:
            self._skip = False

    def handle_data(self, data):
        if not self._skip:
            text = data.strip()
            if text:
                self._parts.append(text)

    def get_text(self) -> str:
        return " ".join(self._parts)


def _extract_text(html: str) -> str:
    parser = _TextExtractor()
    parser.feed(unescape(html))
    return parser.get_text()


async def fetch_documentation(url: str) -> str:
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=_TIMEOUT) as client:
            response = await client.get(url)
    except httpx.TimeoutException:
        return f"Error: request to {url} timed out after {int(_TIMEOUT)}s."
    except httpx.RequestError as exc:
        return f"Error: could not reach {url} — {exc}."

    if response.status_code != 200:
        return f"Error: received HTTP {response.status_code} from {url}."

    content_type = response.headers.get("content-type", "")
    if "text" not in content_type:
        return f"Error: non-text content type '{content_type}' returned from {url}."

    if "html" in content_type:
        text = _extract_text(response.text)
    else:
        text = response.text

    if len(text) > _MAX_CHARS:
        return text[:_MAX_CHARS] + f"\n\n[Content truncated at {_MAX_CHARS} characters.]"
    return text


FETCH_TOOL = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="fetch_documentation",
            description="Fetch and read the content of a documentation page or URL",
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "url": types.Schema(type=types.Type.STRING),
                },
                required=["url"],
            ),
        )
    ]
)
