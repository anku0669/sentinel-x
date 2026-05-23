"""Unified LLM client for OpenAI and Anthropic.

Auto-detects available provider based on env keys.
Falls back to built-in rule-based analyst if no key configured.
"""
from typing import Optional, Literal
from ..config import settings

_SYSTEM_PROMPT = """You are SENTINEL-X AI Analyst — a senior cybersecurity expert assisting authorized security professionals.

Your expertise covers:
- Offensive security: pentesting, recon, vulnerability assessment, exploit development
- Defensive security: SOC operations, threat detection, incident response, hardening
- Application security: OWASP Top 10, secure coding, code review
- Network security: firewall rules, segmentation, traffic analysis
- Cloud security: IAM, container security, supply chain
- AI/LLM security: prompt injection, model jailbreaks, defensive prompting
- Threat intelligence: MITRE ATT&CK, IOCs, TTPs, threat actor profiles

When answering:
1. Be precise and technical. Cite CVEs, MITRE techniques, OWASP categories where relevant.
2. Provide both detection AND mitigation for any threat.
3. Recommend specific tools (e.g., Burp Suite, Wireshark, Sigma, YARA).
4. Refuse to help with unauthorized targeting of specific real systems/people.
5. Use markdown for structure. Code blocks for commands and rules.
6. Keep responses focused — no unnecessary preamble."""


def get_active_provider() -> Literal["openai", "anthropic", "builtin"]:
    """Return which provider will be used based on config + available keys."""
    if settings.AI_PROVIDER == "openai" and settings.OPENAI_API_KEY:
        return "openai"
    if settings.AI_PROVIDER == "anthropic" and settings.ANTHROPIC_API_KEY:
        return "anthropic"
    if settings.AI_PROVIDER == "auto":
        if settings.ANTHROPIC_API_KEY:
            return "anthropic"
        if settings.OPENAI_API_KEY:
            return "openai"
    return "builtin"


async def chat_completion(
    user_message: str,
    context: str = "general",
    history: Optional[list[dict]] = None,
    system_override: Optional[str] = None,
) -> dict:
    """Call active LLM provider. Returns {provider, model, response, error?}."""
    provider = get_active_provider()
    sys_prompt = system_override or _SYSTEM_PROMPT
    if context == "offensive":
        sys_prompt += "\n\nCURRENT MODE: OFFENSIVE — assume the user is a red-team operator on an authorized engagement."
    elif context == "defensive":
        sys_prompt += "\n\nCURRENT MODE: DEFENSIVE — assume the user is a SOC analyst or blue-team operator."

    if provider == "anthropic":
        return await _anthropic_call(user_message, sys_prompt, history)
    if provider == "openai":
        return await _openai_call(user_message, sys_prompt, history)
    return {"provider": "builtin", "model": "rule-based", "response": None, "fallback": True}


async def _anthropic_call(user_msg: str, sys_prompt: str, history: Optional[list[dict]]) -> dict:
    try:
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        msgs = []
        if history:
            for h in history[-10:]:  # cap context
                role = "user" if h.get("role") == "user" else "assistant"
                msgs.append({"role": role, "content": str(h.get("content", ""))})
        msgs.append({"role": "user", "content": user_msg})

        resp = await client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1500,
            system=sys_prompt,
            messages=msgs,
        )
        text = "".join(block.text for block in resp.content if hasattr(block, "text"))
        return {
            "provider": "anthropic",
            "model": settings.ANTHROPIC_MODEL,
            "response": text,
            "usage": {"input_tokens": resp.usage.input_tokens, "output_tokens": resp.usage.output_tokens},
        }
    except Exception as e:
        return {"provider": "anthropic", "model": settings.ANTHROPIC_MODEL, "response": None, "error": str(e)}


async def _openai_call(user_msg: str, sys_prompt: str, history: Optional[list[dict]]) -> dict:
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        msgs = [{"role": "system", "content": sys_prompt}]
        if history:
            for h in history[-10:]:
                role = "user" if h.get("role") == "user" else "assistant"
                msgs.append({"role": role, "content": str(h.get("content", ""))})
        msgs.append({"role": "user", "content": user_msg})

        resp = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=msgs,
            max_tokens=1500,
            temperature=0.4,
        )
        return {
            "provider": "openai",
            "model": settings.OPENAI_MODEL,
            "response": resp.choices[0].message.content,
            "usage": {"input_tokens": resp.usage.prompt_tokens, "output_tokens": resp.usage.completion_tokens},
        }
    except Exception as e:
        return {"provider": "openai", "model": settings.OPENAI_MODEL, "response": None, "error": str(e)}
