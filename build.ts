import { build } from "@kingsword09/dwpkg";
import denoJson from "./deno.json" with { type: "json" };

if (import.meta.main) {
  await build({
    jsrRegistry: false,
    copy: ["./templates"],
    platform: "node",
    format: "esm",
    external: [
      "@clack/prompts",
      "get-tsconfig",
      "pkg-types",
      "tiny-bin",
      "tsdown",
      "typescript",
      "unconfig",
      /^@kingsword\/nodekit\/.*/,
    ],
    packageJson: {
      name: "dwpkg",
      version: denoJson.version,
      description: denoJson.description,
      author: "Kingsword kingsword09 <kingsword09@gmail.com>",
    },
  });
}
