import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

function run(bin, args, options = {}) {
  execFileSync(bin, args, {
    stdio: "inherit",
    ...options
  });
}

function runCapture(bin, args, options = {}) {
  return execFileSync(bin, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  }).trim();
}

function runNpm(args) {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) {
    run(process.execPath, [npmExecPath, ...args]);
    return;
  }

  if (process.platform === "win32") {
    run("npm", args, { shell: true });
    return;
  }

  run("npm", args);
}

function fail(message) {
  console.error(`[release] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const flags = new Set(argv.filter((item) => item.startsWith("--")));
  const positional = argv.filter((item) => !item.startsWith("--"));
  return {
    dryRun: flags.has("--dry-run"),
    version: positional[0]
  };
}

function releaseExists(tag) {
  try {
    runCapture("gh", ["release", "view", tag]);
    return true;
  } catch (error) {
    const message = String(error?.stderr ?? error?.message ?? "");
    if (/release not found/i.test(message)) {
      return false;
    }
    throw error;
  }
}

const { dryRun, version } = parseArgs(process.argv.slice(2));
if (!version) {
  fail("请传入版本号，例如：npm run release:publish -- 1.1.1 或 npm run release:dry-run -- 1.1.1");
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  fail(`版本号格式不正确：${version}（期望格式：X.Y.Z）`);
}

const tag = version;
const notesFile = `RELEASE_v${version}.md`;
const assets = ["dist/main.js", "dist/manifest.json", "dist/styles.css"];

if (!existsSync(notesFile)) {
  fail(`未找到发布说明文件：${notesFile}`);
}

console.log(`[release] ${dryRun ? "开始发布预检查" : "开始发布"} ${tag}`);

try {
  run("gh", ["auth", "status"]);
} catch {
  fail("gh 未登录，请先执行 gh auth login");
}

try {
  if (releaseExists(tag)) {
    fail(`Release ${tag} 已存在，请先删除或更换版本号`);
  }
} catch (error) {
  fail(`检查 Release 状态失败：${String(error?.message ?? error)}`);
}

runNpm(["run", "build"]);
runNpm(["run", "typecheck"]);

for (const asset of assets) {
  if (!existsSync(asset)) {
    fail(`未找到发布附件：${asset}`);
  }
}

if (dryRun) {
  console.log(`[release] dry-run 成功：${tag} 通过所有检查，未执行 gh release create`);
  process.exit(0);
}

run("gh", [
  "release",
  "create",
  tag,
  ...assets,
  "--title",
  `Vault SVN ${tag}`,
  "--notes-file",
  notesFile
]);

run("gh", ["release", "edit", tag, "--latest"]);

const url = runCapture("gh", ["release", "view", tag, "--json", "url", "--jq", ".url"]);
console.log(`[release] 发布成功：${url}`);
