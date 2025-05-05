import { build as tsdownBuild } from "tsdown";
import "typescript";
import { createUserConfig, type IBuildOptions, type UserConfig } from "./utils/config.ts";

export async function build(input: IBuildOptions | UserConfig): Promise<void> {
  if ("config" in input) {
    const config = await createUserConfig(input as IBuildOptions);
    await tsdownBuild(config);
  } else {
    await tsdownBuild(input);
  }
}

export type { IBuildOptions, UserConfig };
