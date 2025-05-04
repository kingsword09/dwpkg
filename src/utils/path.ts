import { normalizePath } from "@kingsword09/nodekit/path";
import node_path from "node:path";
import node_process from "node:process";

export const getAbsolutePath = (p: string): string => {
  const path = normalizePath(p);
  const isAbsolute = node_path.isAbsolute(path);
  return isAbsolute ? path : node_path.resolve(node_process.cwd(), p);
};

export const getRootPath = (p: string): string => {
  const absolutePath = getAbsolutePath(p);
  const hasExtension = node_path.extname(absolutePath) !== "";
  return hasExtension ? node_path.dirname(absolutePath) : absolutePath;
};
