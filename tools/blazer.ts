import { z } from "zod";
import { getCsrfToken, parseBlazerResults, stardanceFetch } from "../utils.ts";
import type { Tool } from "../types.ts";

export const blazerTools: Tool[] = [
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
    async execute({ query }: { query: string }, session) {
      return stardanceFetch(
        "https://stardance.hackclub.com/admin/blazer/queries/run",
        {
          headers: {
            cookie: `_stardance_session_v3=${session}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "X-CSRF-Token": await getCsrfToken(session),
          },
          method: "POST",
          body: new URLSearchParams({
            statement: query,
            data_source: "main",
          }).toString(),
        }
      )
        .then((r) => r.text())
        .then(parseBlazerResults);
    },
  },
];
