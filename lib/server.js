#!/usr/bin/env node

/**
 * Minimal MCP Server for Pulsar editor
 * Spawned by Claude CLI, communicates via stdio (JSON-RPC 2.0)
 *
 * This file is executed as a standalone process by Claude CLI.
 * It connects to the HTTP bridge running inside Pulsar to execute tools.
 *
 * Environment variables:
 *   PULSAR_BRIDGE_PORT - Port of the bridge server (default: 3000)
 *   PULSAR_BRIDGE_HOST - Host of the bridge server (default: 127.0.0.1)
 */

const readline = require("readline");

const BRIDGE_PORT = parseInt(process.env.PULSAR_BRIDGE_PORT || "3000", 10);
const BRIDGE_HOST = process.env.PULSAR_BRIDGE_HOST || "127.0.0.1";

/**
 * Call the Pulsar bridge HTTP server to execute a tool
 */
async function callBridge(toolName, args) {
  const url = `http://${BRIDGE_HOST}:${BRIDGE_PORT}/tools/${toolName}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || `Tool call failed: ${toolName}`);
  }

  return result.data;
}

/**
 * Check if the bridge is available
 */
async function checkBridge() {
  try {
    const response = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_PORT}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch tools list from the bridge (includes external tools)
 */
async function fetchToolsFromBridge() {
  const response = await fetch(`http://${BRIDGE_HOST}:${BRIDGE_PORT}/tools`);
  if (!response.ok) {
    throw new Error("Failed to fetch tools from bridge");
  }
  const data = await response.json();
  return data.tools || [];
}

/**
 * Send JSON-RPC response to stdout
 */
function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

/**
 * Handle incoming JSON-RPC request
 */
async function handleRequest(req) {
  const { method, params } = req;

  // Initialize handshake
  if (method === "initialize") {
    return {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "pulsar", version: "0.1.0" },
    };
  }

  // List available tools (fetch from bridge to include external tools)
  if (method === "tools/list") {
    const bridgeAvailable = await checkBridge();
    if (!bridgeAvailable) {
      throw {
        code: -32603,
        message:
          `Pulsar bridge not available at http://${BRIDGE_HOST}:${BRIDGE_PORT}. ` +
          "Make sure Pulsar is running with the pulsar-mcp package activated.",
      };
    }
    const tools = await fetchToolsFromBridge();
    return { tools };
  }

  // Execute a tool
  if (method === "tools/call") {
    const { name, arguments: args } = params;

    // Check bridge availability
    const bridgeAvailable = await checkBridge();
    if (!bridgeAvailable) {
      throw {
        code: -32603,
        message:
          `Pulsar bridge not available at http://${BRIDGE_HOST}:${BRIDGE_PORT}. ` +
          "Make sure Pulsar is running with the pulsar-mcp package activated.",
      };
    }

    // Execute via bridge (bridge validates tool existence)
    const result = await callBridge(name, args || {});

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  throw { code: -32601, message: `Method not found: ${method}` };
}

// Set up readline for stdio communication
const rl = readline.createInterface({ input: process.stdin });

rl.on("line", async (line) => {
  let req;
  try {
    req = JSON.parse(line);
  } catch {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    return;
  }

  // Ignore notifications (no id)
  if (req.id === undefined) return;

  try {
    const result = await handleRequest(req);
    send({ jsonrpc: "2.0", id: req.id, result });
  } catch (e) {
    send({
      jsonrpc: "2.0",
      id: req.id,
      error: { code: e.code || -32603, message: e.message || String(e) },
    });
  }
});

console.error("[pulsar-mcp] MCP server started");
