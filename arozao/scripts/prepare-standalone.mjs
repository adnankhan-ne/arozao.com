import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const staticSource = resolve(projectRoot, ".next", "static");
const staticDestination = resolve(
  projectRoot,
  ".next",
  "standalone",
  ".next",
  "static"
);
const publicSource = resolve(projectRoot, "public");
const publicDestination = resolve(projectRoot, ".next", "standalone", "public");

if (!existsSync(staticSource)) {
  throw new Error(`Next.js static build assets were not found at ${staticSource}`);
}

mkdirSync(resolve(projectRoot, ".next", "standalone", ".next"), {
  recursive: true,
});
cpSync(staticSource, staticDestination, { recursive: true });

if (existsSync(publicSource)) {
  cpSync(publicSource, publicDestination, { recursive: true });
}
