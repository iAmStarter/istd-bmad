import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { TOOLS, TOOL_IDS } from './tools.js';

const args = process.argv.slice(2);
const yes = args.includes('--yes') || args.includes('-y');
const cwd = process.cwd();
const folderName = basename(cwd);

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
};

const ok   = (msg) => console.log(`  ${c.green}✓${c.reset}  ${msg}`);
const skip = (msg) => console.log(`  ${c.dim}○  ${msg}${c.reset}`);
const info = (msg) => console.log(`  ${c.cyan}${msg}${c.reset}`);
const note = (msg) => console.log(`  ${c.yellow}→${c.reset}  ${msg}`);

console.log(`\n  ${c.bold}istd-bmad init${c.reset}`);
console.log(`  Set up a project for iStdBMAD\n`);
info(`📁 ${cwd}\n`);

// ── Parse --tools flag ────────────────────────────────────────────────────────

const toolsFlag = args.find((a) => a.startsWith('--tools='))?.slice('--tools='.length)
  ?? (args.includes('--tools') ? args[args.indexOf('--tools') + 1] : null);

// ── Prompts ──────────────────────────────────────────────────────────────────

let projectName = folderName;
let serverUrl = 'http://localhost:3000/sse';
let selectedIds;

if (!yes) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const nameAnswer = await rl.question(`  Project name [${folderName}]: `);
  if (nameAnswer.trim()) projectName = nameAnswer.trim();

  const urlAnswer = await rl.question(`  iStdBMAD server URL [http://localhost:3000/sse]: `);
  if (urlAnswer.trim()) serverUrl = urlAnswer.trim();

  if (toolsFlag) {
    selectedIds = toolsFlag.split(',').map((s) => s.trim()).filter(Boolean);
  } else {
    console.log(`\n  ${c.cyan}Select which AI tools to configure:${c.reset}\n`);
    TOOLS.forEach((t, i) => {
      const tag = t.recommended ? ` ${c.cyan}(recommended)${c.reset}` : '';
      console.log(`    ${c.bold}${i + 1}.${c.reset} ${t.name}${tag}`);
    });
    console.log(`\n  Enter numbers separated by commas, or press Enter for recommended defaults`);
    console.log(`  ${c.dim}Recommended: ${TOOLS.filter((t) => t.recommended).map((t) => t.name).join(', ')}${c.reset}\n`);

    const selAnswer = await rl.question('  Your selection: ');
    if (!selAnswer.trim()) {
      selectedIds = TOOLS.filter((t) => t.recommended).map((t) => t.id);
    } else {
      const indices = selAnswer.split(',').map((s) => parseInt(s.trim(), 10) - 1);
      selectedIds = indices
        .filter((i) => i >= 0 && i < TOOLS.length)
        .map((i) => TOOLS[i].id);
    }
  }

  rl.close();
  console.log();
} else {
  selectedIds = toolsFlag
    ? toolsFlag.split(',').map((s) => s.trim()).filter(Boolean)
    : TOOLS.filter((t) => t.recommended).map((t) => t.id);
}

// Validate
const invalid = selectedIds.filter((id) => !TOOL_IDS.includes(id));
if (invalid.length) {
  console.error(`\n❌  Unknown tool(s): ${invalid.join(', ')}\n    Valid: ${TOOL_IDS.join(', ')}\n`);
  process.exit(1);
}

const selectedTools = selectedIds.map((id) => TOOLS.find((t) => t.id === id));

// ── MCP config files ──────────────────────────────────────────────────────────

for (const tool of selectedTools) {
  if (!tool.mcp) continue;

  if (tool.mcp.dir) {
    await mkdir(join(cwd, tool.mcp.dir), { recursive: true });
  }

  const configPath = join(cwd, tool.mcp.file);
  if (existsSync(configPath)) {
    skip(`${tool.mcp.file} already exists (${tool.name})`);
  } else {
    const config = tool.mcp.build(serverUrl);
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
    ok(`${tool.mcp.file} created → ${tool.name} at ${serverUrl}`);
  }
}

// Print manual instructions for tools without file-based MCP config
const manualTools = selectedTools.filter((t) => !t.mcp);
if (manualTools.length) {
  console.log(`\n  ${c.yellow}Manual setup required for:${c.reset}`);
  for (const tool of manualTools) {
    console.log(`\n  ${c.bold}${tool.name}${c.reset}`);
    note(tool.mcpNote.replace('<server-url>', serverUrl));
  }
  console.log();
}

// ── docs/ structure ──────────────────────────────────────────────────────────

const docsDir = join(cwd, 'docs');
if (existsSync(docsDir)) {
  skip('docs/ already exists');
} else {
  await mkdir(join(docsDir, 'stories'), { recursive: true });

  await writeFile(join(docsDir, 'project-brief.md'), `# ${projectName} — Project Brief

## What is this?
[One paragraph: what this project does and who it's for]

## Key Goals
- [ ] Goal 1
- [ ] Goal 2

## Tech Stack
- Language:
- Framework:
- Database:

## Constraints
- [Hard constraints or requirements]

## Success Looks Like
[What does done look like?]
`);

  await writeFile(join(docsDir, 'prd.md'),
    `# ${projectName} — Product Requirements Document\n\n> Run \`bmad-create-prd\` to generate this.\n`);

  await writeFile(join(docsDir, 'architecture.md'),
    `# ${projectName} — Architecture\n\n> Run \`bmad-create-architecture\` to generate this.\n`);

  await writeFile(join(docsDir, 'stories', '.gitkeep'), '');

  ok('docs/ created (project-brief.md, prd.md, architecture.md, stories/)');
}

// ── CLAUDE.md ────────────────────────────────────────────────────────────────

const claudePath = join(cwd, 'CLAUDE.md');
if (existsSync(claudePath)) {
  skip('CLAUDE.md already exists');
} else {
  await writeFile(claudePath, `# ${projectName} — Claude Rules

## Project Overview
[What this project does, who it's for, key constraints]

## Tech Stack
- Language:
- Framework:
- Database:

## Required Reading (before any code change)
- docs/project-brief.md — what this project is
- docs/prd.md           — product requirements
- docs/architecture.md  — technical decisions

## Hard Rules
### MUST NOT
- Never skip tests before marking a story done
- Never commit secrets or credentials

### MUST
- Follow architecture in docs/architecture.md
- Keep docs/ up to date as the project evolves

## BMAD Workflow
1. bmad-help                      → get oriented
2. bmad-create-prd                → write docs/prd.md
3. bmad-create-architecture       → write docs/architecture.md
4. bmad-create-epics-and-stories  → create docs/stories/
5. bmad-dev-story                 → implement a story
6. bmad-code-review               → review before merge
`);
  ok('CLAUDE.md created');
}

// ── .gitignore ───────────────────────────────────────────────────────────────

const gitignorePath = join(cwd, '.gitignore');
if (existsSync(gitignorePath)) {
  skip('.gitignore already exists');
} else {
  await writeFile(gitignorePath, `node_modules/\n.env\n.env.local\n.DS_Store\ndist/\nbuild/\n*.log\n`);
  ok('.gitignore created');
}

// ── Done ─────────────────────────────────────────────────────────────────────

console.log(`
  ${c.green}${c.bold}✨ Done!${c.reset}

  Next steps:

    1. Fill in ${c.cyan}docs/project-brief.md${c.reset} — describe your project
    2. Fill in ${c.cyan}CLAUDE.md${c.reset} — set your project rules
    3. Make sure iStdBMAD is running:  ${c.dim}istd-bmad start${c.reset}
    4. Open your AI tool in this directory
    5. Type:                           ${c.dim}use bmad-help${c.reset}
`);
