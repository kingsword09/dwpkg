import { build as tsdownBuild } from "tsdown";
import "typescript";
import { createUserConfig, type IBuildOptions, type UserConfig } from "./utils/config.ts";

/**
 * Build TypeScript/JavaScript packages with tsdown
 * Accepts either a build options object or a user configuration object
 *
 * @example
 * ```ts
 * import { build } from "@kingsword09/dwpkg";
 *
 * await build({
 *   config: "./deno.json",
 *   format: "esm",
 *   platform: "node",
 * });
 * ```
 *
 * @param input Build options or user configuration
 * @module
 */
export async function build(input: IBuildOptions | UserConfig): Promise<void> {
  if ("config" in input) {
    const config = await createUserConfig(input as IBuildOptions);
    await tsdownBuild(config);
  } else {
    await tsdownBuild(input);
  }
}

export type { IBuildOptions, UserConfig };
