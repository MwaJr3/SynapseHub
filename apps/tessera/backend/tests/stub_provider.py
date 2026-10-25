"""A local stand-in for any OpenAI-compatible provider.

Groq, Google Gemini's compatibility endpoint, OpenRouter and Ollama all speak
this wire format. Serving it from a thread in the test process lets the real
Agents SDK and the real ChatKit server run without an account anywhere, and
without pretending the replies are intelligent: they are scripted.

The two scripted turns are deliberate:

1. A tool call to `search_knowledge`, which is how a real model starts when it
   needs the curriculum.
2. A final answer that cites a concept, which is what the instructions demand.
"""
from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MODEL = "stub-model"

TOOL_CALL = {
    "id": "call_1",
    "object": "chat.completion",
    "created": 0,
    "model": MODEL,
    "choices": [
        {
            "index": 0,
            "finish_reason": "tool_calls",
            "message": {
                "role": "assistant",
                "content": None,
                "tool_calls": [
                    {
                        "id": "call_1",
                        "type": "function",
                        "function": {
                            "name": "search_knowledge",
                            "arguments": json.dumps({"question": "why is a bare except risky"}),
                        },
                    }
                ],
            },
        }
    ],
    "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
}

FINAL_ANSWER = "Catch the specific exception you can handle (Concept: Exceptions and error handling)."

TEXT_ANSWER = {
    "id": "chat_2",
    "object": "chat.completion",
    "created": 0,
    "model": MODEL,
    "choices": [
        {
            "index": 0,
            "finish_reason": "stop",
            "message": {"role": "assistant", "content": FINAL_ANSWER},
        }
    ],
    "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
}


def _chunk(delta: dict, finish: str | None = None) -> str:
    return "data: " + json.dumps(
        {
            "id": "chatcmpl-stub",
            "object": "chat.completion.chunk",
            "created": 0,
            "model": MODEL,
            "choices": [{"index": 0, "delta": delta, "finish_reason": finish}],
        }
    ) + "\n\n"


def sse_body(first: bool) -> str:
    """The streamed form of the scripted turn.

    ChatKit runs the agent with streaming enabled, so the stub has to speak SSE
    even though its answers are fixed. This is the same framing Groq, Gemini and
    OpenRouter use.
    """
    if first:
        frames = [
            _chunk(
                {
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [
                        {
                            "index": 0,
                            "id": "call_1",
                            "type": "function",
                            "function": {"name": "search_knowledge", "arguments": ""},
                        }
                    ],
                }
            ),
            _chunk(
                {
                    "tool_calls": [
                        {
                            "index": 0,
                            "function": {
                                "arguments": json.dumps({"question": "why is a bare except risky"})
                            },
                        }
                    ]
                }
            ),
            _chunk({}, finish="tool_calls"),
        ]
    else:
        frames = [
            _chunk({"role": "assistant", "content": ""}),
            *[_chunk({"content": word + " "}) for word in FINAL_ANSWER.split(" ")],
            _chunk({}, finish="stop"),
        ]
    return "".join(frames) + "data: [DONE]\n\n"


class StubProvider(BaseHTTPRequestHandler):
    """Answers the first request with a tool call, then with text."""

    requests: list[dict] = []

    def do_POST(self) -> None:  # noqa: N802 - stdlib naming
        length = int(self.headers.get("content-length") or 0)
        body = json.loads(self.rfile.read(length) or b"{}")
        type(self).requests.append(body)

        first = len(type(self).requests) == 1
        if body.get("stream"):
            payload = sse_body(first).encode()
            content_type = "text/event-stream"
        else:
            payload = json.dumps(TOOL_CALL if first else TEXT_ANSWER).encode()
            content_type = "application/json"

        self.send_response(200)
        self.send_header("content-type", content_type)
        self.send_header("content-length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args: object) -> None:
        pass


class RunningProvider:
    """Context manager yielding the handler class and the base URL to use."""

    def __init__(self) -> None:
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), StubProvider)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.requests = StubProvider.requests

    def __enter__(self) -> "RunningProvider":
        StubProvider.requests = []
        self.requests = StubProvider.requests
        self.thread.start()
        return self

    @property
    def base_url(self) -> str:
        return f"http://127.0.0.1:{self.server.server_address[1]}/v1"

    def __exit__(self, *exc: object) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)
