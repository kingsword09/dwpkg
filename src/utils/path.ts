import { normalizePath } from "@kingsword09/nodekit/path";
import node_path from "node:path";
import node_process from "node:process";

interface IPathParse {
  root: string;
  basename: string;
}

export const pathParse = (p: string): IPathParse => {
  const path = normalizePath(p);
  const isAbsolute = node_path.isAbsolute(path);
  const root = isAbsolute ? path : node_path.resolve(node_process.cwd(), path);
  const basename = node_path.basename(path);

  return { root, basename };
};
