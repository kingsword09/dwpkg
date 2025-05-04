import { readJson } from "@kingsword09/nodekit/json";
import node_path from "node:path";
import node_process from "node:process";
import bin from "tiny-bin";
import { initCommandParse } from "./init.ts";

const denoJson = readJson.sync<{ name: string; version: string; description: string; }>(
  node_path.resolve(node_process.cwd(), "../deno.json"),
);
const program = bin("dwpkg", denoJson.description).package("dwpkg", denoJson.version);

program.command("init", "Initialize a new Deno library.").option("--workspace, -w", "create a workspace.", {
  default: false,
}).action(async (options, args, passthroughArgs) => {
  await initCommandParse(options, args, passthroughArgs);
});

export { program };
