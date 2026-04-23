# agentoracle-mcp

**Add trust verification to Claude, Cursor, Windsurf, or any MCP client 
in 60 seconds.**

AgentOracle verifies claims before your agent acts on them. Per-claim 
confidence scores, ACT/VERIFY/REJECT recommendations, and 4-source 
verification — available as an MCP tool with one command.

---

## Install

```bash
npx agentoracle-mcp
```

That's it. No API keys. No accounts. No wallet setup required to start.

---

## Add to Claude Desktop

Open your Claude Desktop config file:

**Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add this:

```json
{
  "mcpServers": {
    "agentoracle": {
      "command": "npx",
      "args": ["-y", "agentoracle-mcp"]
    }
  }
}
```

Restart Claude Desktop. You now have trust verification as a tool.

---

## Add to Cursor

Open Cursor Settings → MCP → Add Server:

```json
{
  "agentoracle": {
    "command": "npx",
    "args": ["-y", "agentoracle-mcp"]
  }
}
```

---

## Add to Windsurf

Open Windsurf Settings → MCP Servers → Add:

```json
{
  "agentoracle": {
    "command": "npx",
    "args": ["-y", "agentoracle-mcp"]
  }
}
```

---

## What you can do once installed

Ask Claude, Cursor, or any MCP client:

- *"Verify these claims before I include them in my report"*
- *"Is it true that OpenAI acquired Anthropic in 2026?"*
- *"Research AI agent frameworks and tell me what confidence score each claim gets"*
- *"Fact-check this paragraph before I publish it"*

AgentOracle breaks the input into individual claims, runs each one through 
4 independent sources, and returns a confidence score and verdict for every 
single claim.

---

## What comes back

```json
{
  "overall_confidence": 0.91,
  "recommendation": "act",
  "claims": [
    {
      "claim": "LangGraph leads agent frameworks in 2026",
      "verdict": "supported",
      "confidence": 0.94,
      "evidence": "Confirmed across 4 independent sources"
    },
    {
      "claim": "OpenAI acquired Anthropic in early 2026",
      "verdict": "refuted",
      "confidence": 0.04,
      "correction": "Anthropic remains independent as of April 2026"
    }
  ]
}
```

---

## How verification works

Every claim runs through 4 sources in parallel:

1. **Sonar** — real-time web research
2. **Sonar Pro** — deep multi-step analysis
3. **Adversarial** — actively tries to disprove the claim
4. **Gemma 4** — claim decomposition and confidence calibration

Consensus builds the score. Contradiction flags the risk.

| Score | Recommendation | Meaning |
|-------|---------------|---------|
| > 0.8 | `act` | Claims verified — proceed |
| 0.5–0.8 | `verify` | Uncertain — needs review |
| < 0.5 | `reject` | Contradicted — discard |

---

## Pricing

| Endpoint | Price | What it does |
|----------|-------|-------------|
| `/preview` | Free | 20 req/hr, no payment needed |
| `/evaluate` | $0.01/claim | Full per-claim verification |
| `/research` | $0.02/query | Real-time research + verification |

Payments via [x402 protocol](https://x402.org) — USDC on Base, SKALE 
(gasless), or Stellar. No subscriptions. No minimums.

The free `/preview` endpoint works with no wallet or setup. 
Use it to try before you pay.

---

## Try it now without installing anything

```bash
curl -X POST https://agentoracle.co/preview \
  -H "Content-Type: application/json" \
  -d '{"query": "OpenAI acquired Anthropic in 2026"}'
```

---

## Related

- [agentoracle.co](https://agentoracle.co) — main site + live demo
- [Trust Layer docs](https://agentoracle.co/trust) — full API reference
- [langchain-agentoracle](https://github.com/TKCollective/langchain-agentoracle) — LangChain integration
- [crewai-agentoracle](https://github.com/TKCollective/crewai-agentoracle) — CrewAI integration
- [x402 manifest](https://agentoracle.co/.well-known/x402.json) — agent-native pricing discovery

---

Built by [TK Collective](https://agentoracle.co) · x402 native · Base · SKALE · Stellar

## Discovery

`agentoracle-mcp` is listed on independent x402 discovery directories:

- **[Decixa](https://decixa.ai)** — Auto-indexed x402 directory with live probe verification. AgentOracle is classified under **Analyze** with tags *Verification, Data Enrichment*. View listings:
  - [Research](https://decixa.ai/apis/e51015a6-b977-43e8-876d-e5f6bdaad92d) — $0.02/call
  - [Deep Research](https://decixa.ai/apis/0fc0fd3a-ffb4-494e-b00f-4ec9a13c33ca) — $0.10/call
  - [Evaluate](https://decixa.ai/apis/11abb2ea-da04-42aa-a0da-5d07a6e36255) — free during beta
- **[Glama](https://glama.ai/mcp/servers/TKCollective/agentoracle-mcp)** — Curated MCP directory

Future versions of `agentoracle-mcp` will use Decixa's `/api/agent/resolve` as primary capability discovery with a local fallback — letting agents find the best-matching x402 endpoint by intent rather than hardcoded URLs.

