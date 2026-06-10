import { execSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { lstat, mkdtemp, readFile, readlink, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSkill } from "../src/create-skill.js";
import { isCorrectSymlink } from "../src/fs/symlink.js";
import { parseAgentArg, resolveProviders } from "../src/providers/registry.js";
import { renderSkillMd } from "../src/template/skill-md.js";
import { validateSkillName } from "../src/validate/skill-name.js";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "repo-skills-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true });
  }
});

describe("validateSkillName", () => {
  it("accepts valid kebab-case names", () => {
    expect(() => validateSkillName("my-skill")).not.toThrow();
    expect(() => validateSkillName("speckit-plan")).not.toThrow();
  });

  it("rejects invalid names", () => {
    expect(() => validateSkillName("")).toThrow("required");
    expect(() => validateSkillName("MySkill")).toThrow("Invalid skill name");
    expect(() => validateSkillName("my_skill")).toThrow("Invalid skill name");
    expect(() => validateSkillName("-leading")).toThrow("Invalid skill name");
  });
});

describe("renderSkillMd", () => {
  it("renders frontmatter only without body", () => {
    const content = renderSkillMd("my-skill");
    expect(content).toBe(`---
name: my-skill
description: ""
---
`);
  });
});

describe("parseAgentArg", () => {
  it("parses comma-separated and repeatable values", () => {
    expect(parseAgentArg(["cursor,claude"])).toEqual(["cursor", "claude"]);
    expect(parseAgentArg(["cursor", "claude"])).toEqual(["cursor", "claude"]);
    expect(parseAgentArg(["cursor, claude", "windsurf"])).toEqual([
      "cursor",
      "claude",
      "windsurf",
    ]);
  });
});

describe("resolveProviders", () => {
  it("resolves known providers", () => {
    const providers = resolveProviders(["cursor", "claude"]);
    expect(providers.map((p) => p.id)).toEqual(["cursor", "claude"]);
  });

  it("throws for unknown providers", () => {
    expect(() => resolveProviders(["unknown"])).toThrow("Unknown provider");
  });
});

describe("createSkill", () => {
  it("creates canonical dir and SKILL.md with correct frontmatter", async () => {
    const cwd = await makeTempDir();
    const result = await createSkill({
      skillName: "my-skill",
      agents: ["cursor"],
      interactive: false,
      cwd,
    });

    const content = await readFile(result.skillMdPath, "utf-8");
    expect(content).toBe(renderSkillMd("my-skill"));
    expect(result.canonicalPath).toBe(
      path.join(realpathSync(cwd), ".agents", "skills", "my-skill"),
    );
  });

  it("creates symlinks for cursor and claude with correct targets", async () => {
    const cwd = await makeTempDir();
    await createSkill({
      skillName: "my-skill",
      agents: ["cursor", "claude"],
      interactive: false,
      cwd,
    });

    const canonical = path.join(cwd, ".agents", "skills", "my-skill");
    const cursorLink = path.join(cwd, ".cursor", "skills", "my-skill");
    const claudeLink = path.join(cwd, ".claude", "skills", "my-skill");

    expect(await isCorrectSymlink(cursorLink, canonical)).toBe(true);
    expect(await isCorrectSymlink(claudeLink, canonical)).toBe(true);

    const cursorStat = await lstat(cursorLink);
    expect(cursorStat.isSymbolicLink()).toBe(true);
    const cursorTarget = await readlink(cursorLink);
    expect(path.resolve(path.dirname(cursorLink), cursorTarget)).toBe(
      path.resolve(canonical),
    );
  });

  it("does not create extra symlink for codex", async () => {
    const cwd = await makeTempDir();
    const result = await createSkill({
      skillName: "my-skill",
      agents: ["codex"],
      interactive: false,
      cwd,
    });

    expect(result.symlinks).toHaveLength(0);
    expect(result.codexNote).toBe(true);

    const windsurfLink = path.join(cwd, ".windsurf", "skills", "my-skill");
    await expect(lstat(windsurfLink)).rejects.toThrow();
  });

  it("rejects when canonical skill already exists", async () => {
    const cwd = await makeTempDir();
    await createSkill({
      skillName: "my-skill",
      agents: ["cursor"],
      interactive: false,
      cwd,
    });

    await expect(
      createSkill({
        skillName: "my-skill",
        agents: ["cursor"],
        interactive: false,
        cwd,
      }),
    ).rejects.toThrow("Skill already exists");
  });

  it("is idempotent when symlinks already point correctly", async () => {
    const cwd = await makeTempDir();
    await createSkill({
      skillName: "my-skill",
      agents: ["cursor"],
      interactive: false,
      cwd,
    });

    await expect(
      createSkill({
        skillName: "my-skill",
        agents: ["cursor"],
        interactive: false,
        cwd,
      }),
    ).rejects.toThrow("Skill already exists");
  });

  it("creates windsurf symlink", async () => {
    const cwd = await makeTempDir();
    await createSkill({
      skillName: "my-skill",
      agents: ["windsurf"],
      interactive: false,
      cwd,
    });

    const canonical = path.join(cwd, ".agents", "skills", "my-skill");
    const windsurfLink = path.join(cwd, ".windsurf", "skills", "my-skill");
    expect(await isCorrectSymlink(windsurfLink, canonical)).toBe(true);
  });

  it("uses git root when cwd is implicit inside a git repo", async () => {
    const cwd = await makeTempDir();
    execSync("git init", { cwd, stdio: "pipe" });

    const subdir = path.join(cwd, "packages", "app");
    await import("node:fs/promises").then((fs) =>
      fs.mkdir(subdir, { recursive: true }),
    );

    const originalCwd = process.cwd();
    process.chdir(subdir);
    try {
      const result = await createSkill({
        skillName: "my-skill",
        agents: ["cursor"],
        interactive: false,
      });

      expect(result.canonicalPath).toBe(
        path.join(realpathSync(cwd), ".agents", "skills", "my-skill"),
      );
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("uses explicit cwd as project root even inside a git repo", async () => {
    const cwd = await makeTempDir();
    execSync("git init", { cwd, stdio: "pipe" });

    const examples = path.join(cwd, "examples");
    await import("node:fs/promises").then((fs) =>
      fs.mkdir(examples, { recursive: true }),
    );

    const result = await createSkill({
      skillName: "my-skill",
      agents: ["cursor"],
      interactive: false,
      cwd: examples,
    });

    expect(result.canonicalPath).toBe(
      path.join(realpathSync(examples), ".agents", "skills", "my-skill"),
    );
  });
});
