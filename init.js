import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createInterface } from 'node:readline/promises';

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

console.log(`\n  ${c.bold}istd-bmad init${c.reset}`);
console.log(`  Set up a project for iStdBMAD\n`);
info(`📁 ${cwd}\n`);

// ── Prompts ──────────────────────────────────────────────────────────────────

let projectName = folderName;
let serverUrl = 'http://localhost:3000/sse';

if (!yes) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const answer = await rl.question(`  Project name [${folderName}]: `);
  if (answer.trim()) projectName = answer.trim();

  const urlAnswer = await rl.question(`  iStdBMAD server URL [http://localhost:3000/sse]: `);
  if (urlAnswer.trim()) serverUrl = urlAnswer.trim();

  rl.close();
  console.log();
}

// ── .mcp.json ────────────────────────────────────────────────────────────────

const mcpPath = join(cwd, '.mcp.json');
if (existsSync(mcpPath)) {
  skip('.mcp.json already exists');
} else {
  await writeFile(mcpPath, JSON.stringify({
    mcpServers: {
      iStdBMAD: { type: 'sse', url: serverUrl },
    },
  }, null, 2) + '\n');
  ok(`.mcp.json created → iStdBMAD at ${serverUrl}`);
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
    4. Open Claude Code:               ${c.dim}claude${c.reset}
    5. Type:                           ${c.dim}use bmad-help${c.reset}
`);
