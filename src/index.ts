#!/usr/bin/env node
/**
 * AgentOracle MCP Server
 * Connects AI assistants (Claude, Cursor, etc.) to AgentOracle's
 * real-time research API via the Model Context Protocol.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const AGENTORACLE_API = "https://agentoracle.co";
const RESEARCH_ENDPOINT = `${AGENTORACLE_API}/research`;
const DEEP_RESEARCH_ENDPOINT = `${AGENTORACLE_API}/deep-research`;
const HEALTH_ENDPOINT = `${AGENTORACLE_API}/health`;
const MANIFEST_ENDPOINT = `${AGENTORACLE_API}/.well-known/x402.json`;

const server = new McpServer({
  name: "AgentOracle",
  version: "1.0.0",
});

server.tool(
  "research",
  "Perform real-time research on any topic using AgentOracle. Returns structured results with summary, key facts, cited sources, and confidence score. Costs $0.02 USDC per query via x402 on Base mainnet.",
  {
    query: z
      .string()
      .max(2000)
      .describe(
        "Natural language research question. Examples: 'What are the latest AI chip architectures?', 'Compare React vs Vue in 2026', 'Latest funding rounds in autonomous agents space'"
      ),
  },
  async ({ query }) => {
    try {
      const response = await fetch(RESEARCH_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (response.status === 402) {
        const paymentInfo = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "payment_required",
                  message: "This query requires a $0.02 USDC payment on Base mainnet via x402 protocol.",
                  instructions: "Use an x402-compatible client to sign a USDC payment and include it in the X-PAYMENT header.",
                  payment_details: paymentInfo,
                  endpoint: RESEARCH_ENDPOINT,
                  manifest: MANIFEST_ENDPOINT,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          content: [{ type: "text", text: `Research request failed (HTTP ${response.status}): ${JSON.stringify(errorData)}` }],
          isError: true,
        };
      }

      const data = await response.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error connecting to AgentOracle: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "deep-research",
  "Perform comprehensive deep research on any topic using AgentOracle Sonar Pro. Returns expert-level analysis with 10-15 detailed facts, in-depth analysis paragraph, cited sources, and confidence score. Costs $0.10 USDC per query via x402 on Base mainnet. Use for complex topics requiring thorough analysis.",
  {
    query: z
      .string()
      .max(4000)
      .describe(
        "Natural language research question for deep analysis. Examples: 'Comprehensive analysis of x402 protocol adoption and market impact', 'Detailed comparison of AI agent frameworks in 2026 with pros and cons'"
      ),
  },
  async ({ query }) => {
    try {
      const response = await fetch(DEEP_RESEARCH_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (response.status === 402) {
        const paymentInfo = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "payment_required",
                  message: "This deep research query requires a $0.10 USDC payment on Base mainnet via x402 protocol.",
                  instructions: "Use an x402-compatible client to sign a USDC payment and include it in the X-PAYMENT header.",
                  payment_details: paymentInfo,
                  endpoint: DEEP_RESEARCH_ENDPOINT,
                  manifest: MANIFEST_ENDPOINT,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          content: [{ type: "text", text: `Deep research request failed (HTTP ${response.status}): ${JSON.stringify(errorData)}` }],
          isError: true,
        };
      }

      const data = await response.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error connecting to AgentOracle: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "check-health",
  "Check if the AgentOracle API is online and get service status including uptime, model info, and pricing.",
  {},
  async () => {
    try {
      const response = await fetch(HEALTH_ENDPOINT);
      const data = await response.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `AgentOracle health check failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get-manifest",
  "Get the AgentOracle x402 payment manifest. Returns payment requirements, supported networks, pricing, and endpoint details for programmatic integration.",
  {},
  async () => {
    try {
      const response = await fetch(MANIFEST_ENDPOINT);
      const data = await response.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Failed to fetch x402 manifest: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }
);

server.resource(
  "api-docs",
  "docs://agentoracle/api",
  {
    description: "AgentOracle API documentation — endpoints, pricing, and integration guide",
    mimeType: "text/markdown",
  },
  async () => ({
    contents: [
      {
        uri: "docs://agentoracle/api",
        mimeType: "text/markdown",
        text: `# AgentOracle API Documentation

## Overview
AgentOracle is a pay-per-query research API for AI agents.
- **Standard Research:** $0.02 USDC per query (Perplexity Sonar)
- **Deep Research:** $0.10 USDC per query (Perplexity Sonar Pro)
- **Protocol:** x402 on Base mainnet (eip155:8453)

## Endpoints

### POST /research ($0.02)
Fast real-time research. Max 2000 char query.
Returns: summary, key_facts, sources, confidence_score

### POST /deep-research ($0.10)
Comprehensive expert analysis. Max 4000 char query.
Returns: summary, key_facts, analysis, sources, confidence_score

## Payment Flow (x402)
1. Agent sends POST to endpoint
2. Server returns HTTP 402 with payment requirements
3. Agent signs USDC payment on Base via x402 client SDK
4. Agent retries request with X-PAYMENT header
5. Server verifies payment and returns research results

## Other Endpoints
- GET /health — Service health check (free)
- GET /.well-known/x402.json — x402 discovery manifest (free)

## Links
- Website: https://agentoracle.co
- x402 Manifest:
