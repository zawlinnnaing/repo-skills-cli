import { lstat, readlink, rm, symlink } from "node:fs/promises";
import path from "node:path";

export interface SymlinkResult {
  action: "created" | "skipped" | "replaced";
  linkPath: string;
}

export async function isCorrectSymlink(
  linkPath: string,
  expectedTarget: string,
): Promise<boolean> {
  try {
    const stat = await lstat(linkPath);
    if (!stat.isSymbolicLink()) {
      return false;
    }
    const actual = await readlink(linkPath);
    const resolvedActual = path.resolve(path.dirname(linkPath), actual);
    const resolvedExpected = path.resolve(expectedTarget);
    return resolvedActual === resolvedExpected;
  } catch {
    return false;
  }
}

export async function createRelativeSymlink(
  linkPath: string,
  targetPath: string,
  options: { yes: boolean },
): Promise<SymlinkResult> {
  const relativeTarget = path.relative(path.dirname(linkPath), targetPath);

  if (await isCorrectSymlink(linkPath, targetPath)) {
    return { action: "skipped", linkPath };
  }

  let wasReplaced = false;

  try {
    const stat = await lstat(linkPath);
    if (stat.isSymbolicLink()) {
      if (!options.yes) {
        throw new Error(
          `Symlink already exists at ${linkPath} but points elsewhere. Use -y to replace it.`,
        );
      }
      await rm(linkPath);
      wasReplaced = true;
    } else {
      throw new Error(
        `Path already exists and is not a symlink: ${linkPath}`,
      );
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }

  try {
    await symlink(relativeTarget, linkPath);
  } catch (err) {
    const message = (err as NodeJS.ErrnoException).message;
    throw new Error(
      `Failed to create symlink at ${linkPath}: ${message}. On Windows, enable Developer Mode or run as Administrator.`,
    );
  }

  return { action: wasReplaced ? "replaced" : "created", linkPath };
}
