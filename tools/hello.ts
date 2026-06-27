import { z } from "zod";
import type { Tool } from "../types.ts";

export const helloTools: Tool[] = [
  {
    name: "hello_world",
    desc: "Says hello to a given name",
    inputSchema: { name: z.string().describe("Name to greet") },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    execute: ({ name }: { name: string }) => `Hello, ${name}!`,
  },
];
