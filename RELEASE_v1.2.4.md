# Vault SVN v1.2.4

[English](#english) | [中文](#chinese)

---

## English

**Release Date:** 2026-11-13

### Fixes

1. **Folder-level revert now removes untracked files** — Choosing *Revert* on a folder in the changed-files tree previously only ran `svn revert --recursive`. Untracked (unversioned) entries are not under SVN version control, so `svn revert` leaves them on disk and the files survived the revert. Single-file revert already had a delete branch, which is why it behaved correctly. Folder-level revert now also deletes the untracked files and folders reported under that folder, matching single-file behavior. Deletions run per entry, a failure on one entry does not abort the rest, and a notice summarizes how many entries were deleted or failed.

### Version Update
- `manifest.json`: 1.2.3 → 1.2.4
- `package.json`: 1.2.3 → 1.2.4
- `package-lock.json`: 1.2.3 → 1.2.4
- `versions.json`: Added 1.2.4
- `README.md`: stable version declaration and latest release links → 1.2.4

### Release Assets
- `dist/main.js` - Plugin main program
- `dist/manifest.json` - Plugin manifest
- `dist/styles.css` - Plugin styles

---

## Chinese / 中文

**发布日期：** 2026-11-13

### 修复

1. **目录层级还原会一并删除未跟踪文件** — 在「变动文件（文件树）」里对某个目录点「还原」时，此前只执行 `svn revert --recursive`。未跟踪（unversioned）条目不在 SVN 版本控制内，`svn revert` 对它们无效，所以点完还原后文件仍留在磁盘上；对单个文件点还原本来就有删除分支，因此单个文件还原是正常的。现在目录层级还原会一并删除该目录下被标记为未跟踪的文件与目录，与单文件还原行为一致。删除逐个条目执行，单个条目失败不影响其余条目，并用通知汇总删除数与失败条目。

### 版本更新
- `manifest.json`: 1.2.3 → 1.2.4
- `package.json`: 1.2.3 → 1.2.4
- `package-lock.json`: 1.2.3 → 1.2.4
- `versions.json`: 新增 1.2.4
- `README.md`: 当前稳定版本声明与最新发布页链接 → 1.2.4

### 发布附件
- `dist/main.js` - 插件主程序
- `dist/manifest.json` - 插件清单
- `dist/styles.css` - 插件样式
