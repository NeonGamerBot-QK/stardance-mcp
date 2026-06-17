const USER_AGENT = `stardance-mcp/1.0`;

/**
 * Wrapper around fetch that applies a static User-Agent header.
 */
export function stardanceFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      "User-Agent": USER_AGENT,
      ...init.headers,
    },
  });
}

/**
 * Parses a Blazer SQL query HTML response into an array of row objects.
 * Column names are taken from <th> headers; values are cast to numbers where possible.
 */
export function parseBlazerResults(html: string): Record<string, string | number>[] {
  const headers = [...html.matchAll(/<div[^>]*>\s*([^<]+?)\s*<\/div>\s*<\/th>/g)].map(
    (m) => m[1].trim()
  );

  const rows = [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map((m) => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((td) => td[1].trim()))
    .filter((cells) => cells.length === headers.length);

  return rows.map((cells) =>
    Object.fromEntries(
      headers.map((header, i) => {
        const raw = cells[i].replace(/<[^>]+>/g, "").trim();
        const num = Number(raw);
        return [header, raw !== "" && !isNaN(num) ? num : raw];
      })
    )
  );
}

/**
 * Fetches a CSRF token from the Stardance app by scraping the meta tag.
 * Required for all mutating requests (POST, PUT, DELETE).
 */
export async function getCsrfToken(session: string): Promise<string> {
  const res = await stardanceFetch("https://stardance.hackclub.com/", {
    headers: { Cookie: `_stardance_session_v3=${session}` },
  });

  const html = await res.text();
  const match = html.match(/<meta name="csrf-token" content="([^"]+)"/);
  if (!match) throw new Error("Could not find CSRF token in response");

  return match[1];
}
