import { readJson } from "@kingsword/nodekit/json";
import node_fs from "node:fs/promises";
import node_path from "node:path";
import { cwd } from "node:process";
import { type PackageJson, type PackageJsonExports, writePackageJSON } from "pkg-types";
import { build as tsdownBuild } from "tsdown";
import { loadConfig } from "unconfig";
import "typescript";
import type { UserConfig } from "./config.ts";
import { getAbsolutePath } from "./utils/path.ts";

export interface DenoJson {
  name: string;
  version: string;
  description: string;
  exports: Record<string, string>;
  imports?: Record<string, string>;
  patch?: string[];
  license?: string;
}

export interface IBuildOptions {
  config: string;
  copy: string;
}

const packageJsonGet = (
  options: { denoJson: DenoJson; packageJson: PackageJson; hasBin: boolean; hasMain: boolean; hasExports: boolean; },
): PackageJson => {
  const { denoJson, packageJson, hasBin, hasMain, hasExports } = options;
  const newPackageJson = {
    ...packageJson,
    ...(hasBin
      ? {
        bin: {
          [Object.keys(packageJson.bin || { [denoJson.name.split("/")[1]]: "./esm/cli.mjs" })[0]]: "./esm/cli.mjs",
        },
      }
      : {}),
  } satisfies PackageJson;

  if (hasMain) {
    if (!newPackageJson.main) {
      newPackageJson.main = "./cjs/mod.js";
    }
    if (!newPackageJson.module) {
      newPackageJson.module = "./esm/mod.mjs";
    }
    if (!newPackageJson.types) {
      newPackageJson.types = "./cjs/mod.d.ts";
    }
  }
  if (hasExports && !newPackageJson.exports) {
    const packageJsonExports: PackageJsonExports = {};
    Object.entries(denoJson.exports).forEach((entry) => {
      let key = entry[0];

      if (key === ".") {
        key = "mod";
      } else if (key === "./cli") {
        return;
      }
      const modPath = `${key.replace("./", "")}`;
      packageJsonExports[entry[0]] = {
        import: { types: `./esm/${modPath}.d.mts`, default: `./esm/${modPath}.mjs` },
        require: { types: `./cjs/${modPath}.d.ts`, default: `./cjs/${modPath}.js` },
      };
    });
    newPackageJson.exports = packageJsonExports;
  }
  if (!newPackageJson.dependencies) {
    const dependencies: Record<string, string> = {};
    Object.entries(denoJson.imports ?? {}).forEach((dep) => {
      const value = dep[1];
      if (value.startsWith("jsr:")) {
        dependencies[dep[0]] = `jsr:${value.split("@")[2]}`;
      } else if (value.startsWith("npm:")) {
        dependencies[dep[0]] = `${value.split("@")[dep[0].includes("@") ? 2 : 1]}`;
      }
    });

    newPackageJson.dependencies = dependencies;
  }
  Object.assign(newPackageJson, { engines: { pnpm: ">=10.9.0", yarn: ">=4.9.0" } });

  return newPackageJson;
};

const packageJsonGen = async (outputDir: string, packageJson: PackageJson, hasMain: boolean) => {
  await writePackageJSON(node_path.join(outputDir, "package.json"), packageJson);
  if (hasMain) {
    await writePackageJSON(node_path.join(outputDir, "esm/package.json"), { "type": "module" });
    await writePackageJSON(node_path.join(outputDir, "cjs/package.json"), { "type": "commonjs" });
  }
};

const copyFilesByPattern = async (sourceDir: string, targetDir: string, pattern: RegExp) => {
  const files = await node_fs.readdir(sourceDir);
  const matchingFiles = files.filter(file => pattern.test(file));

  for (const file of matchingFiles) {
    await node_fs.cp(node_path.join(sourceDir, file), node_path.join(targetDir, file));
  }
};

const copyPublicDir = async (root: string, outputDir: string) => {
  await copyFilesByPattern(root, outputDir, /^license/i);
  await copyFilesByPattern(root, outputDir, /^readme/i);
};

export const getConfig = async (configPath: string): Promise<{ root: string; denoJson: DenoJson; }> => {
  if (configPath === "") {
    const { config, sources } = await loadConfig<DenoJson>({
      cwd: cwd(),
      sources: [{ files: "deno", extensions: ["json", "jsonc"] }],
    });

    return { root: node_path.dirname(sources[0]), denoJson: config };
  } else {
    const denoJsonPath = getAbsolutePath(configPath);
    const denoJson = await readJson.async<DenoJson>(denoJsonPath);
    return { root: node_path.dirname(denoJsonPath), denoJson };
  }
};

const userConfigGet = (
  root: string,
  denoJson: DenoJson,
  options: IBuildOptions,
  packageJson?: PackageJson,
): UserConfig => {
  const outputDir = node_path.join(root, "dist");
  const customPackageJson = packageJson
    ? packageJson
    : {
      name: denoJson.name,
      version: denoJson.version,
      description: denoJson.description,
      author: denoJson.name.split("/")[0].replace("@", ""),
      license: denoJson.license ?? "MIT",
    } satisfies PackageJson;

  let hasBin = false;
  let hasMain = false;
  let hasExports = false;
  const entries: Record<string, string> = {};
  Object.entries(denoJson.exports).forEach((entry) => {
    let key = entry[0];

    if (key === ".") {
      key = "mod";
      hasMain = true;
    } else if (key === "./cli") {
      hasBin = true;
    } else {
      hasExports = true;
    }

    entries[key] = node_path.resolve(root, entry[1]);
  });

  return {
    entry: entries,
    copy: options.copy ? [options.copy] : [],
    platform: "node",
    format: ["esm", "cjs"],
    dts: { compilerOptions: { isolatedDeclarations: true }, tsconfig: false },
    clean: true,
    skipNodeModulesBundle: true,
    outputOptions: (options, format) => {
      if (format === "es") {
        options.dir = node_path.join(outputDir, "esm");
      } else if (format === "cjs") {
        options.dir = node_path.join(outputDir, "cjs");
      }

      return options;
    },
    hooks: {
      "build:before": (ctx) => {
        ctx.pkg = customPackageJson;
      },
      "build:done": async () => {
        const newPackageJson = packageJsonGet({
          denoJson,
          packageJson: customPackageJson,
          hasBin,
          hasMain,
          hasExports,
        });
        await packageJsonGen(outputDir, newPackageJson, hasMain);
        await copyPublicDir(root, outputDir);
      },
    },
  } satisfies UserConfig;
};

export const npmBuild = async (
  options: IBuildOptions,
  packageJson?: PackageJson,
  config?: UserConfig,
): Promise<void> => {
  const { root, denoJson } = await getConfig(options.config);

  let userConfig = config;
  if (!userConfig) {
    userConfig = await userConfigGet(root, denoJson, options, packageJson);
  }

  await tsdownBuild(userConfig);
};
