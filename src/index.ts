import { Command } from "commander";
import {
  createSkill,
  formatCreateResult,
} from "./create-skill.js";
import { resolveProjectRoot } from "./fs/paths.js";

const program = new Command();

program
  .name("repo-skills")
  .description(
    "Scaffold a repo skill at .agents/skills/ and symlink to AI provider directories",
  )
  .argument("<skill-name>", "Skill name in kebab-case")
  .option(
    "-a, --agent <agents...>",
    "Target providers (cursor, claude, codex, windsurf). Comma-separated or repeatable.",
  )
  .option("-y, --yes", "Replace broken symlinks without prompting")
  .option("--cwd <path>", "Working directory override")
  .action(async (skillName: string, opts: { agent?: string[]; yes?: boolean; cwd?: string }) => {
    try {
      const result = await createSkill({
        skillName,
        agents: opts.agent,
        yes: opts.yes,
        cwd: opts.cwd,
        interactive: !opts.agent?.length,
      });

      const projectRoot = resolveProjectRoot(opts.cwd ?? process.cwd());
      console.log(formatCreateResult(result, projectRoot));
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program.parse();
