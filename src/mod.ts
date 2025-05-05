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
 *   jsrRegistry: true
 * });
 * ```
 *
 * @param input Build options or user configuration
 * @module
 */
export async function build(input: IBuildOptions): Promise<void>;
export async function build(input: UserConfig): Promise<void>;
export async function build(input: IBuildOptions | UserConfig): Promise<void> {
  if ("jsrRegistry" in input) {
    const config = await createUserConfig(input as IBuildOptions);
    await tsdownBuild(config);
  } else {
    await tsdownBuild(input as UserConfig);
  }
}

export type { IBuildOptions, UserConfig };
