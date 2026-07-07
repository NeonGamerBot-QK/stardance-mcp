import { authTools } from "./auth.ts";
import { blazerTools } from "./blazer.ts";
import { feedTools } from "./feed.ts";
import { helloTools } from "./hello.ts";

export const tools = [...helloTools, ...authTools, ...blazerTools, ...feedTools];
