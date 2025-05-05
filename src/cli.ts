#!/usr/bin/env node

import module from "node:module";
import { program } from "./commands/command.ts";

try {
  module.enableCompileCache?.();
} catch {
  // ignore
}

program.run();
