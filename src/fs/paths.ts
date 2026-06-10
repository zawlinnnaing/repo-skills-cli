import { execSync } from "node:child_process";
import { realpathSync } from "node:fs";
import path from "node:path";

export const CANONICAL_SKILLS_DIR = ".agents/skills";

export function resolveProjectRoot(cwd: string): string {
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return realpathSync(gitRoot);
  } catch {
    return realpathSync(cwd);
  }
}

export function getCanonicalSkillPath(projectRoot: string, skillName: string): string {
  return path.join(projectRoot, CANONICAL_SKILLS_DIR, skillName);
}

export function getProviderSkillPath(
  projectRoot: string,
  skillsDir: string,
  skillName: string,
): string {
  return path.join(projectRoot, skillsDir, skillName);
}

export function getRelativeSymlinkTarget(
  fromPath: string,
  toPath: string,
): string {
  return path.relative(path.dirname(fromPath), toPath);
}
