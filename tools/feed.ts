import { z } from "zod";
import { parseFeed, stardanceFetch } from "../utils.ts";
import type { Tool } from "../types.ts";

export const feedTools: Tool[] = [
  {
    name: "home_feed",
    desc: "Lists posts from the Stardance home feed (/home/feed)",
    inputSchema: {
      page: z.number().int().positive().optional().describe("The feed page number to fetch (optional, defaults to 1)"),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async execute({ page }: { page?: number }, session) {
      const url = page
        ? `https://stardance.hackclub.com/home/feed?page=${page}`
        : "https://stardance.hackclub.com/home/feed";

      const text = await stardanceFetch(url, {
        headers: { cookie: `_stardance_session_v3=${session}` },
      }).then((r) => r.text());

      return parseFeed(text);
    },
  },
];
