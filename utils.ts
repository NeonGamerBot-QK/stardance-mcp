import * as cheerio from "cheerio"
const USER_AGENT = ` ${} stardance-mcp/1.0`;

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
export function parseJobs(text: string) {
  const $ = cheerio.load(text)
  const jobs = $("tr.job")
    .toArray()
    .map((row) => {
      const tds = $(row).find("td")
      const jLink = tds.eq(0).find("a").first()
      const jClass = jLink.text().trim()
      const jUrl = jLink.attr("href") ?? ""
      const gid = tds.eq(0).find(".is-family-monospace").text().trim()
      const enqAgo = tds.eq(0).find(".has-text-grey span").attr("title") ?? ""

      const errLink = tds.eq(1).find("a").first()
      const err = errLink.text().trim()
      const failedAgo = tds.eq(1).find(".has-text-grey span").attr("title") ?? ""

      const discardAction = tds.eq(2).find('form[action*="discard"]').attr("action") ?? ""
      const retryAction = tds.eq(2).find('form[action*="retry"]').attr("action") ?? ""

      const idMatch = jUrl.match(/jobs\/([a-f0-9-]{36})/)

      const id = idMatch?.[1] ?? ""

      return { id, jClass, gid, enqAgo, err, failedAgo, discardAction, retryAction }
    })
  return jobs
}

export function parseJobPage(text: string) {
  const $ = cheerio.load(text)
  const [errorInfo, rawData] = $("pre").toArray().map((el) => $(el).text().trim())
  const errorName = $(".level-left").text()

  const details: Record<string, string> = {}
  const timestamps: Record<string, { at: string; ago: string }> = {}

  $("table.table tr").each((_, row) => {
    const label = $(row).find("th").text().trim()
    if (!label) return

    const cell = $(row).find("td")
    const span = cell.find("span[title]").first()

    if (span.length) {
      timestamps[label] = { at: span.attr("title") ?? "", ago: span.text().trim() }
      return
    }

    const link = cell.find("a").first()
    details[label] = (link.length ? link.text() : cell.text()).trim()
  })

  return {
    errorName,
    errorInfo,
    rawData,
    arguments: details["Arguments"] ?? "",
    jobId: details["Job id"] ?? "",
    queue: details["Queue"] ?? "",
    enqueued: timestamps["Enqueued"] ?? null,
    failed: timestamps["Failed"] ?? null,
  }
}