import { build } from "../mod.ts";
import type { IBuildOptions } from "../utils/config.ts";

/**
 * Run the cli
 */
export const runCommandParse = async (
  // deno-lint-ignore no-explicit-any
  options: Record<string, any>,
  _args: string[],
  _passThroughArgs: string[],
): Promise<void> => {
  await build({ ...options, denoJsonPath: options.config, jsrRegistry: options.jsr } as IBuildOptions);
};
