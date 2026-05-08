#!/usr/bin/env node
// One-time setup: installs BMAD skills into this server directory
import { execa } from 'execa';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.cwd();
const skillsDir = join(dir, '.claude', 'skills');

if (existsSync(skillsDir)) {
  console.log('✅ BMAD skills already installed. Run with --force to reinstall.');
  if (!process.argv.includes('--force')) process.exit(0);
}

console.log('Installing BMAD-METHOD skills...');

await execa(
  'npx',
  ['bmad-method', 'install', '--yes', '--directory', dir, '--tools', 'claude-code'],
  { stdio: 'inherit' }
);

console.log('\n✅ Setup complete. Run: npm start');
