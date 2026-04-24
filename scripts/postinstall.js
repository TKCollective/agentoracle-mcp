#!/usr/bin/env node
// Postinstall welcome message for agentoracle-mcp
// Skipped silently in CI and when the user opts out via env var.

if (process.env.CI || process.env.AGENTORACLE_NO_POSTINSTALL || process.env.npm_config_loglevel === 'silent') {
  process.exit(0);
}

// Detect TTY — don't spam logs in headless installs (Docker layers, etc.)
if (!process.stdout.isTTY && !process.env.AGENTORACLE_FORCE_POSTINSTALL) {
  process.exit(0);
}

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';

const lines = [
  '',
  `${GREEN}${BOLD}  AgentOracle MCP ready.${RESET}`,
  '',
  `${BOLD}  Try asking Claude:${RESET}`,
  `    ${CYAN}"Verify this claim: Bitcoin was created by Elon Musk."${RESET}`,
  '',
  `${BOLD}  Free playground:${RESET} ${CYAN}https://agentoracle.co${RESET}`,
  `${DIM}  Docs: https://github.com/TKCollective/agentoracle-mcp${RESET}`,
  '',
];

console.log(lines.join('\n'));
