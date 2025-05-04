import { cancel, confirm, intro, isCancel, outro, spinner, text } from "@clack/prompts";
import { readJson, writeJson } from "@kingsword09/nodekit/json";
import { normalizePath } from "@kingsword09/nodekit/path";
import { cp } from "node:fs/promises";
import path from "node:path";
import { cwd, exit } from "node:process";
import { pathParse } from "./utils/path.ts";

interface InitOptions {
  workspace: boolean;
}

/**
 * Initialize a new project with templates
 * @param options
 * @param _command
 */
export const initCommandParse = async (options: InitOptions, _args: string[], _passthroughArgs: string[]) => {
  intro(`Create Deno${options.workspace ? " Workspace " : " "}Library`);
  const name = await text({ message: "Where should we create your library?", placeholder: "./my-lib" });

  if (isCancel(name)) {
    cancel("Operation cancelled");
    return exit(0);
  }

  const { root, basename } = pathParse(name as string);

  const scope = await text({
    message: "JSR required a scope name.",
    placeholder: "Enter your GitHub username or JSR scope (e.g. kingsword09)",
  });
  if (isCancel(scope)) {
    cancel("Operation cancelled");
    return exit(0);
  }
  const customBuild = await confirm({
    message: "Do you want to customize the build configuration?",
    inactive: "N",
    active: "Y",
    initialValue: false,
  });

  const denoJsonPath = path.join(root, "deno.json");

  const s = spinner();
  if (options.workspace) {
    s.start("Creating deno workspace...");
    await cp(normalizePath(import.meta.resolve("./templates/lib-workspace-template")), root, {
      recursive: true,
      force: true,
    });

    const content = JSON.stringify(await readJson.async(denoJsonPath), null, 2);
    await writeJson.async(
      denoJsonPath,
      content.replace("@kingsword09/lib-workspace-template", `@${scope}/${basename}`),
    );
    s.stop("created successfully!");
  } else {
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
    await cp(normalizePath(import.meta.resolve(`./templates/${template}`)), root, { recursive: true, force: true });

    const content = JSON.stringify(await readJson.async(denoJsonPath), null, 2);

    await writeJson.async(denoJsonPath, content.replace(`@kingsword09/${template}`, `@${scope}/${basename}`));
    s.stop("created successfully!");
  }

  outro(`
You're all set!

cd ${name}

deno task build
          `);
};
