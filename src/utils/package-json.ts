import node_path from "node:path";
import { type PackageJson, type PackageJsonExports, writePackageJSON } from "pkg-types";
import type { Format } from "./config.ts";
import type { DenoJson } from "./deno-json.ts";
import type { EntryFlags } from "./entry.ts";

/**
 * Generate a package.json object based on the given options.
 * @param options The options for generating the package.json object.
 * @returns The generated package.json object.
 */
export const generatePackageJson = (
  options: { denoJson: DenoJson; packageJson: PackageJson; flags: EntryFlags; format: Format; },
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
    const packageJsonExports: PackageJsonExports = {};
    Object.entries(denoJson.exports).forEach((entry) => {
      let key = entry[0];

      if (key === ".") {
        key = "mod";
      } else if (key === "./cli") {
        return;
      }
      const modPath = `${key.replace("./", "")}`;

      if (format === "both") {
        packageJsonExports[entry[0]] = {
          import: { types: `./esm/${modPath}.d.mts`, default: `./esm/${modPath}.mjs` },
          require: { types: `./cjs/${modPath}.d.ts`, default: `./cjs/${modPath}.js` },
        };
      } else {
        packageJsonExports[entry[0]] = { default: `./${modPath}${jsExtension}`, types: `./${modPath}${dtsExtension}` };
      }
    });
    newPackageJson.exports = packageJsonExports;
  }
  let hasJsr = false;
  if (!newPackageJson.dependencies) {
    const dependencies: Record<string, string> = {};
    Object.entries(denoJson.imports ?? {}).forEach((dep) => {
      const value = dep[1];
      if (value.startsWith("jsr:")) {
        hasJsr = true;
        dependencies[dep[0]] = `jsr:${value.split("@")[2]}`;
      } else if (value.startsWith("npm:")) {
        dependencies[dep[0]] = `${value.split("@")[dep[0].includes("@") ? 2 : 1]}`;
      }
    });

    newPackageJson.dependencies = dependencies;
  }
  if (hasJsr) {
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
export const createPackageJsonFiles = async (options: CreatePackageJsonOptions) => {
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
