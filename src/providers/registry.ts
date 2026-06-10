export interface Provider {
  id: string;
  label: string;
  skillsDir: string;
  needsSymlink: boolean;
}

export const PROVIDERS: Provider[] = [
  {
    id: "cursor",
    label: "Cursor",
    skillsDir: ".cursor/skills",
    needsSymlink: true,
  },
  {
    id: "claude",
    label: "Claude Code",
    skillsDir: ".claude/skills",
    needsSymlink: true,
  },
  {
    id: "codex",
    label: "Codex",
    skillsDir: ".agents/skills",
    needsSymlink: false,
  },
  {
    id: "windsurf",
    label: "Windsurf",
    skillsDir: ".windsurf/skills",
    needsSymlink: true,
  },
];

export function getProvider(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function resolveProviders(ids: string[]): Provider[] {
  const unknown = ids.filter((id) => !getProvider(id));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown provider(s): ${unknown.join(", ")}. Valid: ${PROVIDERS.map((p) => p.id).join(", ")}`,
    );
  }
  return ids.map((id) => getProvider(id)!);
}

export function parseAgentArg(values: string[]): string[] {
  return values.flatMap((v) => v.split(",").map((s) => s.trim()).filter(Boolean));
}
