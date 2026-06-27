import { stardanceFetch } from "../utils"
import * as cheerio from "cheerio"
export const jobsTool = {
    name: "failed-jobs",
    desc: "Lists recently failed background jobs (requires admin access)",
    async execute(_args, session) {
        const text = await stardanceFetch("https://stardance.hackclub.com/admin/jobs/applications/battlemage/failed/jobs", {
            headers: {
                cookie: `_stardance_session_v3=${session}`,
            },
        }
        ).then(r => r.text())
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
}
