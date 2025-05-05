#!/usr/bin/env node

/**
 * dwpkg - Deno workspace packaging and publishing tool for JSR and NPM registries.
 * @module
 */
import module from "node:module";
import { program } from "./commands/command.ts";

try {
  module.enableCompileCache?.();
} catch {
  // ignore
}

program.run();
