import { getCsrfToken } from "../utils.ts";
import type { Tool } from "../types.ts";

export const authTools: Tool[] = [
  {
    name: "is_admin",
    desc: "Checks if the u r admin",
    execute(_args, session) {
      return fetch("https://stardance.hackclub.com/admin", {
        headers: { cookie: `_stardance_session_v3=${session}` },
      }).then((r) => r.ok);
    },
  },
  {
    name: "get_csrf_token",
    desc: "Gets the CSRF token for the current session",
    execute: (_args, session) =>
      Bun.env.NODE_ENV !== "production" ? getCsrfToken(session) : null,
  },
];
