import type { TsConfigJson } from "get-tsconfig";
import node_path from "node:path";
import type { Options } from "tsdown";
import { copyPublicDir } from "./copy.ts";
import { getConfig } from "./deno-json.ts";
import type { EntryFlags } from "./entry.ts";
import { createPackageJsonFiles, generatePackageJson, type PackageJson } from "./package-json.ts";

export type Format = "esm" | "cjs" | "both";
export type Platform = "node" | "browser";

/**
 * Build options for dwpkg.
 */
export interface IBuildOptions {
  format: Format;
  platform: Platform;
  jsrRegistry: boolean;
  minify?: boolean;
  config?: string;
  copy?: Options["copy"];
  external?: Options["external"];
  noExternal?: Options["noExternal"];
  compilerOptions?: TsConfigJson.CompilerOptions;
  packageJson?: PackageJson;
}

export type UserConfig = Options & { packageJson?: PackageJson; };

/**
 * Generate tsdown configuration based on build options
 * @param buildOptions The build options for dwpkg.
 * @returns The user configuration object.
 */
export const createUserConfig = async (buildOptions: IBuildOptions): Promise<UserConfig> => {
  const { root, denoJson } = await getConfig(buildOptions.config);
  const outputDir = node_path.join(root, "dist");

  const denoJsonExports = typeof denoJson.exports === "string" ? { ".": denoJson.exports } : denoJson.exports;
  const { entries, flags } = Object.entries(denoJsonExports).reduce<
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
    jsrRegistry: buildOptions.jsrRegistry,
    denoJson,
    packageJson: buildOptions.packageJson
      ? buildOptions.packageJson
      : {
        name: denoJson.name,
        version: denoJson.version,
        description: denoJson.description ?? denoJson.name,
        author: denoJson.name.split("/")[0].replace("@", ""),
        license: denoJson.license ?? "MIT",
      },
    flags,
    format: buildOptions.format,
  });
  // const aliasEntries: { find: string; replacement: string; }[] = [];
  // const alias: Record<string, string> = {};
  // if (buildOptions.jsrRegistry) {
  //   Object.entries(
  //     Object.assign(
  //       {},
  //       newPackageJson.dependencies,
  //       newPackageJson.devDependencies,
  //       newPackageJson.peerDependencies,
  //       newPackageJson.optionalDependencies,
  //     ),
  //   ).forEach(deps => {
  //     if (deps[0].startsWith("@jsr")) {
  //       alias["@" + deps[0].split("/")[1].replace("__", "/")] = deps[0];
  //     }
  //   });
  // }
  // console.log(alias);

  return {
    entry: entries,
    copy: buildOptions.copy ?? [],
    minify: buildOptions.minify ?? false,
    platform: buildOptions.platform,
    format: buildOptions.format === "both" ? ["esm", "cjs"] : buildOptions.format,
    external: buildOptions.external ?? [],
    noExternal: buildOptions.noExternal,
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
