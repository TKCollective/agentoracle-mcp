#!/usr/bin/env node
/**
 * AgentOracle MCP Server — x402 Paid Research Tools
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Connects AI assistants (Claude, Cursor, etc.) to AgentOracle's
 * real-time research API via the Model Context Protocol.
 *
 * x402 Payment Integration:
 *   When a wallet private key is provided, the MCP server uses
 *   @x402/fetch to automatically handle x402 payment flows.
 *   The agent's wallet signs USDC payments transparently on
 *   Base mainnet or SKALE (gasless).
 *
 * Setup in Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "agentoracle": {
 *         "command": "npx",
 *         "args": ["agentoracle-mcp"],
 *         "env": {
 *           "AGENTORACLE_WALLET_PRIVATE_KEY": "0x..."
 *         }
 *       }
 *     }
 *   }
 *
 * Without a wallet key, the server still works — it returns
 * x402 payment instructions so the caller can handle payment
 * through their own x402 client.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ── x402 Payment Imports ──────────────────────────────────────────
// These are optional — if the packages aren't installed, the server
// falls back to returning 402 payment instructions.
let paidFetch: typeof fetch | null = null;
let walletConfigured = false;

async function initX402(): Promise<void> {
  const privKey = process.env.AGENTORACLE_WALLET_PRIVATE_KEY;
  if (!privKey) {
    console.error(
      "No wallet key — x402 auto-pay disabled. Set AGENTORACLE_WALLET_PRIVATE_KEY to enable."
    );
    return;
  }

  try {
    const { wrapFetchWithPayment } = await import("@x402/fetch");
    const { x402Client } = await import("@x402/core/client");
    const { registerExactEvmScheme } = await import(
      "@x402/evm/exact/client"
    );
    const { privateKeyToAccount } = await import("viem/accounts");

    const account = privateKeyToAccount(privKey as `0x${string}`);
    const client = new x402Client();
    registerExactEvmScheme(client, { signer: account });
    paidFetch = wrapFetchWithPayment(fetch, client);
    walletConfigured = true;
    console.error(
      `x402 auto-pay enabled — wallet ${account.address.slice(0, 6)}...${account.address.slice(-4)}`
    );
  } catch (err) {
    console.error(
      "x402 SDK not installed — run: npm i @x402/fetch @x402/core @x402/evm viem"
    );
    console.error("Falling back to manual payment instructions.");
  }
}

// ── Constants ─────────────────────────────────────────────────────
const AGENTORACLE_API = "https://agentoracle.co";
const RESEARCH_ENDPOINT = `${AGENTORACLE_API}/research`;
const DEEP_RESEARCH_ENDPOINT = `${AGENTORACLE_API}/deep-research`;
const PREVIEW_ENDPOINT = `${AGENTORACLE_API}/preview`;
const BATCH_ENDPOINT = `${AGENTORACLE_API}/research/batch`;
const EVALUATE_ENDPOINT = `${AGENTORACLE_API}/evaluate`;
const HEALTH_ENDPOINT = `${AGENTORACLE_API}/health`;
const MANIFEST_ENDPOINT = `${AGENTORACLE_API}/.well-known/x402-manifest.json`;

// ── Decixa Discovery ──────────────────────────────────────────────
// Decixa indexes x402 endpoints across the ecosystem. We use their
// /api/agent/resolve as primary multi-provider discovery, with a
// local registry as fallback if Decixa is unreachable.
const DECIXA_RESOLVE_ENDPOINT = "https://api.decixa.ai/api/agent/resolve";

// Hardening parameters — tunable via env for ops flexibility
const DECIXA_TIMEOUT_MS = parseInt(
  process.env.DECIXA_RESOLVE_TIMEOUT_MS || "4000",
  10
);
const DECIXA_MAX_RETRIES = parseInt(
  process.env.DECIXA_RESOLVE_MAX_RETRIES || "2",
  10
);
const DECIXA_RETRY_BASE_MS = parseInt(
  process.env.DECIXA_RESOLVE_RETRY_BASE_MS || "250",
  10
);

const DECIXA_CAPABILITIES = [
  "search",
  "extract",
  "transform",
  "analyze",
  "generate",
  "modify",
  "communicate",
  "transact",
  "store",
] as const;

// Local fallback registry — AgentOracle's own offerings, used if
// Decixa is unreachable. Mirrors Decixa's response shape for
// consistent downstream handling.
const LOCAL_FALLBACK_REGISTRY: Record<string, any> = {
  analyze: {
    id: "local-agentoracle-research",
    name: "AgentOracle — Research",
    endpoint: RESEARCH_ENDPOINT,
    capability: "Analyze",
    tags: ["Verification", "Data Enrichment"],
    pricing: { model: "per_call", usdc_per_call: 0.02 },
    latency_tier: "medium",
    agent_ready: true,
    source: "local_fallback",
  },
  search: {
    id: "local-agentoracle-research-search",
    name: "AgentOracle — Research",
    endpoint: RESEARCH_ENDPOINT,
    capability: "Search",
    tags: ["Verification", "Live Web"],
    pricing: { model: "per_call", usdc_per_call: 0.02 },
    latency_tier: "medium",
    agent_ready: true,
    source: "local_fallback",
  },
};

// Use paidFetch if available, otherwise standard fetch
function getFetch(): typeof fetch {
  return paidFetch || fetch;
}

// ── MCP Server ────────────────────────────────────────────────────
const server = new McpServer({
  name: "AgentOracle",
  version: "2.1.1",
});

// ── Tool: preview (FREE) ─────────────────────────────────────────
server.tool(
  "preview",
  "Free research preview — get a quick summary, 2 key facts, and confidence score for any query. No payment required. Use this to test queries before committing to a paid research call. Rate limited to 10/hour.",
  {
    query: z
      .string()
      .max(2000)
      .describe("Natural language research question"),
  },
  async ({ query }) => {
    try {
      const response = await fetch(PREVIEW_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return {
          content: [
            {
              type: "text" as const,
              text: `Preview failed (HTTP ${response.status}): ${JSON.stringify(err)}`,
            },
          ],
          isError: true,
        };
      }

      const data = await response.json();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool: research ($0.02 USDC) ──────────────────────────────────
server.tool(
  "research",
  "Real-time research on any topic. Returns structured JSON with summary, key facts, cited sources, and confidence score. Costs $0.02 USDC via x402 (Base or SKALE gasless). If a wallet is configured, payment is handled automatically.",
  {
    query: z
      .string()
      .max(2000)
      .describe(
        "Natural language research question. Examples: 'Latest AI chip architectures', 'Compare React vs Vue in 2026'"
      ),
  },
  async ({ query }) => {
    try {
      const f = getFetch();
      const response = await f(RESEARCH_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      // If 402 and no auto-pay, return payment instructions
      if (response.status === 402 && !walletConfigured) {
        const paymentInfo = await response.json();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  status: "payment_required",
                  message:
                    "This query requires $0.02 USDC via x402. Configure AGENTORACLE_WALLET_PRIVATE_KEY for auto-pay, or use an x402 client.",
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
        const err = await response.json().catch(() => ({}));
        return {
          content: [
            {
              type: "text" as const,
              text: `Research failed (HTTP ${response.status}): ${JSON.stringify(err)}`,
            },
          ],
          isError: true,
        };
      }

      const data = await response.json();

      // Include payment receipt if available
      const paymentResponse = response.headers.get("payment-response");
      if (paymentResponse) {
        data._payment = {
          status: "settled",
          receipt: paymentResponse,
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool: deep-research ($0.10 USDC) ─────────────────────────────
server.tool(
  "deep-research",
  "Comprehensive deep research using Sonar Pro. Returns expert-level analysis with 10-15 detailed facts, in-depth synthesis, cited sources, and confidence score. Costs $0.10 USDC via x402. Use for complex topics requiring thorough analysis.",
  {
    query: z
      .string()
      .max(4000)
      .describe(
        "Research question for deep analysis. Examples: 'Comprehensive analysis of x402 protocol adoption', 'Detailed comparison of AI agent frameworks'"
      ),
  },
  async ({ query }) => {
    try {
      const f = getFetch();
      const response = await f(DEEP_RESEARCH_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (response.status === 402 && !walletConfigured) {
        const paymentInfo = await response.json();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  status: "payment_required",
                  message:
                    "Deep research requires $0.10 USDC via x402. Configure AGENTORACLE_WALLET_PRIVATE_KEY for auto-pay.",
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
        const err = await response.json().catch(() => ({}));
        return {
          content: [
            {
              type: "text" as const,
              text: `Deep research failed (HTTP ${response.status}): ${JSON.stringify(err)}`,
            },
          ],
          isError: true,
        };
      }

      const data = await response.json();
      const paymentResponse = response.headers.get("payment-response");
      if (paymentResponse) {
        data._payment = { status: "settled", receipt: paymentResponse };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool: batch-research ($0.10 USDC for up to 5 queries) ────────
server.tool(
  "batch-research",
  "Batch research — submit up to 5 queries in one call, processed in parallel. Costs $0.10 USDC total via x402. More efficient than individual research calls for multi-topic analysis.",
  {
    queries: z
      .array(z.string().max(2000))
      .min(1)
      .max(5)
      .describe("Array of 1-5 natural language research questions"),
  },
  async ({ queries }) => {
    try {
      const f = getFetch();
      const response = await f(BATCH_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries }),
      });

      if (response.status === 402 && !walletConfigured) {
        const paymentInfo = await response.json();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  status: "payment_required",
                  message:
                    "Batch research requires $0.10 USDC via x402 for up to 5 queries.",
                  payment_details: paymentInfo,
                  endpoint: BATCH_ENDPOINT,
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
        const err = await response.json().catch(() => ({}));
        return {
          content: [
            {
              type: "text" as const,
              text: `Batch research failed (HTTP ${response.status}): ${JSON.stringify(err)}`,
            },
          ],
          isError: true,
        };
      }

      const data = await response.json();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool: check-health (FREE) ────────────────────────────────────
server.tool(
  "check-health",
  "Check if AgentOracle API is online. Returns service status, uptime, pricing, supported networks, and feature flags.",
  {},
  async () => {
    try {
      const response = await fetch(HEALTH_ENDPOINT);
      const data = await response.json();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool: resolve (FREE) ─────────────────────────────────────────
// Multi-provider discovery via Decixa, with local fallback.
server.tool(
  "resolve",
  "Discover the best x402 API endpoint for a given capability + intent. Uses Decixa's /api/agent/resolve as primary multi-provider discovery, with a local AgentOracle registry as fallback. Returns the recommended endpoint plus top alternatives, ranked by latency, price, and tag match. Free, no payment required.",
  {
    capability: z
      .enum(DECIXA_CAPABILITIES)
      .describe(
        "Verb-based capability: one of search / extract / transform / analyze / generate / modify / communicate / transact / store"
      ),
    intent: z
      .string()
      .max(500)
      .describe(
        "Natural-language description of the task. Example: 'verify a factual claim before acting'"
      ),
    budget: z
      .number()
      .optional()
      .describe("Optional: maximum USDC per call"),
    latency: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("Optional: preferred latency tier"),
  },
  async ({ capability, intent, budget, latency }) => {
    const constraints: Record<string, any> = {};
    if (typeof budget === "number") constraints.budget = budget;
    if (latency) constraints.latency = latency;

    // Primary: Decixa — with timeout + retry for transient failures.
    // We retry on: network errors, AbortErrors (timeouts), and 5xx.
    // We do NOT retry on: 4xx (these are deterministic — bad input,
    // auth, not-found — retrying wastes time).
    const requestBody = JSON.stringify({
      capability: capability.toLowerCase(),
      intent,
      constraints,
    });

    const maxAttempts = Math.max(1, DECIXA_MAX_RETRIES + 1);
    let lastErrorDetail = "";
    let lastStatus = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DECIXA_TIMEOUT_MS);
      try {
        const response = await fetch(DECIXA_RESOLVE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.ok) {
          const data = await response.json();
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    ...data,
                    discovery_source: "decixa",
                    discovery_attempts: attempt,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        lastStatus = response.status;
        lastErrorDetail = `HTTP ${response.status}`;

        // Do not retry on 4xx — client error, deterministic
        if (response.status >= 400 && response.status < 500) {
          console.error(
            `[resolve] Decixa returned ${response.status} (non-retryable), using local fallback`
          );
          break;
        }

        // 5xx — fall through to retry loop
        console.error(
          `[resolve] Decixa returned ${response.status} on attempt ${attempt}/${maxAttempts}`
        );
      } catch (err) {
        clearTimeout(timer);
        const name =
          err instanceof Error ? err.name : "UnknownError";
        const msg =
          err instanceof Error ? err.message : String(err);
        lastErrorDetail = `${name}: ${msg}`;
        const isTimeout = name === "AbortError" || /abort/i.test(msg);
        console.error(
          `[resolve] Decixa ${isTimeout ? "timed out" : "error"} on attempt ${attempt}/${maxAttempts}: ${msg}`
        );
      }

      // Backoff before next attempt (skip after last)
      if (attempt < maxAttempts) {
        const delay =
          DECIXA_RETRY_BASE_MS * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    console.error(
      `[resolve] Decixa failed after ${maxAttempts} attempt(s) (${lastErrorDetail}), using local fallback`
    );

    // Fallback: local registry
    const local = LOCAL_FALLBACK_REGISTRY[capability.toLowerCase()];
    if (local) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                recommended: local,
                alternatives: [],
                is_fallback: true,
                strict_match_count: 1,
                fallback_match_count: 0,
                ranking_basis: "local_registry",
                discovery_source: "local_fallback",
                discovery_attempts: maxAttempts,
                discovery_error: lastErrorDetail || "Decixa unreachable",
                note:
                  "Decixa discovery was unreachable after retries — returned local AgentOracle registry entry only.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              recommended: null,
              alternatives: [],
              is_fallback: true,
              discovery_source: "local_fallback",
              error: `No local registry entry for capability '${capability}' and Decixa unreachable.`,
              suggestion:
                "Try capability='analyze' or 'search' — AgentOracle's primary classification.",
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
);

// ── Tool: get-manifest (FREE) ────────────────────────────────────
server.tool(
  "get-manifest",
  "Get the x402 payment manifest. Returns payment requirements, supported networks (Base + SKALE), pricing tiers, and endpoint details for programmatic integration.",
  {},
  async () => {
    try {
      const response = await fetch(MANIFEST_ENDPOINT);
      const data = await response.json();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch manifest: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Resource: API docs ────────────────────────────────────────────
server.resource(
  "api-docs",
  "docs://agentoracle/api",
  {
    description:
      "AgentOracle API documentation — endpoints, pricing, x402 payment flow, and integration guide",
    mimeType: "text/markdown",
  },
  async () => ({
    contents: [
      {
        uri: "docs://agentoracle/api",
        mimeType: "text/markdown",
        text: `# AgentOracle API Documentation

## Overview
AgentOracle is a pay-per-query research API for AI agents using x402 protocol.
No API keys. No accounts. Just pay with USDC.

## Pricing
| Endpoint | Price | Model |
|----------|-------|-------|
| POST /preview | FREE | Sonar |
| POST /research | $0.02 USDC | Sonar |
| POST /deep-research | $0.10 USDC | Sonar Pro |
| POST /research/batch | $0.10 USDC (up to 5) | Sonar |

## Networks
- **Base mainnet** (eip155:8453) — standard USDC
- **SKALE** (eip155:1187947933) — gasless, zero gas fees

## x402 Payment Flow
1. Agent sends POST to paid endpoint
2. Server returns HTTP 402 with payment requirements in PAYMENT-REQUIRED header
3. Agent signs gasless USDC transfer via x402 client SDK
4. Agent retries request with PAYMENT-SIGNATURE header
5. Server verifies payment via facilitator, settles on-chain
6. Server returns research results + PAYMENT-RESPONSE receipt

## MCP Auto-Pay
When AGENTORACLE_WALLET_PRIVATE_KEY is set, this MCP server uses @x402/fetch
to handle the entire payment flow automatically. The agent just calls the tool
and gets results — payment happens transparently.

## Discovery
- x402 manifest: https://agentoracle.co/.well-known/x402-manifest.json
- Health check: https://agentoracle.co/health
- Website: https://agentoracle.co
- GitHub: https://github.com/TKCollective/x402-research-skill
`,
      },
    ],
  })
);

// ── Start server ──────────────────────────────────────────────────
async function main(): Promise<void> {
  // Initialize x402 payment client (if wallet key provided)
  await initX402();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `AgentOracle MCP Server v2.1.1 running on stdio (x402 auto-pay: ${walletConfigured ? "enabled" : "disabled"})`
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
