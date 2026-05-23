"""SENTINEL-X MCP Server.

Exposes SENTINEL-X tools via the Model Context Protocol so Claude Desktop,
Cursor, ChatGPT, and any MCP-compatible client can call them directly.

USAGE — stdio mode (recommended for Claude Desktop):

    python -m app.mcp_server

Add to ~/Library/Application Support/Claude/claude_desktop_config.json:

    {
      "mcpServers": {
        "sentinel-x": {
          "command": "python",
          "args": ["-m", "app.mcp_server"],
          "cwd": "/path/to/sentinel-x/backend"
        }
      }
    }

The tools exposed: port_scan, web_recon, payload_generate,
analyze_password, crack_hash, score_prompt, mutate_prompt,
analyze_phishing_email, analyze_url, calculate_cvss, ai_security_analyst.
"""
import asyncio
import json
import sys
from typing import Any

# --- Minimal MCP server implementation over stdio ---
# Implements MCP 2024-11-05 protocol. No external deps required.

PROTOCOL_VERSION = "2024-11-05"
SERVER_INFO = {"name": "sentinel-x", "version": "1.2.0"}


TOOLS = [
    {
        "name": "port_scan",
        "description": "Async TCP port scan against a target host. Returns open ports, service names, banners, and known CVE references. Use only on systems you own or have authorization to test.",
        "inputSchema": {
            "type": "object",
            "properties": {"target": {"type": "string", "description": "Hostname or IP"}},
            "required": ["target"],
        },
    },
    {
        "name": "web_recon",
        "description": "Web reconnaissance — fetches headers, detects technologies, audits security headers, identifies info disclosure.",
        "inputSchema": {
            "type": "object",
            "properties": {"url": {"type": "string"}},
            "required": ["url"],
        },
    },
    {
        "name": "payload_generate",
        "description": "Generate offensive payloads for authorized security testing. Supports: reverse_shell, xss, sqli, lfi, encode.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "payload_type": {"type": "string", "enum": ["reverse_shell", "xss", "sqli", "lfi", "encode"]},
                "target_os": {"type": "string", "default": "linux"},
                "lhost": {"type": "string"},
                "lport": {"type": "integer"},
                "text": {"type": "string", "description": "Text to encode (for encode type)"},
            },
            "required": ["payload_type"],
        },
    },
    {
        "name": "analyze_password",
        "description": "Analyze password strength: entropy, crack-time estimate, character classes, common-password check.",
        "inputSchema": {
            "type": "object",
            "properties": {"password": {"type": "string"}},
            "required": ["password"],
        },
    },
    {
        "name": "crack_hash",
        "description": "Try to crack an MD5/SHA1/SHA256/SHA512 hash against a built-in common-password wordlist.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "hash_value": {"type": "string"},
                "hash_type": {"type": "string", "enum": ["md5", "sha1", "sha256", "sha512"], "default": "md5"},
            },
            "required": ["hash_value"],
        },
    },
    {
        "name": "score_prompt",
        "description": "Score a prompt for prompt-injection / jailbreak / PII / secret-leak risk. Returns 0-100 score with detailed findings.",
        "inputSchema": {
            "type": "object",
            "properties": {"prompt": {"type": "string"}},
            "required": ["prompt"],
        },
    },
    {
        "name": "mutate_prompt",
        "description": "Generate adversarial variants of a prompt to test LLM defenses (defensive AI red-teaming).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "prompt": {"type": "string"},
                "techniques": {"type": "array", "items": {"type": "string"}, "description": "Optional subset of technique IDs"},
            },
            "required": ["prompt"],
        },
    },
    {
        "name": "analyze_phishing_email",
        "description": "Analyze an email body for phishing indicators: urgency, threats, brand spoofing, suspicious URLs, MFA fatigue.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "content": {"type": "string"},
                "sender": {"type": "string"},
                "urls": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["content"],
        },
    },
    {
        "name": "analyze_url",
        "description": "Analyze a URL for phishing red flags: homograph, suspicious TLD, IP-based, redirect-stuffing, brand impersonation.",
        "inputSchema": {
            "type": "object",
            "properties": {"url": {"type": "string"}},
            "required": ["url"],
        },
    },
    {
        "name": "lookalike_domains",
        "description": "Generate likely lookalike / typo-squat variants of a brand domain for defensive monitoring.",
        "inputSchema": {
            "type": "object",
            "properties": {"domain": {"type": "string"}},
            "required": ["domain"],
        },
    },
    {
        "name": "calculate_cvss",
        "description": "Calculate CVSS 3.1 base score from metric values (AV, AC, PR, UI, S, C, I, A).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "AV": {"type": "string", "enum": ["N", "A", "L", "P"]},
                "AC": {"type": "string", "enum": ["L", "H"]},
                "PR": {"type": "string", "enum": ["N", "L", "H"]},
                "UI": {"type": "string", "enum": ["N", "R"]},
                "S": {"type": "string", "enum": ["U", "C"]},
                "C": {"type": "string", "enum": ["N", "L", "H"]},
                "I": {"type": "string", "enum": ["N", "L", "H"]},
                "A": {"type": "string", "enum": ["N", "L", "H"]},
            },
            "required": ["AV", "AC", "PR", "UI", "S", "C", "I", "A"],
        },
    },
    {
        "name": "ai_security_analyst",
        "description": "Ask the SENTINEL-X security analyst knowledge base about a threat. Returns detection + mitigation + recommended tools.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "question": {"type": "string"},
                "context": {"type": "string", "enum": ["general", "offensive", "defensive"], "default": "general"},
            },
            "required": ["question"],
        },
    },
]


async def call_tool(name: str, args: dict) -> Any:
    """Dispatch tool name → service function."""
    from .services import scanner, payload_gen, password_lab, ai_redteam, phishing_sim, bug_bounty, ai_analyst

    if name == "port_scan":
        return await scanner.port_scan(args["target"])
    if name == "web_recon":
        return await scanner.web_recon(args["url"])
    if name == "payload_generate":
        pt = args["payload_type"]
        if pt == "reverse_shell":
            return payload_gen.reverse_shell(args.get("target_os", "linux"), args.get("lhost", "127.0.0.1"), args.get("lport", 4444))
        if pt == "xss":
            return payload_gen.generate_xss()
        if pt == "sqli":
            return payload_gen.generate_sqli()
        if pt == "lfi":
            return payload_gen.generate_lfi()
        if pt == "encode":
            return payload_gen.encode_payload(args.get("text", "id"))
    if name == "analyze_password":
        return password_lab.analyze_password(args["password"])
    if name == "crack_hash":
        return password_lab.crack_hash(args["hash_value"], args.get("hash_type", "md5"))
    if name == "score_prompt":
        return ai_redteam.score_prompt(args["prompt"])
    if name == "mutate_prompt":
        return ai_redteam.mutate_prompt(args["prompt"], args.get("techniques"))
    if name == "analyze_phishing_email":
        return phishing_sim.analyze_email(args["content"], args.get("sender", ""), args.get("urls"))
    if name == "analyze_url":
        return phishing_sim.analyze_url(args["url"])
    if name == "lookalike_domains":
        return {"domain": args["domain"], "lookalikes": phishing_sim.lookalike_domains(args["domain"])}
    if name == "calculate_cvss":
        return bug_bounty.calculate_cvss(args)
    if name == "ai_security_analyst":
        return ai_analyst.ask_analyst(args["question"], args.get("context", "general"))

    return {"error": f"unknown tool: {name}"}


# --- JSON-RPC over stdio ---

async def handle_request(req: dict) -> dict | None:
    method = req.get("method")
    rid = req.get("id")
    params = req.get("params", {}) or {}

    def reply(result):
        return {"jsonrpc": "2.0", "id": rid, "result": result}

    def error(code, msg):
        return {"jsonrpc": "2.0", "id": rid, "error": {"code": code, "message": msg}}

    if method == "initialize":
        return reply({
            "protocolVersion": PROTOCOL_VERSION,
            "capabilities": {"tools": {}},
            "serverInfo": SERVER_INFO,
        })

    if method == "notifications/initialized":
        return None  # notification, no reply

    if method == "tools/list":
        return reply({"tools": TOOLS})

    if method == "tools/call":
        name = params.get("name")
        args = params.get("arguments", {}) or {}
        try:
            result = await call_tool(name, args)
            return reply({
                "content": [{"type": "text", "text": json.dumps(result, indent=2, default=str)}],
            })
        except Exception as e:
            return error(-32000, f"tool execution failed: {e}")

    if method == "ping":
        return reply({})

    return error(-32601, f"method not found: {method}")


async def stdio_loop():
    """Read JSON-RPC messages from stdin, write responses to stdout."""
    loop = asyncio.get_event_loop()
    reader = asyncio.StreamReader()
    protocol = asyncio.StreamReaderProtocol(reader)
    await loop.connect_read_pipe(lambda: protocol, sys.stdin)

    while True:
        line = await reader.readline()
        if not line:
            break
        try:
            req = json.loads(line.decode("utf-8"))
        except json.JSONDecodeError:
            continue
        resp = await handle_request(req)
        if resp is not None:
            sys.stdout.write(json.dumps(resp) + "\n")
            sys.stdout.flush()


def main():
    asyncio.run(stdio_loop())


if __name__ == "__main__":
    main()
