#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, "..");
const workspaceDir = path.resolve(projectDir, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadEnvFile(path.join(projectDir, ".env.local"));
loadEnvFile(path.join(projectDir, ".env"));
loadEnvFile(path.join(workspaceDir, "api", ".env"));

const phpCandidates = [
  process.env.PHP_CLI,
  path.resolve(workspaceDir, "..", "..", "php", "php.exe"),
  "php",
].filter(Boolean);
const php = phpCandidates.find((candidate) =>
  candidate === "php" ? true : fs.existsSync(candidate)
);

if (!php) {
  console.error("PHP CLI was not found. Set PHP_CLI or add PHP to PATH.");
  process.exit(1);
}

const result = spawnSync(
  php,
  [path.join(workspaceDir, "api", "scripts", "bootstrap-admin.php")],
  { cwd: workspaceDir, env: process.env, stdio: "inherit" }
);
if (result.error) {
  console.error(`Admin bootstrap could not start: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
