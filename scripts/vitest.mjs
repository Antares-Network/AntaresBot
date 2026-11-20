/**
 * Runs Vitest with a normalised working directory.
 *
 * Windows: when the working directory has a lower-case drive letter ("c:\...", which VS Code
 * terminals can start in), Vitest loads itself twice (once as c:/, once as C:/) and every
 * test file fails with "Vitest failed to find the current suite". Starting it from the
 * upper-case path avoids that. Elsewhere this is a plain pass-through.
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const cwd = process.cwd().replace(/^[a-z]:/, (drive) => drive.toUpperCase());
const result = spawnSync(process.execPath, [join(cwd, "node_modules", "vitest", "vitest.mjs"), ...process.argv.slice(2)], {
  cwd,
  stdio: "inherit",
});
process.exit(result.status ?? 1);
