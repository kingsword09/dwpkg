import { readJson } from "@kingsword/nodekit/json";
import node_path from "node:path";
import { cwd } from "node:process";
import { loadConfig } from "unconfig";
import { getAbsolutePath } from "./path.ts";

export interface DenoJson {
  name: string;
  version: string;
  exports: string | Record<string, string>;
  description?: string;
  imports?: Record<string, string>;
  patch?: string[];
  license?: string;
  workspaces?: string[] | {
    members: string[];
  };
}

export const getConfig = async (configPath?: string): Promise<{ root: string; denoJson: DenoJson; }> => {
  if (!configPath || configPath === "") {
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
