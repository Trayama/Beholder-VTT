import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

execFileSync("tsc", ["-p", "tsconfig.json"], { cwd: root, stdio: "inherit" });
cpSync(resolve(root, "public"), dist, { recursive: true });

// Local development overrides the production Pages URLs without changing the
// committed manifest. CI/release builds use the production URLs from public/.
const baseUrl = process.env.BEHOLDER_BASE_URL?.replace(/\/+$/, "");
if (baseUrl) {
  const manifestPath = resolve(dist, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.icon = `${baseUrl}/icon.svg`;
  manifest.background_url = `${baseUrl}/background.html`;
  manifest.action = {
    ...manifest.action,
    title: "Beholder VTT",
    icon: `${baseUrl}/icon.svg`,
    popover: `${baseUrl}/control.html`,
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log("Beholder VTT build complete:", dist);
