import bin from "tiny-bin";
import denoJson from "../deno.json" with { type: "json" };
import { buildCommandParse } from "./build.ts";
import { initCommandParse } from "./init.ts";

const program = bin("dwpkg", denoJson.description).package("dwpkg", denoJson.version).option(
  "--config, -c",
  "Specify path to deno.json(c) file.",
  { type: "string", default: "" },
).option("--copy", "Copies all files from the specified directory to the output directory.", {
  type: "string",
  default: "",
}).action(async (options, args, passThroughArgs) => {
  await buildCommandParse(options, args, passThroughArgs);
});

program.command("init", "Initialize a new Deno library.").option("--workspace, -w", "create a workspace.", {
  default: false,
}).action(async (options, args, passthroughArgs) => {
  await initCommandParse(options, args, passthroughArgs);
});

export { program };
