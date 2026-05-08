#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const skillsDir = join(root, '.claude', 'skills');
const args = process.argv.slice(2);

// istd-bmad setup
if (args[0] === 'setup') {
  const { default: setup } = await import('../setup.js');
  process.exit(0);
}

// istd-bmad start  (or no args)
if (!existsSync(skillsDir)) {
  console.error('\n❌  BMAD skills not installed. Run first:\n\n    istd-bmad setup\n');
  process.exit(1);
}

await import('../server.js');
