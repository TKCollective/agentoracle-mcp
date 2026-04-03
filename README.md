# AgentOracle MCP Server

MCP server that connects AI assistants (Claude, Cursor, Windsurf, etc.) to [AgentOracle](https://agentoracle.co) — a pay-per-query research API for AI agents via the x402 protocol.

## Tools

| Tool | Description | Cost |
|------|-------------|------|
| `research` | Real-time web research on any topic. Returns summary, key facts, sources, confidence score. | $0.02 USDC |
| `deep-research` | Comprehensive expert-level analysis. Returns detailed findings with in-depth analysis. | $0.10 USDC |
| `check-health` | Check if AgentOracle API is online and get service status. | Free |
| `get-manifest` | Get the x402 payment manifest for programmatic integration. | Free |

## Resources

| Resource | Description |
|----------|-------------|
| `docs://agentoracle/api` | Full API documentation with endpoints, pricing, and integration guide |

## Install via Smithery

```bash
npx @smithery/cli install agentoracle-mcp
```

## Install Manually

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "agentoracle": {
      "command": "npx",
      "args": ["agentoracle-mcp"]
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "agentoracle": {
      "command": "npx",
      "args": ["agentoracle-mcp"]
    }
  }
}
```

## How It Works

1. Your AI assistant calls the `research` or `deep-research` tool with a question
2. The MCP server sends the query to AgentOracle's API
3. AgentOracle returns structured JSON with real-time research results
4. Payment is handled via the x402 protocol — $0.02 or $0.10 USDC on Base mainnet

## Response Format

### Standard Research
```json
{
  "query": "What are the latest AI agent frameworks?",
  "result": {
    "summary": "Concise summary of findings",
    "key_facts": ["Fact 1", "Fact 2", "Fact 3"],
    "sources": ["https://source1.com", "https://source2.com"],
    "confidence_score": 0.92
  }
}
```

### Deep Research
```json
{
  "query": "Comprehensive analysis of x402 protocol adoption",
  "tier": "deep",
  "result": {
    "summary": "Detailed 2-3 paragraph summary",
    "key_facts": ["10-15 detailed facts..."],
    "analysis": "Expert analysis paragraph",
    "sources": ["https://source1.com"],
    "confidence_score": 0.95
  }
}
```

## Links

- **API**: https://agentoracle.co
- **x402 Manifest**: https://agentoracle.co/.well-known/x402.json
- **Health Check**: https://agentoracle.co/health
- **Twitter**: [@AgentOracle_AI](https://x.com/AgentOracle_AI)

## License

MIT
