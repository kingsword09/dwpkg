import { which } from "@kingsword/nodekit/which";
import { execSync } from "node:child_process";
import { cwd } from "node:process";

/**
 * The build command.
 */
export const buildCommandParse = async (
  // deno-lint-ignore no-explicit-any
  _options: Record<string, any>,
  _args: string[],
  _passThroughArgs: string[],
) => {
  execSync(`${await which.async("deno") ?? "deno"} run -A ./build.ts`, { cwd: cwd(), stdio: "inherit" });
};
