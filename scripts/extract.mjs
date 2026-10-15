// Pull everything the website shows about a product out of its source project.
// Local project paths live in products.local.json (gitignored).
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const steps = ['extract-store-copy.mjs', 'extract-faq.mjs', 'extract-changelog.mjs', 'extract-privacy.mjs', 'extract-screenshots.mjs'];
const only = process.argv.slice(2);

let failed = false;
for (const step of steps) {
  if (only.length && !only.some((o) => step.includes(o))) continue;
  const r = spawnSync(process.execPath, [join(here, step)], { stdio: 'inherit' });
  if (r.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
