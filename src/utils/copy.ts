import node_fs from "node:fs/promises";
import node_path from "node:path";

const copyFilesByPattern = async (sourceDir: string, targetDir: string, pattern: RegExp) => {
  const files = await node_fs.readdir(sourceDir);
  const matchingFiles = files.filter(file => pattern.test(file));

  for (const file of matchingFiles) {
    await node_fs.cp(node_path.join(sourceDir, file), node_path.join(targetDir, file));
  }
};

export const copyPublicDir = async (root: string, outputDir: string) => {
  await copyFilesByPattern(root, outputDir, /^license/i);
  await copyFilesByPattern(root, outputDir, /^readme/i);
};
