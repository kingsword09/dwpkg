import { build } from "jsr:@kingsword09/dwpkg";

if (import.meta.main) {
  await build({ jsrRegistry: false, format: "both", platform: "node" });
}
