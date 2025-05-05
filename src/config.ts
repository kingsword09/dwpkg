import type { PackageJson } from "pkg-types";
import type { Options } from "tsdown";

export type UserConfig = Options & { packageJson?: PackageJson; };
export type Format = "esm" | "cjs" | "both";
export type Platform = "node" | "browser";
