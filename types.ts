import type { z } from "zod";

export type Tool = {
  name: string;
  desc: string;
  inputSchema?: Record<string, z.ZodTypeAny>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  execute: (args: any, session: string) => any | Promise<any>;
};
