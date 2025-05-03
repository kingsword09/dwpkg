import node_process from "node:process";
import { npmBuild } from "./scripts/build.ts";

if (import.meta.main) {
  await npmBuild(node_process.cwd());
}
