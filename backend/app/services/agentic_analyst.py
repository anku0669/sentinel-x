"""Agentic AI Analyst — Claude with tool-use to invoke SENTINEL-X modules.

When a user asks the AI Analyst something actionable ("scan this IP",
"score this prompt", "enumerate subdomains of example.com"), the LLM
can autonomously call the platform's own tools and return results.

Requires ANTHROPIC_API_KEY to be set.
"""
from __future__ import annotations

import json
import asyncio
import httpx
from typing import Any

from ..config import settings

# ── Tool definitions sent to Claude ──────────────────────────────────────────
TOOLS = [
    {
        "name": "run_port_scan",
        "description": (
            "Scan a target IP or hostname for open ports. "
            "Returns a list of open ports with service names and banners."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "target":    {"type": "string", "description": "IP address or hostname to scan"},
                "port_range":{"type": "string", "description": "Port range e.g. '1-1024' or '80,443,8080'", "default": "1-1024"},
            },
            "required": ["target"],
        },
    },
    {
        "name": "score_prompt_risk",
        "description": (
            "Analyse a text prompt for prompt-injection, jailbreak, PII leakage, "
            "and secret exposure risk. Returns a 0-100 risk score with findings."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "prompt": {"type": "string", "description": "The prompt text to analyse"},
            },
            "required": ["prompt"],
        },
    },
    {
        "name": "enumerate_subdomains",
        "description": (
            "Enumerate subdomains of a target domain via Certificate Transparency logs (crt.sh). "
            "Returns a list of discovered subdomains."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "domain": {"type": "string", "description": "Target domain e.g. example.com"},
            },
            "required": ["domain"],
        },
    },
    {
        "name": "check_anomaly",
        "description": (
            "Run the IsolationForest ML anomaly detector on a set of network flow features. "
            "Returns anomaly verdict, score and confidence."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "bytes_sent":       {"type": "number", "description": "Bytes sent in the flow"},
                "bytes_recv":       {"type": "number", "description": "Bytes received in the flow"},
                "requests_per_min": {"type": "number", "description": "Requests per minute"},
                "error_rate":       {"type": "number", "description": "Error rate 0.0-1.0"},
                "unique_dest":      {"type": "number", "description": "Number of unique destinations"},
            },
            "required": ["bytes_sent", "bytes_recv", "requests_per_min", "error_rate", "unique_dest"],
        },
    },
    {
        "name": "analyze_url",
        "description": (
            "Inspect a URL for phishing indicators: TLS cert, redirect chain, "
            "IP reputation, and phishing-kit signature matches."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "The URL to inspect"},
            },
            "required": ["url"],
        },
    },
]

_SYSTEM = """You are SENTINEL-X Agentic AI Analyst — a senior cybersecurity expert with
direct access to the SENTINEL-X security platform tools.

When the user asks you to perform an action (scan, analyse, enumerate, check),
USE the available tools rather than describing what to do.

After receiving tool results, provide a clear expert interpretation:
- What did you find?
- What does it mean (severity, context)?
- What should the user do next?

Always cite MITRE ATT&CK / OWASP references where relevant.
Refuse to target systems the user does not own or have explicit authorisation for."""


# ── Tool execution (calls the local FastAPI backend) ─────────────────────────
_BASE = "http://localhost:8000"


async def _execute_tool(name: str, inputs: dict[str, Any], token: str) -> str:
    """Call the corresponding SENTINEL-X API endpoint."""
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            if name == "run_port_scan":
                r = await client.post(f"{_BASE}/api/offensive/scan", headers=headers, json={
                    "target": inputs["target"],
                    "port_range": inputs.get("port_range", "1-1024"),
                })
                return json.dumps(r.json())

            elif name == "score_prompt_risk":
                r = await client.post(f"{_BASE}/api/ai/redteam/score", headers=headers, json={
                    "prompt": inputs["prompt"],
                })
                return json.dumps(r.json())

            elif name == "enumerate_subdomains":
                r = await client.post(f"{_BASE}/api/osint/subdomains", headers=headers, json={
                    "domain": inputs["domain"],
                })
                return json.dumps(r.json())

            elif name == "check_anomaly":
                params = {
                    "bytes_sent":       inputs["bytes_sent"],
                    "bytes_recv":       inputs["bytes_recv"],
                    "rpm":              inputs["requests_per_min"],
                    "error_rate":       inputs["error_rate"],
                    "unique_dest":      inputs["unique_dest"],
                }
                r = await client.get(f"{_BASE}/api/defensive/anomaly/check",
                                     headers=headers, params=params)
                return json.dumps(r.json())

            elif name == "analyze_url":
                r = await client.post(f"{_BASE}/api/phishing/inspect", headers=headers, json={
                    "url": inputs["url"],
                })
                return json.dumps(r.json())

            else:
                return json.dumps({"error": f"Unknown tool: {name}"})

        except Exception as exc:
            return json.dumps({"error": str(exc)})


# ── Main agentic chat function ────────────────────────────────────────────────
async def agentic_chat(
    user_message: str,
    context: str = "general",
    history: list[dict] | None = None,
    user_token: str = "",
) -> dict:
    """Run an agentic conversation turn with tool-use support.

    Returns {response, tools_used, provider}.
    Falls back to plain chat_completion if no Anthropic key.
    """
    if not settings.ANTHROPIC_API_KEY:
        from . import llm_client
        result = await llm_client.chat_completion(user_message, context, history)
        return {**result, "tools_used": [], "agentic": False}

    from anthropic import AsyncAnthropic
    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    sys_prompt = _SYSTEM
    if context == "offensive":
        sys_prompt += "\n\nCURRENT MODE: OFFENSIVE — user is an authorised red-team operator."
    elif context == "defensive":
        sys_prompt += "\n\nCURRENT MODE: DEFENSIVE — user is a SOC analyst."

    msgs: list[dict] = []
    if history:
        for h in history[-8:]:
            role = "user" if h.get("role") == "user" else "assistant"
            msgs.append({"role": role, "content": str(h.get("content", ""))})
    msgs.append({"role": "user", "content": user_message})

    tools_used: list[dict] = []
    final_text = ""

    # ── Agentic loop (max 5 iterations to avoid runaway) ─────────────────────
    for _ in range(5):
        resp = await client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=2000,
            system=sys_prompt,
            tools=TOOLS,
            messages=msgs,
        )

        # Collect text blocks
        text_blocks = [b.text for b in resp.content if hasattr(b, "text")]
        tool_blocks  = [b for b in resp.content if b.type == "tool_use"]

        if text_blocks:
            final_text = "\n".join(text_blocks)

        if not tool_blocks or resp.stop_reason == "end_turn":
            break   # No more tool calls — we're done

        # Execute each tool and feed results back
        tool_results = []
        for tb in tool_blocks:
            tools_used.append({"tool": tb.name, "input": tb.input})
            result_str = await _execute_tool(tb.name, tb.input, user_token)
            tool_results.append({
                "type":        "tool_result",
                "tool_use_id": tb.id,
                "content":     result_str,
            })

        # Append assistant turn + tool results to messages
        msgs.append({"role": "assistant", "content": resp.content})
        msgs.append({"role": "user",      "content": tool_results})

    return {
        "provider":   "anthropic",
        "model":      settings.ANTHROPIC_MODEL,
        "response":   final_text,
        "tools_used": tools_used,
        "agentic":    True,
        "usage": {
            "input_tokens":  getattr(resp.usage, "input_tokens", 0),
            "output_tokens": getattr(resp.usage, "output_tokens", 0),
        },
    }
