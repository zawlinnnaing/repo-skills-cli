import { access, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureDir } from "./fs/mkdir.js";
import {
  getCanonicalSkillPath,
  getProviderSkillPath,
  resolveExplicitProjectRoot,
  resolveProjectRoot,
} from "./fs/paths.js";
import { createRelativeSymlink, type SymlinkResult } from "./fs/symlink.js";
import { selectProviders } from "./prompts/select-providers.js";
import {
  parseAgentArg,
  resolveProviders,
  type Provider,
} from "./providers/registry.js";
import { renderSkillMd } from "./template/skill-md.js";
import { validateSkillName } from "./validate/skill-name.js";

export interface CreateSkillOptions {
  skillName: string;
  agents?: string[];
  yes?: boolean;
  cwd?: string;
  interactive?: boolean;
}

export interface CreateSkillResult {
  canonicalPath: string;
  skillMdPath: string;
  symlinks: SymlinkResult[];
  codexNote: boolean;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveSelectedProviders(
  options: CreateSkillOptions,
): Promise<Provider[]> {
  if (options.agents && options.agents.length > 0) {
    return resolveProviders(parseAgentArg(options.agents));
  }
  if (options.interactive === false) {
    throw new Error("No providers specified. Use --agent to select providers.");
  }
  return selectProviders();
}

export async function createSkill(
  options: CreateSkillOptions,
): Promise<CreateSkillResult> {
  validateSkillName(options.skillName);

  const projectRoot =
    options.cwd !== undefined
      ? resolveExplicitProjectRoot(options.cwd)
      : resolveProjectRoot(process.cwd());
  const canonicalPath = getCanonicalSkillPath(projectRoot, options.skillName);
  const skillMdPath = path.join(canonicalPath, "SKILL.md");

  if (await pathExists(canonicalPath)) {
    throw new Error(
      `Skill already exists at ${path.relative(projectRoot, canonicalPath)}`,
    );
  }

  const providers = await resolveSelectedProviders(options);

  await ensureDir(canonicalPath);
  await writeFile(skillMdPath, renderSkillMd(options.skillName), "utf-8");

  const symlinks: SymlinkResult[] = [];
  let codexNote = false;

  for (const provider of providers) {
    if (!provider.needsSymlink) {
      codexNote = true;
      continue;
    }

    const linkPath = getProviderSkillPath(
      projectRoot,
      provider.skillsDir,
      options.skillName,
    );
    await ensureDir(path.dirname(linkPath));
    const result = await createRelativeSymlink(linkPath, canonicalPath, {
      yes: options.yes ?? false,
    });
    symlinks.push(result);
  }

  return {
    canonicalPath,
    skillMdPath,
    symlinks,
    codexNote,
  };
}

export function formatCreateResult(
  result: CreateSkillResult,
  projectRoot: string,
): string {
  const lines: string[] = [
    `Created ${path.relative(projectRoot, result.canonicalPath)}/`,
    `  SKILL.md`,
  ];

  for (const { action, linkPath } of result.symlinks) {
    const rel = path.relative(projectRoot, linkPath);
    if (action === "skipped") {
      lines.push(`Skipped ${rel} (symlink already correct)`);
    } else if (action === "replaced") {
      lines.push(`Replaced ${rel} → canonical`);
    } else {
      lines.push(`Linked ${rel} → canonical`);
    }
  }

  if (result.codexNote) {
    lines.push("Codex uses .agents/skills/ directly (no symlink needed)");
  }

  return lines.join("\n");
}
