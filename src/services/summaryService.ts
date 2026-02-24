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

  const parts = Object.entries(grouped).map(([status, paths]) => {
    const preview = paths.slice(0, 4).join("，");
    const suffix = paths.length > 4 ? ` 等 ${paths.length} 项` : "";
    return `${status}：${preview}${suffix}`;
  });

  return `SVN 变更摘要：${parts.join("；")}`;
}
