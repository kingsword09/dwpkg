import { cancel, confirm, intro, isCancel, outro, spinner, text } from "@clack/prompts";
import { readJson, writeJson } from "@kingsword/nodekit/json";
import { normalizePath } from "@kingsword/nodekit/path";
import { which } from "@kingsword/nodekit/which";
import { execSync } from "node:child_process";
import { cp } from "node:fs/promises";
import node_path from "node:path";
import { cwd, exit } from "node:process";
import type { DenoJson } from "../utils/deno-json.ts";
import { getRootPath } from "../utils/path.ts";

/**
 * Initialize a new project with templates
 */
export const initCommandParse = async (
  // deno-lint-ignore no-explicit-any
  options: Record<string, any>,
  _args: string[],
  _passthroughArgs: string[],
): Promise<void> => {
  intro(`Create Deno${options.workspace ? " Workspace " : " "}Library`);
  const name = await text({ message: "Where should we create your library?", placeholder: "./my-lib" });

  if (isCancel(name)) {
    cancel("Operation cancelled");
    return exit(0);
  }

  const root = getRootPath(name as string);
  const basename = node_path.basename(root);

  const scope = await text({
    message: "JSR required a scope name.",
    placeholder: "Enter your NPM organizations or JSR scope (e.g. kingsword09)",
  });
  if (isCancel(scope)) {
    cancel("Operation cancelled");
    return exit(0);
  }

  const denoJsonPath = node_path.join(root, "deno.json");
  const relativeTemplates = "./templates";

  const s = spinner();
  if (options.workspace) {
    s.start("Creating deno workspace...");
    if (typeof Deno !== "undefined") {
      execSync(`${await which.async("deno") ?? "deno"} init ${name} --lib`, { cwd: cwd() });
      const content = await readJson.async<DenoJson>(denoJsonPath);
      content.workspaces = [];
      content.name = content.name.replace(basename, `@${scope}/${basename}`);
      await writeJson.async(denoJsonPath, JSON.stringify(content, null, 2));
    } else {
      await cp(normalizePath(import.meta.resolve(`${relativeTemplates}/lib-workspace-template`)), root, {
        recursive: true,
        force: true,
      });

      const content = JSON.stringify(await readJson.async(denoJsonPath), null, 2);
      await writeJson.async(
        denoJsonPath,
        content.replace("@kingsword09/lib-workspace-template", `@${scope}/${basename}`),
      );
    }

    s.stop("created successfully!");
  } else {
    if (typeof Deno !== "undefined") {
      execSync(`${await which.async("deno") ?? "deno"} init ${name} --lib`, { cwd: cwd() });
      s.message("modify deno.json");
      const content = await readJson.async<DenoJson>(denoJsonPath);
      content.name = content.name.replace(basename, `@${scope}/${basename}`);
      await writeJson.async(denoJsonPath, JSON.stringify(content, null, 2));
    } else {
      const customBuild = await confirm({
        message: "Do you want to customize the build configuration?",
        inactive: "N",
        active: "Y",
        initialValue: false,
      });

      const isCli = await confirm({
        message: "Is this a CLI tool project?",
        inactive: "N",
        active: "Y",
        initialValue: false,
      });

      let template = "";
      if (isCli && customBuild) {
        template = "cli-config-template";
      } else if (isCli) {
        template = "cli-template";
      } else if (customBuild) {
        template = "lib-config-template";
      } else {
        template = "lib-template";
      }

      s.start("Creating deno library...");
      await cp(normalizePath(import.meta.resolve(`${relativeTemplates}/${template}`)), root, {
        recursive: true,
        force: true,
      });

      const content = JSON.stringify(await readJson.async(denoJsonPath), null, 2);

      await writeJson.async(denoJsonPath, content.replace(`@kingsword09/${template}`, `@${scope}/${basename}`));
    }

    s.stop("created successfully!");
  }

  outro(`
You're all set!

cd ${name}

deno task build
          `);
};
