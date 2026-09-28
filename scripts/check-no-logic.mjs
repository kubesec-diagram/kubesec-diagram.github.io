// This project holds data only: a fixed set of files and no DOM or listener
// code. Behaviour belongs in diagram-webkit. tests/ is not part of the package.
// Checks the files git sees (tracked and new, not ignored), so local extras
// such as .base.yaml or draw.io backups (.$*.bkp) do not count.
//
//   node scripts/check-no-logic.mjs [dir]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(process.argv[2] || path.join(import.meta.dirname, ".."));

const ALLOWED = [
  "package.json",
  "package-lock.json",
  "index.js",
  "definition.js",
  "views.js",
  "METADATA.md",
  "kubesec-diagram.svg",
  "kubesec-diagram.drawio.svg",
  "LICENSE",
  "index.html",
  "vite.config.js",
  "README.md",
  ".gitignore",
  ".envrc",
  ".gitattributes",
  ".github/workflows/deploy.yml",
  ".github/workflows/release.yml",
  "scripts/check-no-logic.mjs",
  "scripts/changelog.mjs",
  "config/tags.js",
  "config/annotations.js",
  "config/ui.js",
  "config/tag-descriptions.generated.js",
  "config/version.generated.js",
  "content/page.js",
  "content/about.js",
  "content/css.js",
  "content/footer.js",
];
const IGNORED_PREFIXES = ["tests/"];
const FORBIDDEN = [/addEventListener/, /\bdocument\./, /\bwindow\./];
const errors = [];

function files() {
  const listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: dir, encoding: "utf8" });
  return listed
    .split("\0")
    .filter(Boolean)
    .filter((file) => !IGNORED_PREFIXES.some((prefix) => file.startsWith(prefix)))
    // Deleted in the working tree but still in the index: not part of the project.
    .filter((file) => fs.existsSync(path.join(dir, file)));
}

files().forEach((file) => {
  if (!ALLOWED.includes(file)) {
    errors.push(`${file}: not an allowed file`);
    return;
  }
  if (!/\.(js|html)$/.test(file)) return;
  const text = fs.readFileSync(path.join(dir, file), "utf8");
  // index.html's one module script mounts the app; that is the entry, not logic.
  const checked = file === "index.html" ? text.replace(/mountApp\(document\.body, definition\);/, "") : text;
  FORBIDDEN.forEach((pattern) => {
    if (pattern.test(checked)) errors.push(`${file}: contains ${pattern.source}`);
  });
});

if (errors.length > 0) {
  errors.forEach((error) => console.error(error));
  process.exit(1);
}
console.log(`${dir}: data only`);
