#!/usr/bin/env bun

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getCsrfToken, parseBlazerResults, stardanceFetch } from "./utils.ts";

/**
 * Stardance session cookie (`_stardance_session_v3`).
 * Set via the STARDANCE_SESSION env var in your MCP client config.
 */
const SESSION_COOKIE = process.env.STARDANCE_SESSION;

if (!SESSION_COOKIE) {
  console.error(
    [
      "Missing required auth: Stardance session cookie",
      "Your `_stardance_session_v3` cookie to be used to auth requests",
      "",
      "Set it in your MCP client config:",
      '  "env": { "STARDANCE_SESSION": "<your _stardance_session_v3 cookie>" }',
    ].join("\n")
  );
  process.exit(1);
}

type Tool = {
  name: string;
  desc: string;
  inputSchema?: Record<string, z.ZodTypeAny>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  execute: (args: any, session: string) => any | Promise<any>;
};

const tools: Tool[] = [
  {
    name: "hello_world",
    desc: "Says hello to a given name",
    inputSchema: { name: z.string().describe("Name to greet") },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    execute: ({ name }: { name: string }, _session: string) =>
      `Hello, ${name}!`,
  },
  {
    name: "is_admin",
    desc: "Checks if the u r admin",
    execute(args, session) {
      return fetch('https://stardance.hackclub.com/admin', {
        headers: {
          cookie: `_stardance_session_v3=${session}`,
        }
      }).then(r => r.ok)
    },
  },
  {
    name: "get_csrf_token",
    desc: "Gets the CSRF token for the current session",
    execute: (_args: any, session: string) => Bun.env.NODE_ENV !== "production" ? getCsrfToken(session) : null,
  },
  {
    name: "blazer_sql_query",
    desc: "Executes a SQL query against the Stardance database (requires admin access)",
    inputSchema: { query: z.string().describe("SQL query to execute") },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async execute({ query }: { query: string }, session: string) {
      return stardanceFetch("https://stardance.hackclub.com/admin/blazer/queries/run", {
        headers: {
          cookie: `_stardance_session_v3=${session}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CSRF-Token": await getCsrfToken(session),
        },
        method: "POST",
        body: new URLSearchParams({ statement: query, data_source: "main" }).toString(),
      }).then(r => r.text()).then(parseBlazerResults)
    }
  }

].filter(Boolean);

const server = new McpServer({ name: "stardance-better", version: "1.0.0" });

for (const tool of tools) {
  server.registerTool(
    tool.name,
    {
      description: tool.desc,
      inputSchema: tool.inputSchema ?? {},
      annotations: tool.annotations,
    },
    async (args) => ({
      content: [
        { type: "text", text: JSON.stringify(await tool.execute(args, SESSION_COOKIE), null, 2) },
      ],
    })
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
