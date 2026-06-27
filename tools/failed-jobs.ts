import { parseJobs, stardanceFetch } from "../utils"
export const jobsTool = {
    name: "failed-jobs",
    desc: "Lists recently failed background jobs (requires admin access)",
    inputSchema: {
        jobClassName: {
            type: "string",
            description: "The name of the job class to filter by (optional)",
            optional: true,
        },
        queueName: {
            type: "string",
            description: "The name of the queue to filter by (optional)",
            optional: true,
        }
    },
    async execute(_args, session) {
        const text = await stardanceFetch("https://stardance.hackclub.com/admin/jobs/applications/battlemage/failed/jobs", {
            headers: {
                cookie: `_stardance_session_v3=${session}`,
            },
        }
        ).then(r => r.text())
        const jobs = await parseJobs(text)
        return jobs
    }
}