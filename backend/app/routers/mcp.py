"""MCP Hub endpoints — expose tools list + connection info to UI."""
from fastapi import APIRouter
from .. import mcp_server

router = APIRouter(prefix="/api/mcp", tags=["mcp"])


@router.get("/info")
async def info():
    return {
        "server_name": mcp_server.SERVER_INFO["name"],
        "version": mcp_server.SERVER_INFO["version"],
        "protocol": mcp_server.PROTOCOL_VERSION,
        "tools_count": len(mcp_server.TOOLS),
        "transport": ["stdio", "http_bridge"],
    }


@router.get("/tools")
async def list_tools():
    return {"tools": mcp_server.TOOLS}


@router.get("/config/claude-desktop")
async def claude_desktop_config():
    """Return ready-to-paste Claude Desktop config snippet."""
    return {
        "config": {
            "mcpServers": {
                "sentinel-x": {
                    "command": "python",
                    "args": ["-m", "app.mcp_server"],
                    "cwd": "/path/to/sentinel-x/backend",
                }
            }
        },
        "config_path_macos": "~/Library/Application Support/Claude/claude_desktop_config.json",
        "config_path_windows": "%APPDATA%\\Claude\\claude_desktop_config.json",
        "instructions": [
            "1. Locate your Claude Desktop config file (path above).",
            "2. Add the sentinel-x entry under 'mcpServers' (merge with existing if present).",
            "3. Update 'cwd' to your absolute path to sentinel-x/backend.",
            "4. Make sure 'pip install -r requirements.txt' has been run in that directory.",
            "5. Fully quit and relaunch Claude Desktop.",
            "6. In a new chat, ask: 'List the tools you have available.' You should see 12 sentinel-x tools.",
        ],
    }


@router.post("/bridge/{tool_name}")
async def http_bridge(tool_name: str, args: dict):
    """HTTP bridge for testing MCP tools without an MCP client.

    Same tools as the MCP server, but callable via plain JSON over HTTP.
    """
    try:
        result = await mcp_server.call_tool(tool_name, args)
        return {"tool": tool_name, "result": result}
    except Exception as e:
        return {"tool": tool_name, "error": str(e)}
