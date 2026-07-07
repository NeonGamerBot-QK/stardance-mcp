import * as cheerio from "cheerio"
import * as os from "node:os"

const USER_AGENT = `stardance-mcp/1.0 (${os.platform()}; ${os.arch()}; ${os.hostname()})`;

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

/**
 * Parses the Stardance home feed (`/home/feed`) into an array of post objects.
 */
export function parseFeed(text: string) {
  const $ = cheerio.load(text)

  const posts = $("article[id^='post_']")
    .toArray()
    .map((el) => {
      const article = $(el)

      const id = article.attr("id")?.replace("post_", "") ?? ""
      const projectId = article.attr("data-feed-engagement-project-id-value") ?? ""
      const postType = article.attr("data-feed-engagement-post-type-value") ?? ""
      const url = article.attr("data-card-link-url-value") ?? ""

      const authorEl = article.find(".feed-post-card__author").first()
      const projectEl = article.find(".feed-post-card__project").first()
      const timeEl = article.find(".feed-post-card__time").first()

      const commentsLink = article.find(".feed-post-card__comment-action a.feed-post-card__action").first()
      const commentsCount = Number(commentsLink.attr("aria-label")?.match(/\d+/)?.[0] ?? 0)

      const repostsCount = Number(article.find(".feed-post-card__repost span").last().text().trim() || 0)
      const likesCount = Number(article.find(".like-button__count").first().text().trim() || 0)

      const viewsEl = article.find("[aria-label^='Seen by']").first()
      const viewsCount = Number(viewsEl.attr("aria-label")?.match(/\d+/)?.[0] ?? 0)

      const images = article
        .find(".feed-post-card__image")
        .toArray()
        .map((img) => $(img).attr("src") ?? "")

      return {
        id,
        projectId,
        postType,
        url,
        author: { handle: authorEl.text().trim(), url: authorEl.attr("href") ?? "" },
        project: { name: projectEl.text().trim(), url: projectEl.attr("href") ?? "" },
        postedAt: {
          at: timeEl.attr("datetime") ?? "",
          ago: timeEl.text().trim().replace(/^·\s*/, ""),
        },
        duration: article.find(".feed-post-card__duration").first().text().trim(),
        body: article.find(".feed-post-card__body").first().text().trim(),
        images,
        commentsCount,
        repostsCount,
        likesCount,
        viewsCount,
      }
    })

  return posts
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