import type { SvnStatusEntry } from "../types";

const LABELS: Record<SvnStatusEntry["status"], string> = {
  added: "新增",
  modified: "修改",
  deleted: "删除",
  conflict: "冲突",
  untracked: "未跟踪",
  missing: "缺失"
};

export async function generateSummaryWithFallback(entries: SvnStatusEntry[]): Promise<string> {
  if (!entries.length) {
    return "无变更";
  }

  const grouped = entries.reduce<Record<string, string[]>>((acc, item) => {
    const key = LABELS[item.status];
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item.path);
    return acc;
  }, {});

  // 生成变更说明
  let summary = "更新了项目文件";
  
  // 生成文件清单
  const fileList = Object.entries(grouped).map(([status, paths]) => {
    return `## ${status}文件\n${paths.map(path => `- ${path}`).join("\n")}`;
  }).join("\n\n");

  return `${summary}\n\n${fileList}`;
}
