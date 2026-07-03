#!/usr/bin/env bun

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { tools } from "./tools/index.ts";

/**
 * Stardance session cookie (`_stardance_session_v3`).
 * Set via the STARDANCE_SESSION env var in your MCP client config.
 */
const SESSION_COOKIE = process.env.STARDANCE_SESSION;

if (!SESSION_COOKIE) {
  console.warn(
    [
      "Missing required auth: Stardance session cookie",
      "Your `_stardance_session_v3` cookie to be used to auth requests",
      "",
      "Set it in your MCP client config:",
      '  "env": { "STARDANCE_SESSION": "<your _stardance_session_v3 cookie>" }',
    ].join("\n")
  );
}

const server = new McpServer({ name: "stardance-better", version: "1.0.0" });

for (const tool of tools) {
  server.registerTool(
    tool.name,
    {
      description: tool.desc,
      inputSchema: tool.inputSchema ?? {},
      annotations: tool.annotations,
    },
    async (args) => {
      if (!SESSION_COOKIE) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Missing required auth: STARDANCE_SESSION env var is not set. Set your `_stardance_session_v3` cookie in your MCP client config.",
            },
          ],
        };
      }

      return {
        content: [
          { type: "text", text: JSON.stringify(await tool.execute(args, SESSION_COOKIE), null, 2) },
        ],
      };
    }
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
