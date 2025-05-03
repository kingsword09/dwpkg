import { confirm, input } from "@inquirer/prompts";
import { readJson, writeJson } from "@kingsword09/nodekit/json";
import { normalizePath } from "@kingsword09/nodekit/path";
import type { Command } from "commander";
import { cp } from "node:fs/promises";
import path from "node:path";
import { cwd } from "node:process";

interface InitOptions {
  workspace: boolean;
}

/**
 * Initialize a new project with templates
 * @param options
 * @param _command
 */
export const initCommandParse = async (options: InitOptions, _command: Command) => {
  const answers = {
    name: await input({ message: "The name of the library:", required: true }),
    scope: await input({ message: "JSR required scope name:", required: true }),
    confirm: await confirm({ message: "Do you want to customize the build configuration?", default: false }),
  };

  const destPath = path.resolve(cwd(), answers.name);
  const denoJsonPath = path.join(destPath, "deno.json");

  if (options.workspace) {
    await cp(normalizePath(import.meta.resolve("./templates/lib-workspace-template")), destPath, {
      recursive: true,
      force: true,
    });

    const content = JSON.stringify(await readJson.async(denoJsonPath), null, 2);
    await writeJson.async(
      denoJsonPath,
      content.replace("@kingsword09/lib-workspace-template", `@${answers.scope}/${answers.name}`),
    );
  } else {
    const isCli = await confirm({ message: "Is this a CLI tool project?", default: false });

    let template = "";
    if (isCli && answers.confirm) {
      template = "cli-config-template";
    } else if (isCli) {
      template = "cli-template";
    } else if (answers.confirm) {
      template = "lib-config-template";
    } else {
      template = "lib-template";
    }

    await cp(normalizePath(import.meta.resolve(`./templates/${template}`)), destPath, { recursive: true, force: true });

    const content = JSON.stringify(await readJson.async(denoJsonPath), null, 2);

    await writeJson.async(
      denoJsonPath,
      content.replace(`@kingsword09/${template}`, `@${answers.scope}/${answers.name}`),
    );
  }
};
