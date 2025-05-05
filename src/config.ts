import type { PackageJson } from "pkg-types";
import type { Options } from "tsdown";

export type { IBuildOptions } from "./utils/config.ts";
export type UserConfig = Options & { packageJson?: PackageJson; };
