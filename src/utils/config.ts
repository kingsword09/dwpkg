import { bundle } from "@kingsword/deno-emit";
import { exists, readFile, writeFileSimple } from "@kingsword/nodekit/fs";
import { transformRecordEntries } from "@kingsword/toolkit/record";
import type { TsConfigJson } from "get-tsconfig";
import node_path from "node:path";
import { pathToFileURL } from "node:url";
import type { Options } from "tsdown";
import { copyPublicDir } from "./copy.ts";
import { getConfig, parsePackageSpecifier } from "./deno-json.ts";
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
  jsrNoExternal: boolean;
  minify?: boolean;
  denoJsonPath?: string;
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
  const { root, denoJson } = await getConfig(buildOptions.denoJsonPath);
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

  const jsrDeps = new Map<string, string>();
  transformRecordEntries(denoJson.imports ?? {}, ({ key, value }) => {
    if (value.startsWith("jsr:")) {
      jsrDeps.set(key, value);
    }
  });

  // const bundleDeps: string[] = [];
  // console.log("QAQ bundleDeps");
  // if (buildOptions.noExternal && Array.isArray(buildOptions.noExternal)) {
  //   console.log("QAQ xxx");
  //   buildOptions.noExternal.some((pattern) => {
  //     if (pattern instanceof RegExp) {
  //       console.log(jsrDeps);
  //       jsrDeps.forEach((value, key) => {
  //         console.log(pattern, key, pattern.test(key));
  //         if (pattern.test(key)) {
  //           bundleDeps.push(value);
  //         }
  //       });
  //     } else {
  //       jsrDeps.forEach((value, key) => {
  //         if (pattern === key) {
  //           bundleDeps.push(value);
  //         }
  //       });
  //     }
  //   });

  //   if (bundleDeps.length > 0) {
  //     for await (const dep of bundleDeps) {
  //       const { code } = await bundle("jsr:@kingsword/denokit@^0.0.1");
  //       console.log("QAQ code xxxxxx");
  //       console.log(code);
  //     }
  //   }
  // }
  // const jsrDeps = Object.values(denoJson.imports ?? {}).filter(it => it.startsWith("jsr:"));
  function extractSubpath(specifier: string): string | undefined {
    // 去掉协议
    const noProto = specifier.replace(/^(npm:|jsr:)/, "");
    // 找到第一个以 @ 开头的版本号后的斜杠
    const match = noProto.match(/^[^/]+(?:\/[^/]+)?@[^/]+(\/.+)$/) || noProto.match(/^[^/]+(?:\/[^/]+)?(\/.+)$/);
    if (match && match[1]) {
      return match[1].replace(/^\//, "");
    }
    return;
  }

  return {
    entry: entries,
    copy: buildOptions.copy ?? [],
    minify: buildOptions.minify ?? false,
    platform: buildOptions.platform,
    format: buildOptions.format === "both" ? ["esm", "cjs"] : buildOptions.format,
    external: buildOptions.external ?? [],
    noExternal: buildOptions.noExternal ?? [],
    dts: {
      compilerOptions: buildOptions.compilerOptions ? buildOptions.compilerOptions : { isolatedDeclarations: true },
      tsconfig: false,
    },
    clean: true,
    skipNodeModulesBundle: true,
    plugins: [{
      name: "jsr:resolver",
      resolveId: async (id, importer) => {
        console.log("id", id);
        console.log("importer", importer);
        if (!id.includes(".")) {
          const key = jsrDeps.keys().find((key) => {
            return id.startsWith(key);
          });
          console.log("key", key);
          if (key) {
            const exportName = id.replace(key, "");
            const patchPath = denoJson.patch?.find((v) => v.endsWith(key));
            let fetchUrl = jsrDeps.get(key)! + exportName;
            console.log("fetchUrl", fetchUrl);

            if (patchPath) {
              console.log("patchPath", patchPath);
              const depPath = node_path.resolve(root, patchPath);
              const patchDenoJsonConfig = await getConfig(depPath);

              const patchDenoJsonExports = patchDenoJsonConfig.denoJson.exports;
              if (exportName && typeof patchDenoJsonExports !== "string") {
                fetchUrl = pathToFileURL(node_path.join(depPath, patchDenoJsonExports[exportName])).href;
              } else {
                fetchUrl = pathToFileURL(node_path.join(depPath, exportName)).href;
              }
              console.log("patch url", fetchUrl);
            }
            console.log("after fetchUrl", fetchUrl);

            const depFile = node_path.join(root, ".dwpkg", key, `${exportName === "" ? "mod" : exportName}.ts`);
            console.log("depFile", depFile);
            if (!await exists.async(depFile)) {
              const { code } = await bundle(fetchUrl);
              console.log("code", code);

              console.log("QAQ depFile", depFile);
              await writeFileSimple.async(depFile, code, { mkdirIfNotExists: true, encoding: "utf-8" });
              console.log("QAQ xxx ");
            }
            return depFile;
          }
        } else if (id.startsWith("npm:")) {
          console.log("id: ", id, importer);
          const packageParsed = parsePackageSpecifier(id);

          console.log(packageParsed);

          // if (packageParsed) {
          //   const depFile = node_path.join(
          //     root,
          //     ".dwpkg",
          //     packageParsed.name,
          //     `${!packageParsed.subpath ? "mod" : packageParsed.subpath}.ts`,
          //   );
          //   const fetchUrl = id;
          //   if (!await exists.async(depFile)) {
          //     console.log("fetchUrl", fetchUrl);
          //     const { code } = await bundle(fetchUrl);
          //     console.log("fet", code);
          //     await writeFileSimple.async(depFile, code, { mkdirIfNotExists: true, encoding: "utf-8" });
          //   }
          // }
          if (packageParsed && importer) {
            const content = await readFile.async(importer, { encoding: "utf-8" });
            await writeFileSimple.async(importer, content.replace(id, packageParsed.name));
          }
          return { id: packageParsed?.name };
        }
      },
    }],
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
