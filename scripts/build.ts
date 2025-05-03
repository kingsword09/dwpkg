import { readJson, writeJson } from "@kingsword09/nodekit/json";
import { normalizePath } from "@kingsword09/nodekit/path";
import node_fs from "node:fs/promises";
import node_path from "node:path";
import { build } from "tsdown";
import { loadConfig } from "unconfig";
import "typescript";

interface DenoJson {
  name: string;
  version: string;
  description: string;
  exports: Record<string, string>;
  imports?: Record<string, string>;
  patch?: string[];
  author?: string;
  repository?: { "type": string; "url": string; };
  homepage?: string;
  license?: string;
}

interface PackageJsonExports {
  [key: string]:
    | { import: { types: string; default: string; }; require: { types: string; default: string; }; }
    | string;
}

interface PackageJson {
  name: string;
  version: string;
  description: string;
  main?: string;
  module?: string;
  types?: string;
  exports?: PackageJsonExports;
  license?: string;
  author?: string;
  repository?: { "type": string; "url": string; };
  homepage?: string;
  dependencies?: Record<string, string>;
  engines?: { node?: string; pnpm: string; };
  bin?: Record<string, string>;
  packageManager?: string;
}

const packageJsonGet = async (denoJson: DenoJson) => {
  const dependencies: Record<string, string> = {};
  Object.entries(denoJson.imports ?? {}).forEach((dep) => {
    const value = dep[1];
    if (value.startsWith("jsr:")) {
      dependencies[dep[0]] = `jsr:${value.split("@")[2]}`;
    } else if (value.startsWith("npm:")) {
      dependencies[dep[0]] = `${value.split("@")[dep[0].includes("@") ? 2 : 1]}`;
    }
  });

  const packageJson = await loadConfig.async<PackageJson>({
    cwd: Deno.cwd(),
    sources: [{
      files: ["deno"],
      extensions: ["json", "jsonc"],
      parser: async (filePath) => {
        const denoConfig = await readJson.async<DenoJson>(filePath);
        const pkgFields: (keyof PackageJson)[] = ["license", "author", "repository", "homepage"];
        const filteredConfig = Object.fromEntries(
          Object.entries(denoConfig).filter(([key]) => pkgFields.includes(key as keyof PackageJson)),
        );
        return {
          name: denoJson.name,
          version: denoJson.version,
          description: denoJson.description,
          dependencies,
          ...filteredConfig,
          bin: { [denoJson.name.split("/")[1]]: "./dist/cli.js" },
          packageManager: "pnpm@10.10.0",
        } satisfies PackageJson;
      },
    }],
  });

  return { packageJson: packageJson.config, workspacePath: node_path.dirname(packageJson.sources[0]) };
};

const packageJsonGen = async (packageJson: PackageJson, outputDir: string) => {
  await writeJson.async(node_path.join(outputDir, "package.json"), JSON.stringify(packageJson, undefined, 2));
};

const copyPublicDir = async (outputDir: string) => {
  console.log(node_path.resolve(outputDir, "LICENSE"));
  await node_fs.cp(node_path.resolve(outputDir, "../LICENSE"), node_path.join(outputDir, "LICENSE"));
  await node_fs.cp(node_path.resolve(outputDir, "../README.md"), node_path.join(outputDir, "README.md"));
  await node_fs.cp(node_path.resolve(outputDir, "../templates"), node_path.join(outputDir, "templates"), {
    recursive: true,
    force: true,
  });
};

/**
 * Build the package for npm
 *
 * @example
 * ```ts
 * import process from "node:process";
 *
 * await npmBuild(process.cwd());
 * ```
 *
 * @param cwd - the root path of the package
 */
export const npmBuild = async (cwd: string) => {
  const denoJson = await readJson.async<DenoJson>(node_path.join(normalizePath(cwd), "./deno.json"));
  const outputDir = node_path.join(normalizePath(cwd), "dist");

  const entries: Record<string, string> = {};
  Object.entries(denoJson.exports).forEach((entry) => {
    let key = entry[0];

    if (key === ".") {
      key = "cli";
    }

    entries[key] = node_path.join(normalizePath(cwd), entry[1]);
  });

  const { packageJson } = await packageJsonGet(denoJson);
  await build({
    entry: entries,
    platform: "node",
    format: ["esm"],
    dts: { compilerOptions: { isolatedDeclarations: true }, tsconfig: false },
    clean: true,
    skipNodeModulesBundle: true,
    external: [...Object.keys(denoJson.imports ?? {}), /^@kingsword09\/nodekit\/.*/],
    hooks: {
      "build:before": (ctx) => {
        ctx.pkg = packageJson;
      },
      "build:done": async () => {
        await packageJsonGen(packageJson, outputDir);
        await copyPublicDir(outputDir);
      },
    },
  });
};
