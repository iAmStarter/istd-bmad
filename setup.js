#!/usr/bin/env node
// One-time setup: installs BMAD skills into the iStdBMAD home directory
// (default: ~/.istd-bmad/, override with ISTD_BMAD_HOME).
import { execa } from 'execa';
import { existsSync, mkdirSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { TOOLS, TOOL_IDS } from './tools.js';
import { INSTALL_DIR, SKILLS_DIR } from './paths.js';

const dir = INSTALL_DIR;
const skillsDir = SKILLS_DIR;
const args = process.argv.slice(2);
const force = args.includes('--force');
const yes = args.includes('--yes') || args.includes('-y');

if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
};

if (existsSync(skillsDir) && !force) {
  console.log('✅ BMAD skills already installed. Run with --force to reinstall.');
  process.exit(0);
}

// Parse --tools flag if provided
const toolsFlag = args.find((a) => a.startsWith('--tools='))?.slice('--tools='.length)
  ?? (args.includes('--tools') ? args[args.indexOf('--tools') + 1] : null);

let selectedIds;

if (toolsFlag) {
  selectedIds = toolsFlag.split(',').map((s) => s.trim()).filter(Boolean);
  const invalid = selectedIds.filter((id) => !TOOL_IDS.includes(id));
  if (invalid.length) {
    console.error(`\n❌  Unknown tool(s): ${invalid.join(', ')}\n    Valid: ${TOOL_IDS.join(', ')}\n`);
    process.exit(1);
  }
} else if (yes) {
  selectedIds = TOOLS.filter((t) => t.recommended).map((t) => t.id);
} else {
  // Interactive selection
  console.log(`\n  ${c.bold}istd-bmad setup${c.reset}`);
  console.log(`  Install BMAD-METHOD skills\n`);
  console.log(`  ${c.cyan}Select which tools to install skills for:${c.reset}\n`);

  TOOLS.forEach((t, i) => {
    const tag = t.recommended ? ` ${c.cyan}(recommended)${c.reset}` : '';
    console.log(`    ${c.bold}${i + 1}.${c.reset} ${t.name}${tag}`);
  });

  console.log(`\n  Enter numbers separated by commas, or press Enter for recommended defaults`);
  console.log(`  ${c.dim}Recommended: ${TOOLS.filter((t) => t.recommended).map((t) => t.name).join(', ')}${c.reset}\n`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('  Your selection: ');
  rl.close();

  if (!answer.trim()) {
    selectedIds = TOOLS.filter((t) => t.recommended).map((t) => t.id);
  } else {
    const indices = answer.split(',').map((s) => parseInt(s.trim(), 10) - 1);
    selectedIds = indices
      .filter((i) => i >= 0 && i < TOOLS.length)
      .map((i) => TOOLS[i].id);
  }

  if (!selectedIds.length) {
    console.error('\n❌  No valid tools selected.\n');
    process.exit(1);
  }

  console.log(`\n  Installing for: ${c.green}${selectedIds.map((id) => TOOLS.find((t) => t.id === id).name).join(', ')}${c.reset}\n`);
}

console.log(`Installing BMAD-METHOD skills to ${c.cyan}${dir}${c.reset}...\n`);

await execa(
  'npx',
  ['bmad-method', 'install', '--yes', '--directory', dir, '--tools', selectedIds.join(',')],
  { stdio: 'inherit' }
);

console.log(`\n${c.green}${c.bold}✅ Setup complete.${c.reset}`);
console.log(`  Skills installed at: ${c.dim}${dir}${c.reset}`);
console.log(`  Run: ${c.dim}npx istd-bmad start${c.reset}`);
console.log(`  ${c.dim}(or install globally: npm install -g istd-bmad → istd-bmad start)${c.reset}\n`);
