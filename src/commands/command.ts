import bin from "tiny-bin";
import denoJson from "../../deno.json" with { type: "json" };
import { buildCommandParse } from "./build.ts";
import { initCommandParse } from "./init.ts";
import { runCommandParse } from "./run.ts";

const program = bin("dwpkg", denoJson.description).package("dwpkg", denoJson.version).option(
  "--config, -c",
  "Specify path to deno.json(c) file.",
  { type: "string", default: "" },
).option("--copy", "Copies all files from the specified directory to the output directory.", {
  type: "string",
  default: "",
}).option("--format, -f", "Specify output format (esm, cjs, or both).", {
  type: "string",
  enum: ["esm", "cjs", "both"],
  default: "both",
}).option("--platform, -p", "Specify platform (node, browser).", {
  type: "string",
  enum: ["node", "browser"],
  default: "node",
}).option("--jsr", "Enable JSR registry.", { type: "boolean", default: false }).option(
  "--minify",
  "Enable code minification.",
  { type: "boolean", default: false },
).option("--tsconfig", "Specify path to tsconfig.json file", { type: "string", default: "" }).action(
  async (options, args, passThroughArgs) => {
    await runCommandParse(options, args, passThroughArgs);
  },
);

program.command("init", "Initialize a new Deno library.").option("--workspace, -w", "create a workspace.", {
  default: false,
}).action(async (options, args, passthroughArgs) => {
  await initCommandParse(options, args, passthroughArgs);
});

program.command("build", "Create and execute a build.ts script similar to Rust's build.rs for pre-build tasks").action(
  async (options, args, passThroughArgs) => {
    await buildCommandParse(options, args, passThroughArgs);
  },
);

export { program };
