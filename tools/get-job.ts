import { parseJobPage, stardanceFetch } from "../utils";

export const getJobTool = {
    name: "get-job-info",
    desc: "Gets information about a specific job by ID",
    inputSchema: {
        jobId: {
            type: "string",
            description: "The ID of the job to retrieve information for",
        },
    },
    async execute(_args, session) {
        const args = _args as { jobId: string };
        const url = `https://stardance.hackclub.com/admin/jobs/applications/battlemage/jobs/${args.jobId}`;
        const text = await stardanceFetch(url, {
            headers: {
                cookie: `_stardance_session_v3=${session}`,
            },
        }).then((r) => r.text());
        const info = await parseJobPage(text);
        return info;
    },
}