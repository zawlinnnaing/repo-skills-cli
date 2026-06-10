import * as p from "@clack/prompts";
import { PROVIDERS, type Provider } from "../providers/registry.js";

export async function selectProviders(): Promise<Provider[]> {
  const selected = await p.multiselect({
    message: "Select AI providers",
    options: PROVIDERS.map((provider) => ({
      value: provider.id,
      label: provider.label,
      hint: provider.needsSymlink
        ? provider.skillsDir
        : `${provider.skillsDir} (canonical, no symlink)`,
    })),
    required: true,
  });

  if (p.isCancel(selected)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  return PROVIDERS.filter((provider) =>
    (selected as string[]).includes(provider.id),
  );
}
