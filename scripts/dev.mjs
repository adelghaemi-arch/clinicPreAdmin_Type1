import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

try { if (existsSync(".env")) process.loadEnvFile(".env"); } catch { /* optional local configuration */ }
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 300).unref();
}
function run(args, env = {}) {
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  children.push(child);
  child.on("error", () => stop(1));
  child.on("exit", (code) => { if (!stopping) stop(code || 0); });
  return child;
}
run(["server/index.mjs"]);
run(["node_modules/vite/bin/vite.js", ...process.argv.slice(2)]);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop(0));
