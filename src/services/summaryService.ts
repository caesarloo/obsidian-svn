import type { SvnStatusEntry } from "../types";

const LABELS: Record<SvnStatusEntry["status"], string> = {
  added: "新增",
  modified: "修改",
  deleted: "删除",
  conflict: "冲突",
  untracked: "未跟踪",
  missing: "缺失"
};

const STATUS_ORDER: SvnStatusEntry["status"][] = ["added", "modified", "deleted", "untracked", "missing", "conflict"];

const ACTION_PHRASES: Record<SvnStatusEntry["status"], string> = {
  added: "新增了",
  modified: "更新了",
  deleted: "移除了",
  untracked: "新增了",
  missing: "移除了",
  conflict: "存在冲突："
};

export type SummaryDiffLine = {
  content: string;
  type: "added" | "deleted" | "unchanged";
};

export type SummaryDiffProvider = (entry: SvnStatusEntry) => Promise<SummaryDiffLine[]>;

const NOISE_PATTERNS = [
  /^-{3,}$/,
  /^\*{3,}$/,
  /^_{3,}$/,
  /^todo[:：]?$/i,
  /^fixme[:：]?$/i,
  /^更新时间[:：]?$/,
  /^last\s*updated[:：]?$/i,
  /^待办[:：]?$/,
  /^note[:：]?$/i,
  /^备注[:：]?$/
];

function normalizeTopicText(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/^>+\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[：:。.!?]+$/g, "");
}

function isNoisyTopic(text: string): boolean {
  if (!text || text.length < 2) {
    return true;
  }
  return NOISE_PATTERNS.some((pattern) => pattern.test(text));
}

function extractTopicFromFileName(fileName: string): string | null {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const withoutDatePrefix = baseName.replace(/^\d{4}[-_]\d{2}[-_]\d{2}[_-]?/, "");
  const normalized = withoutDatePrefix.replace(/[_-]+/g, "").trim();
  if (isNoisyTopic(normalized)) {
    return null;
  }
  return normalized.length > 24 ? `${normalized.slice(0, 24)}...` : normalized;
}

function extractTopicFromLines(lines: SummaryDiffLine[], preferredTypes: SummaryDiffLine["type"][]): string | null {
  const prioritized: SummaryDiffLine[] = [];

  for (const type of preferredTypes) {
    prioritized.push(...lines.filter((line) => line.type === type));
  }

  for (const line of prioritized) {
    const raw = line.content.trim();
    if (!raw) {
      continue;
    }
    if (raw.startsWith("```")) {
      continue;
    }

    const headingMatch = raw.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch?.[1]) {
      const topic = normalizeTopicText(headingMatch[1]);
      if (!isNoisyTopic(topic)) {
        return topic;
      }
      continue;
    }

    const listMatch = raw.match(/^[-*+]\s+(.+)$/) || raw.match(/^\d+\.\s+(.+)$/);
    if (listMatch?.[1]) {
      const topic = normalizeTopicText(listMatch[1]);
      if (!isNoisyTopic(topic)) {
        return topic;
      }
      continue;
    }

    if (raw.length >= 3) {
      const normalized = normalizeTopicText(raw);
      if (isNoisyTopic(normalized)) {
        continue;
      }
      return normalized.length > 24 ? `${normalized.slice(0, 24)}...` : normalized;
    }
  }

  return null;
}

async function buildContentPhrase(
  entries: SvnStatusEntry[],
  dominantStatus: SvnStatusEntry["status"] | undefined,
  dominantFolder: string,
  diffProvider?: SummaryDiffProvider
): Promise<string> {
  const topFolder = dominantFolder || "项目";
  if (!dominantStatus) {
    return `${topFolder}更新了内容`;
  }

  if (!diffProvider) {
    return `${topFolder}${ACTION_PHRASES[dominantStatus]}内容`;
  }

  const candidates = entries
    .filter((entry) => entry.status === dominantStatus || (dominantStatus === "modified" && entry.status === "added"))
    .slice(0, 3);

  for (const entry of candidates) {
    try {
      const lines = await diffProvider(entry);
      const preferredTypes: SummaryDiffLine["type"][] =
        dominantStatus === "deleted" || dominantStatus === "missing"
          ? ["deleted", "unchanged", "added"]
          : ["added", "unchanged", "deleted"];
      const topic = extractTopicFromLines(lines, preferredTypes);
      if (topic) {
        return `${topFolder}${ACTION_PHRASES[dominantStatus]}${topic}`;
      }
    } catch {
      // 忽略单文件 diff 异常，继续尝试下一个文件
    }

    const fileNameTopic = extractTopicFromFileName(entry.fileName);
    if (fileNameTopic) {
      return `${topFolder}${ACTION_PHRASES[dominantStatus]}${fileNameTopic}`;
    }
  }

  const fallbackTopic = entries[0] ? extractTopicFromFileName(entries[0].fileName) : null;
  return `${topFolder}${ACTION_PHRASES[dominantStatus]}${fallbackTopic ?? (entries[0]?.fileName ?? "内容")}`;
}

async function buildActionSummary(entries: SvnStatusEntry[], diffProvider?: SummaryDiffProvider): Promise<string> {
  const statusCounts = entries.reduce<Record<SvnStatusEntry["status"], number>>(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { added: 0, modified: 0, deleted: 0, conflict: 0, untracked: 0, missing: 0 }
  );

  const actionParts = STATUS_ORDER
    .filter((status) => statusCounts[status] > 0)
    .map((status) => `${LABELS[status]}${statusCounts[status]}个文件`);

  const folderCounts = entries.reduce<Record<string, number>>((acc, item) => {
    const topFolder = item.path.split("/")[0] || item.path;
    acc[topFolder] = (acc[topFolder] ?? 0) + 1;
    return acc;
  }, {});

  const primaryFolders = Object.entries(folderCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1)
    .map(([folder]) => folder);

  if (!actionParts.length) {
    return "更新了项目文件";
  }

  const dominantStatus = STATUS_ORDER.find((status) => statusCounts[status] > 0);
  const contentPhrase = await buildContentPhrase(entries, dominantStatus, primaryFolders[0] ?? "项目", diffProvider);

  if (primaryFolders.length) {
    return `${actionParts.join("，")}，${contentPhrase}`;
  }

  return actionParts.join("，");
}

export async function generateSummaryWithFallback(entries: SvnStatusEntry[], diffProvider?: SummaryDiffProvider): Promise<string> {
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

  // 基于当前变更生成自然语言摘要
  const summary = await buildActionSummary(entries, diffProvider);
  
  // 生成文件清单
  const fileList = Object.entries(grouped).map(([status, paths]) => {
    return `## ${status}文件\n${paths.map(path => `- ${path}`).join("\n")}`;
  }).join("\n\n");

  return `${summary}\n\n${fileList}`;
}
