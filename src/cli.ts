#!/usr/bin/env node

import module from "node:module";
import { program } from "./command.ts";

try {
  module.enableCompileCache?.();
} catch {
  // ignore
}
program.parse();
