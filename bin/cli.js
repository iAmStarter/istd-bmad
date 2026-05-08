#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const skillsDir = join(root, '.claude', 'skills');
const args = process.argv.slice(2);
const cmd = args[0];

if (cmd === '--help' || cmd === '-h') {
  console.log(`
istd-bmad — BMAD MCP Server

Usage:
  istd-bmad               Start the MCP server
  istd-bmad start         Start the MCP server
  istd-bmad setup         Install BMAD skills (run once after install)
  istd-bmad init          Set up a project in the current directory
  istd-bmad init --yes    Set up a project with defaults (no prompts)

Examples:
  # First time
  npx istd-bmad setup
  npx istd-bmad

  # New project
  mkdir my-app && cd my-app
  npx istd-bmad init
`);
  process.exit(0);
}

// istd-bmad setup
if (cmd === 'setup') {
  await import('../setup.js');
  process.exit(0);
}

// istd-bmad init
if (cmd === 'init') {
  await import('../init.js');
  process.exit(0);
}

// istd-bmad / istd-bmad start
if (!existsSync(skillsDir)) {
  console.error('\n❌  BMAD skills not installed. Run first:\n\n    istd-bmad setup\n');
  process.exit(1);
}

await import('../server.js');
