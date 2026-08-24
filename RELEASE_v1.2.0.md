# Vault SVN 插件 v1.2.0 发布说明

## 发布日期
2026-08-24

## 主要更改

### 新增
1. 引入已发布的 `@caesarloo/simple-svn-client@^0.1.0` 作为 SVN 领域层依赖，删除本地重复实现（`src/services/svnClient.ts`、`src/services/summaryService.ts`，共 -1340 行）
2. 新增 `getSvnClient()` 构造参数映射单元测试（`src/main.test.ts`），防止包构造签名漂移

### 修复
1. SVN 命令恢复"无超时"行为（`timeoutMs: 0`），避免大型仓库 `svn update` / 大文件 `diff` 超过默认 60 秒被中断
2. `package-lock.json` 版本号与 `package.json` 同步（1.1.6 → 1.2.0）
3. 删除未引用的死代码 `src/services/cryptoService.ts`

### 改进
1. 状态解析支持 XML 实体解码（路径含 `&`、引号等字符时正确显示）
2. 以 `-` 开头的路径在 `add`/`commit` 等命令中自动加 `./` 前缀，防止被 svn 当作选项
3. 命令失败时向用户展示真实 svn stderr 错误信息（`SvnError`）
4. 所有 SVN 领域逻辑（编码解码、状态/更新/差异解析、二进制探测）迁移至共享包并复用其测试覆盖（`tests/svnClient.test.ts`）

## 版本更新
- 更新版本号到 `v1.2.0`
