# AgentOracle MCP Server

An MCP (Model Context Protocol) server that connects AI assistants like Claude, Cursor, and Windsurf to [AgentOracle](https://agentoracle.co) — a pay-per-query real-time research API for AI agents.

[![agentoracle-mcp MCP server](https://glama.ai/mcp/servers/TKCollective/agentoracle-mcp/badges/card.svg)](https://glama.ai/mcp/servers/TKCollective/agentoracle-mcp)

## What It Does

This MCP server exposes AgentOracle's research capabilities as tools that any MCP-compatible AI assistant can call:

| Tool | Description | Cost |
|------|-------------|------|
| `research` | Real-time research on any topic — returns structured JSON with summary, key facts, sources, and confidence score | $0.02 USDC |
| `deep-research` | Comprehensive deep analysis with expert-level findings, 10-15 detailed facts, and analysis paragraph | $0.10 USDC |
| `check-health` | Check if AgentOracle API is online with service status | Free |
| `get-manifest` | Get x402 payment manifest with pricing and endpoint details | Free |

Payments are handled via the [x402 protocol](https://github.com/coinbase/x402) on Base mainnet using USDC.

## Quick Start

### Install from npm

```bash
npm install -g agentoracle-mcp
```

### Or clone and build from source

```bash
git clone https://github.com/TKCollective/agentoracle-mcp.git
cd agentoracle-mcp
npm install
npm run build
```

## Usage with Claude Desktop

Add this to your Claude Desktop MCP config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

Or if installed globally:

```json
{
  "mcpServers": {
    "agentoracle": {
      "command": "agentoracle-mcp"
    }
  }
}
```

## Usage with Cursor

Add to your Cursor MCP settings:

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

## Example

Once connected, you can ask your AI assistant things like:

> "Use AgentOracle to research the latest DeFi protocol TVL rankings on Base"

The assistant will call the `research` tool and return structured results:

```json
{
  "query": "Latest DeFi protocol TVL rankings on Base",
  "tier": "standard",
  "result": {
    "summary": "As of March 2026, Base L2 DeFi TVL has reached...",
    "key_facts": [
      "Aerodrome leads Base DeFi with $3.2B TVL",
      "Aave v3 on Base holds $1.8B"
    ],
    "sources": ["https://defillama.com/..."],
    "confidence_score": 0.89
  },
  "confidence": {
    "score": 0.89,
    "level": "high",
    "sources_count": 6,
    "facts_count": 5
  },
  "freshness": "recent",
  "metadata": {
    "model": "sonar",
    "api_version": "1.3.0",
    "response_time_ms": 2100
  }
}
```

## How Payment Works

AgentOracle uses the x402 protocol for payments:

1. The MCP tool sends your query to AgentOracle
2. If no payment header is present, the API returns HTTP 402 with payment requirements
3. Use an [x402-compatible client](https://github.com/coinbase/x402) to sign a USDC payment on Base
4. Resubmit the request with the payment header to get full results

The free `check-health` and `get-manifest` tools work without any payment.

## Resources

The server also provides an embedded API documentation resource at `docs://agentoracle/api` that MCP clients can access for integration details.

## Tech Stack

- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk) — MCP server framework
- [AgentOracle API](https://agentoracle.co) — Real-time research powered by Perplexity Sonar
- [x402 Protocol](https://github.com/coinbase/x402) — HTTP-native payments by Coinbase
- [Zod](https://zod.dev) — Input validation

## Links

- **API**: [agentoracle.co](https://agentoracle.co)
- **x402 Manifest**: [agentoracle.co/.well-known/x402.json](https://agentoracle.co/.well-known/x402.json)
- **Twitter**: [@AgentOracle_AI](https://x.com/AgentOracle_AI)

## License

MIT