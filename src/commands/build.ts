import { build } from "../mod.ts";
import type { IBuildOptions } from "../utils/config.ts";

export const buildCommandParse = async (
  // deno-lint-ignore no-explicit-any
  options: Record<string, any>,
  _args: string[],
  _passThroughArgs: string[],
): Promise<void> => {
  await build(options as IBuildOptions);
};
