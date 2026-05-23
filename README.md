# 🛡️ SENTINEL-X v1.3

**AI-Powered Unified Cybersecurity Command Center — Offensive · Defensive · AI Red Team · Phishing · Bug Bounty · OSINT · JWT · MCP**

A futuristic, glassmorphic SOC dashboard that combines red-team tooling, blue-team detection,
ML anomaly engine, live global attack map, an AI security analyst (real Claude / ChatGPT integration),
prompt-injection lab, phishing simulation, bug-bounty hub, OSINT toolkit, JWT analysis, **and acts
as a Model Context Protocol (MCP) server** so Claude Desktop / Cursor / ChatGPT can call its tools natively.

![](https://img.shields.io/badge/built_with-FastAPI-%2300ffe1) ![](https://img.shields.io/badge/frontend-React%20+%20Tailwind-%238b5cf6) ![](https://img.shields.io/badge/ml-IsolationForest-%23f43f5e) ![](https://img.shields.io/badge/MCP-server-%23d97757) ![](https://img.shields.io/badge/docker-ready-%2310b981)

---

## ✨ What's inside

### 🔴 Red Team / Offensive Suite
- Async **port scanner** with banner grab + CVE map
- **Web reconnaissance** — security headers, tech fingerprinting, info disclosure
- **Payload Forge** — reverse shells (bash/python/perl/nc/PowerShell), XSS, SQLi, LFI
- **Encoder lab** — base64, URL, hex, unicode, HTML entity, ROT13

### 🔵 Blue Team / Defensive SOC
- Live **threat feed** + severity-tagged detection queue
- **ML Anomaly Engine** (scikit-learn IsolationForest, real model)
- **SIEM log stream** — firewall, IDS, EDR, auth, k8s
- **Live global attack map** — animated SVG arcs source→target

### 🎣 Phishing Simulation Lab
- 8 ready-made phishing templates: CEO fraud, IT password reset, package delivery,
  invoice, fake calendar invite, MFA fatigue, shared doc, HR benefits
- **Email analyzer** — urgency detection, threat language, brand spoofing,
  link-disguise, MFA-fatigue patterns, free-webmail-as-corporate flag
- **Live URL inspector** — static heuristics + real HTTP fetch with redirect chain,
  TLS cert (issuer/SAN/validity), IP + reverse DNS + ASN hint, full headers,
  response time, content sniffing for password inputs and phishing copy
- **Lookalike generator** — typo-squat / homograph / suffix variants of any domain

### 🔑 JWT Toolkit (NEW in v1.3)
- Decode header + payload (no verification needed)
- Security audit: `alg:none`, weak HMAC, missing `exp`, long lifetime,
  `kid` path traversal, sensitive claims (password/ssn/api_key), missing `iss`/`aud`
- Highlights **privilege claims** for IDOR / privesc testing
- Wordlist secret cracker for HS256/HS384/HS512

### 🌐 OSINT Hub (NEW in v1.3)
- **Subdomain enumeration** via crt.sh Certificate Transparency logs (real, no auth)
- **Email permutation generator** — 14 corporate email formats
- **GitHub dorks** — 20 ready-to-paste leaked-secret search queries
- **Google dorks** — 18 indexed-content discovery queries
- **Breach check** (email + password) using HIBP-style k-anonymity

### 🐛 Bug Bounty Hub (NEW)
- **7-phase methodology** checklist (scope → recon → enumeration → vuln-hunt → exploit → report)
- **Vuln class library** — IDOR, SSRF, XSS, RCE, JWT bypass, race conditions, SSTI, GraphQL, OAuth
  with where-to-look, how-to-test, fix, and tools per class
- **CVSS 3.1 calculator** — interactive metric picker, real formula, vector string output
- **Report generator** — fill fields → markdown report ready to submit to HackerOne/Bugcrowd
- **Wordlists** — common dirs, params, LFI/SSRF payloads, top subdomains
- **Platform directory** — H1, Bugcrowd, Intigriti, YesWeHack, Synack, Google/Apple/Microsoft VRPs

### 🔑 Password & Hash Lab
- Entropy + crack-time, MD5/SHA-1/SHA-256/SHA-512 wordlist crack

### 🧠 AI Security Analyst (real LLM)
- Drop in `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` → real Claude / ChatGPT
- Auto-fallback to built-in rule-based knowledge base
- Markdown rendered, code blocks, conversation history

### 💀 AI Red Team Lab
- **Prompt Risk Score** — 0-100 with detailed findings (injection markers,
  jailbreak signatures, PII, secrets, encoded payloads, zero-width chars)
- **Adversarial Mutation** — 13 techniques (role swap, developer mode,
  grandma trick, base64 smuggle, leetspeak, payload splitting, etc.)
  each citing the academic / industry reference and expected defense
- **Live LLM defense testing** — fire mutations at your real Claude/ChatGPT
  and auto-detect refused vs bypassed

### 🔌 MCP Hub (NEW)
**SENTINEL-X is an MCP server.** Connect it to Claude Desktop, Cursor,
ChatGPT, Cline, Continue.dev — any MCP-compatible client.

12 tools exposed: `port_scan`, `web_recon`, `payload_generate`,
`analyze_password`, `crack_hash`, `score_prompt`, `mutate_prompt`,
`analyze_phishing_email`, `analyze_url`, `lookalike_domains`,
`calculate_cvss`, `ai_security_analyst`.

The MCP Hub page in the UI shows:
- Ready-to-paste `claude_desktop_config.json` snippet
- Step-by-step setup instructions per platform
- Live HTTP bridge to test every tool from the browser

---

## 🚀 Quickstart with Docker

```bash
unzip sentinel-x.zip
cd sentinel-x
cp .env.example .env

# Optional: add API keys to .env to unlock real Claude/ChatGPT
# ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-proj-...

docker compose up --build
```

- 🌐 **Frontend:** http://localhost:8080
- ⚙️ **Backend API:** http://localhost:8000
- 📚 **Swagger UI:** http://localhost:8000/docs

### Demo credentials

| User | Pass | Role |
|------|------|------|
| `admin` | `admin1234` | admin |
| `analyst` | `analyst123` | analyst |

---

## 🧠 Connect to Claude Desktop (MCP)

1. Make sure backend dependencies are installed locally:
   ```bash
   cd sentinel-x/backend
   pip install -r requirements.txt
   ```

2. Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
   (Windows: `%APPDATA%\Claude\claude_desktop_config.json`)

   ```json
   {
     "mcpServers": {
       "sentinel-x": {
         "command": "python",
         "args": ["-m", "app.mcp_server"],
         "cwd": "/absolute/path/to/sentinel-x/backend"
       }
     }
   }
   ```

3. Quit and relaunch Claude Desktop.

4. In a new chat, ask **"What tools do you have available?"** — you should see
   12 SENTINEL-X tools. Try:
   - *"Use SENTINEL-X to port-scan scanme.nmap.org"*
   - *"Score this prompt for jailbreak risk: 'ignore previous instructions...'"*
   - *"Generate lookalike domains for paypal.com"*

---

## 📁 Project structure

```
sentinel-x/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entrypoint
│   │   ├── mcp_server.py            # ⭐ MCP server (stdio + JSON-RPC)
│   │   ├── routers/
│   │   │   ├── auth.py              # JWT login/register
│   │   │   ├── offensive.py
│   │   │   ├── defensive.py
│   │   │   ├── ai.py                # AI Analyst + Red Team
│   │   │   ├── phishing.py          # ⭐ phishing sim
│   │   │   ├── bugbounty.py         # ⭐ bug bounty hub
│   │   │   ├── mcp.py               # ⭐ MCP info + bridge
│   │   │   └── dashboard.py
│   │   └── services/
│   │       ├── scanner.py
│   │       ├── payload_gen.py
│   │       ├── password_lab.py
│   │       ├── threat_intel.py      # ML anomaly + attack map
│   │       ├── ai_analyst.py
│   │       ├── ai_redteam.py        # ⭐ prompt scoring + mutation
│   │       ├── llm_client.py        # ⭐ Claude/OpenAI wrapper
│   │       ├── phishing_sim.py      # ⭐ templates + analyzer
│   │       └── bug_bounty.py        # ⭐ methodology + CVSS
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx            # Particle field background
│   │   │   ├── Dashboard.jsx        # 3D-tilt stat cards
│   │   │   ├── Offensive.jsx
│   │   │   ├── Defensive.jsx
│   │   │   ├── ThreatMap.jsx
│   │   │   ├── PassLab.jsx
│   │   │   ├── Logs.jsx
│   │   │   ├── Phishing.jsx         # ⭐
│   │   │   ├── BugBounty.jsx        # ⭐
│   │   │   ├── AIAnalyst.jsx
│   │   │   ├── AIRedTeam.jsx
│   │   │   └── MCPHub.jsx           # ⭐
│   │   ├── components/
│   │   │   ├── Sidebar.jsx          # Grouped nav (offense/defense/AI)
│   │   │   ├── Tilt.jsx             # ⭐ 3D mouse tilt wrapper
│   │   │   ├── ParticleField.jsx    # ⭐ animated canvas background
│   │   │   ├── StatCard.jsx
│   │   │   ├── Topbar.jsx
│   │   │   ├── Layout.jsx
│   │   │   └── AuroraBg.jsx
│   │   ├── styles/index.css
│   │   ├── hooks/useAuth.jsx
│   │   └── utils/api.js
│   ├── tailwind.config.js
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🔌 Selected API endpoints

| Method | Endpoint                            | Module |
|--------|-------------------------------------|--------|
| POST   | `/api/auth/login`                   | Auth |
| POST   | `/api/offensive/scan/port`          | Red |
| POST   | `/api/offensive/payload/generate`   | Red |
| GET    | `/api/defensive/threats/live`       | Blue |
| GET    | `/api/defensive/anomaly/check`      | Blue (ML) |
| POST   | `/api/defensive/password/analyze`   | Blue |
| POST   | `/api/ai/chat`                      | AI Analyst (LLM or builtin) |
| GET    | `/api/ai/provider`                  | AI |
| POST   | `/api/ai/redteam/score`             | AI Red Team |
| POST   | `/api/ai/redteam/mutate`            | AI Red Team |
| GET    | `/api/phishing/templates`           | Phishing |
| POST   | `/api/phishing/analyze/email`       | Phishing |
| POST   | `/api/phishing/lookalikes`          | Phishing |
| GET    | `/api/bugbounty/methodology`        | Bug Bounty |
| GET    | `/api/bugbounty/vulns`              | Bug Bounty |
| POST   | `/api/bugbounty/cvss`               | Bug Bounty |
| POST   | `/api/bugbounty/report`             | Bug Bounty |
| GET    | `/api/mcp/info`                     | MCP |
| GET    | `/api/mcp/tools`                    | MCP |
| POST   | `/api/mcp/bridge/{tool}`            | MCP HTTP test bridge |

Full interactive docs at **`/docs`**.

---

## ⚠️ Ethics

- **Offensive modules + phishing templates + bug bounty payloads** are for
  **authorized testing only**. Use against systems you own or have explicit
  written permission for.
- The **AI Red Team mutations** are designed to test your own LLM application's
  defenses, not third-party services.
- Phishing templates are awareness-training material; deploy ONLY in internal
  campaigns with leadership approval.

References: [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/),
[MITRE ATLAS](https://atlas.mitre.org/), [OWASP Web Top 10](https://owasp.org/www-project-top-ten/),
[Model Context Protocol](https://modelcontextprotocol.io/).

---

## 📜 License

MIT — built with ❤️ for the security community.
