import { type IBuildOptions, npmBuild } from "./mod.ts";

export const buildCommandParse = async (
  // deno-lint-ignore no-explicit-any
  options: Record<string, any>,
  _args: string[],
  _passThroughArgs: string[],
): Promise<void> => {
  await npmBuild(options as IBuildOptions);
};
