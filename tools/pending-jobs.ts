import { parseJobs, stardanceFetch } from "../utils"

export const pendingJobsTool = {
    name: "pending-jobs",
    desc: "Lists all pending jobs (requires admin access)",
    inputSchema: {
        jobClassName: {
            type: "string",
            description: "The name of the job class to filter by (optional)",
            optional: true,
        },
        queueName: {
            type: "list",
            options: ["default", "background", "latency_5m", "literally_whenever", "solid_queue_recurring"],
            description: "The name of the queue to filter by (optional)",
            optional: true,
        }
    },
    async execute(_args, session) {
        const args = _args as { jobClassName?: string, queueName?: string }
        const queryParams = new URLSearchParams()
        if (args.jobClassName) {
            queryParams.append("filter[job_class_name]", args.jobClassName)
        }
        if (args.queueName) {
            queryParams.append("filter[queue_name]", args.queueName)
        }
        const baseUrl = "https://stardance.hackclub.com/admin/jobs/applications/battlemage/pending/jobs"
        const url = queryParams.size > 0 ? `${baseUrl}?${queryParams}` : baseUrl
        const text = await stardanceFetch(url, {
            headers: {
                cookie: `_stardance_session_v3=${session}`,
            },
        }
        ).then(r => r.text())
        const jobs = await parseJobs(text)
        return jobs
    }
}