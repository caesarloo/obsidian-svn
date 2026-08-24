# Vault SVN v1.2.0

[English](#english) | [中文](#chinese)

---

## English

**Release Date:** 2026-08-24

### New Features

1. **Shared SVN Core via `@caesarloo/simple-svn-client`** — The SVN domain layer now comes from the published `@caesarloo/simple-svn-client@^0.1.0` npm package, replacing ~1,340 lines of duplicated local code (`src/services/svnClient.ts`, `src/services/summaryService.ts`).

2. **Unit Test for `getSvnClient()`** — Added `src/main.test.ts` to lock down the plugin-settings → package-constructor mapping, preventing silent signature drift.

### Fixes

1. **No-Timeout SVN Commands Restored** — Commands now run with `timeoutMs: 0` (matching the previous no-timeout behavior), so large-repository `svn update` / big-file `diff` operations are no longer killed after the package's default 60-second timeout.

2. **`package-lock.json` Version Synced** — The lockfile version was stale (`1.1.6`); it now matches `package.json` (`1.2.0`).

3. **Dead Code Removed** — Deleted the unreferenced `src/services/cryptoService.ts`.

### Improvements

1. **XML Entity Decoding in Status Parsing** — Paths containing `&`, quotes, or other XML entities now display correctly.

2. **Safe Path Handling** — Paths starting with `-` get a `./` prefix for `add`/`commit` and other commands, so they are never mistaken for svn options.

3. **Real Error Messages** — Command failures now surface the actual svn stderr text (`SvnError`), instead of a generic Node error.

4. **Reused Package Test Coverage** — All SVN domain logic (encoding repair, status/update/diff parsing, binary discovery) now lives in the shared package and is covered by its own test suite.

### Version Update
- `manifest.json`: 1.1.14 → 1.2.0
- `package.json`: 1.1.14 → 1.2.0
- `versions.json`: Added 1.2.0

### Release Assets
- `dist/main.js` - Plugin main program
- `dist/manifest.json` - Plugin manifest
- `dist/styles.css` - Plugin styles

---

## Chinese / 中文

**发布日期：** 2026-08-24

### 新增

1. **引入共享 SVN 核心 `@caesarloo/simple-svn-client`** — SVN 领域层改为依赖已发布的 `@caesarloo/simple-svn-client@^0.1.0` npm 包，删除本地重复实现（`src/services/svnClient.ts`、`src/services/summaryService.ts`，共 -1340 行）。

2. **新增 `getSvnClient()` 单元测试** — 添加 `src/main.test.ts` 锁定"插件设置 → 包构造参数"的映射，防止签名漂移。

### 修复

1. **恢复 SVN 命令"无超时"行为** — 命令以 `timeoutMs: 0` 运行（与旧版无超时行为一致），大型仓库 `svn update` / 大文件 `diff` 不再因包默认 60 秒超时被中断。

2. **`package-lock.json` 版本号同步** — 锁文件版本号此前落后（`1.1.6`），现与 `package.json`（`1.2.0`）一致。

3. **删除死代码** — 移除未被引用的 `src/services/cryptoService.ts`。

### 改进

1. **状态解析支持 XML 实体解码** — 路径含 `&`、引号等 XML 实体时现在能正确显示。

2. **安全路径处理** — 以 `-` 开头的路径在 `add`/`commit` 等命令中自动加 `./` 前缀，防止被 svn 当作选项。

3. **真实错误信息** — 命令失败时展示实际 svn stderr 内容（`SvnError`），而非笼统的 Node 错误。

4. **复用包内测试覆盖** — 所有 SVN 领域逻辑（编码修复、状态/更新/差异解析、二进制探测）位于共享包，由其自带测试套件守护。

### 版本更新
- `manifest.json`: 1.1.14 → 1.2.0
- `package.json`: 1.1.14 → 1.2.0
- `versions.json`: 新增 1.2.0

### 发布附件
- `dist/main.js` - 插件主程序
- `dist/manifest.json` - 插件清单
- `dist/styles.css` - 插件样式
