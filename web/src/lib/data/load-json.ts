import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

export async function loadJson<T>(relativePath: string): Promise<T> {
  const filePath = path.join(process.cwd(), "public", "data", relativePath);
  const source = await readFile(filePath, "utf8");
  return JSON.parse(source) as T;
}
