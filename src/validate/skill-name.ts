const SKILL_NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function validateSkillName(name: string): void {
  if (!name) {
    throw new Error("Skill name is required");
  }
  if (!SKILL_NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid skill name "${name}". Use kebab-case (e.g. my-skill).`,
    );
  }
}
