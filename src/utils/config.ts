import type { TsConfigJson } from "get-tsconfig";
import node_path from "node:path";
import type { PackageJson } from "pkg-types";
import type { UserConfig } from "../config.ts";
import { copyPublicDir } from "./copy.ts";
import { getConfig } from "./deno-json.ts";
import type { EntryFlags } from "./entry.ts";
import { createPackageJsonFiles, generatePackageJson } from "./package-json.ts";

export type Format = "esm" | "cjs" | "both";
export type Platform = "node" | "browser";
export interface IBuildOptions {
  config: string;
  copy: string;
  format: Format;
  platform: Platform;
  compilerOptions?: TsConfigJson.CompilerOptions;
  packageJson?: PackageJson;
}

export const createUserConfig = async (buildOptions: IBuildOptions): Promise<UserConfig> => {
  const { root, denoJson } = await getConfig(buildOptions.config);
  const outputDir = node_path.join(root, "dist");

  const { entries, flags } = Object.entries(denoJson.exports).reduce<
    { entries: Record<string, string>; flags: EntryFlags; }
  >((acc, [key, value]) => {
    const entryKey = key === "." ? "mod" : key;
    acc.entries[entryKey] = node_path.resolve(root, value);

    if (key === ".") {
      acc.flags.hasMain = true;
    } else if (key === "./cli") {
      acc.flags.hasBin = true;
    } else {
      acc.flags.hasExports = true;
    }

    return acc;
  }, { entries: {}, flags: { hasBin: false, hasMain: false, hasExports: false } });

  const newPackageJson = generatePackageJson({
    denoJson,
    packageJson: buildOptions.packageJson
      ? buildOptions.packageJson
      : {
        name: denoJson.name,
        version: denoJson.version,
        description: denoJson.description,
        author: denoJson.name.split("/")[0].replace("@", ""),
        license: denoJson.license ?? "MIT",
      },
    flags,
    format: buildOptions.format,
  });

  return {
    entry: entries,
    copy: buildOptions.copy ? [buildOptions.copy] : [],
    platform: buildOptions.platform,
    format: buildOptions.format === "both" ? ["esm", "cjs"] : buildOptions.format,
    dts: {
      compilerOptions: buildOptions.compilerOptions ? buildOptions.compilerOptions : { isolatedDeclarations: true },
      tsconfig: false,
    },
    clean: true,
    skipNodeModulesBundle: true,
    outputOptions: (options, format) => {
      if (buildOptions.format === "both") {
        if (format === "es") {
          options.dir = node_path.join(outputDir, "esm");
        } else if (format === "cjs") {
          options.dir = node_path.join(outputDir, "cjs");
        }
      }

      return options;
    },
    hooks: {
      "build:before": (ctx) => {
        ctx.pkg = newPackageJson;
      },
      "build:done": async () => {
        await createPackageJsonFiles({ outputDir, packageJson: newPackageJson, format: buildOptions.format });
        await copyPublicDir(root, outputDir);
      },
    },
  } satisfies UserConfig;
};
