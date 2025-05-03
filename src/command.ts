import { readJson } from "@kingsword09/nodekit/json";
import { Command } from "commander";
import node_path from "node:path";
import node_process from "node:process";

const program = new Command();
const denoJson = readJson.sync<{ name: string; version: string; description: string; }>(
  node_path.resolve(node_process.cwd(), "../deno.json"),
);

program.name("dwpkg").description(denoJson.description).version(denoJson.version);

program.command("init").description("Initialize a new Deno library.").argument("<name>", "The name of the library")
  .option("-w, --workspace", "create a workspace.", false).action((name, options, command) => {
  });

export { program };
