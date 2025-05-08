import { transformRecordEntries } from "@kingsword/toolkit/record";
import node_path from "node:path";
import { type PackageJson, writePackageJSON } from "pkg-types";
import type { Format } from "./config.ts";
import type { DenoJson } from "./deno-json.ts";
import type { EntryFlags } from "./entry.ts";

/**
 * Generate a package.json object based on the given options.
 * @param options The options for generating the package.json object.
 * @returns The generated package.json object.
 */
export const generatePackageJson = (
  options: { jsrRegistry: boolean; denoJson: DenoJson; packageJson: PackageJson; flags: EntryFlags; format: Format; },
): PackageJson => {
  const { denoJson, packageJson, flags, format } = options;
  const jsExtension = format === "esm" ? ".mjs" : ".js";
  const dtsExtension = format === "esm" ? ".d.mts" : ".d.ts";

  const binPath = format === "both" ? "./esm/cli.mjs" : `./cli${jsExtension}`;

  const newPackageJson = {
    ...packageJson,
    ...(flags.hasBin
      ? { bin: { [Object.keys(packageJson.bin || { [denoJson.name.split("/")[1]]: binPath })[0]]: binPath } }
      : {}),
  } satisfies PackageJson;

  if (flags.hasMain) {
    if (format === "esm") {
      newPackageJson.module = "./mod.mjs";
      newPackageJson.types = "./mod.d.mts";
    } else if (format === "cjs") {
      newPackageJson.main = "./mod.js";
      newPackageJson.types = "./mod.d.ts";
    } else {
      newPackageJson.main = "./cjs/mod.js";
      newPackageJson.module = "./esm/mod.mjs";
      newPackageJson.types = "./cjs/mod.d.ts";
    }
  }

  if (flags.hasExports && !newPackageJson.exports) {
    const denoJsonExports = typeof denoJson.exports === "string" ? { ".": denoJson.exports } : denoJson.exports;
    const packageJsonExports = transformRecordEntries(denoJsonExports, (entry) => {
      let key = entry.key;
      if (key === ".") {
        key = "mod";
      } else if (key === "./cli") {
        return;
      }
      const modPath = `${key.replace("./", "")}`;

      return format === "both"
        ? {
          import: { types: `./esm/${modPath}.d.mts`, default: `./esm/${modPath}.mjs` },
          require: { types: `./cjs/${modPath}.d.ts`, default: `./cjs/${modPath}.js` },
        }
        : { default: `./${modPath}${jsExtension}`, types: `./${modPath}${dtsExtension}` };
    });
    newPackageJson.exports = packageJsonExports;
  }
  let hasJsr = false;
  if (!newPackageJson.dependencies) {
    const dependencies = transformRecordEntries(denoJson.imports ?? {}, ({ key, value }) => {
      if (value.startsWith("jsr:")) {
        hasJsr = true;

        if (options.jsrRegistry) {
          return value.split("@")[2];
        } else {
          return `jsr:${value.split("@")[2]}`;
        }
      } else if (value.startsWith("npm:")) {
        return `${value.split("@")[key.includes("@") ? 2 : 1]}`;
      }
    }, ({ key, value }) => options.jsrRegistry ? `@jsr/${value.replace("/", "__")}` : key);

    newPackageJson.dependencies = dependencies;
  }
  if (hasJsr && options.jsrRegistry) {
    Object.assign(newPackageJson, { engines: { pnpm: ">=10.9.0", yarn: ">=4.9.0" } });
  }

  return newPackageJson;
};

interface CreatePackageJsonOptions {
  outputDir: string;
  packageJson: PackageJson;
  format: Format;
}

/**
 * Create package.json files for the given output directory.
 * @param options The options for creating the package.json files.
 */
export const createPackageJsonFiles = async (options: CreatePackageJsonOptions): Promise<void> => {
  const { outputDir, packageJson, format } = options;
  if (format === "esm") {
    packageJson.type = "module";
    await writePackageJSON(node_path.join(outputDir, "package.json"), packageJson);
  } else if (format === "cjs") {
    packageJson.type = "commonjs";
    await writePackageJSON(node_path.join(outputDir, "package.json"), packageJson);
  } else {
    delete packageJson.type;
    await writePackageJSON(node_path.join(outputDir, "package.json"), packageJson);
    await writePackageJSON(node_path.join(outputDir, "esm/package.json"), { "type": "module" });
    await writePackageJSON(node_path.join(outputDir, "cjs/package.json"), { "type": "commonjs" });
  }
};

export type { PackageJson };
