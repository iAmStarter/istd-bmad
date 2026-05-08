# iStdBMAD

BMAD-METHOD MCP server for local network — serves all 42 BMAD AI development skills to every project on your machine (or team network) from a single installation.

Works with **Claude Code, Cursor, Windsurf, GitHub Copilot, Cline, Codex, Gemini CLI, and more.**

---

## Support this project

If iStdBMAD saves you time, consider buying me a coffee ☕

<p align="center">
  <img src="https://raw.githubusercontent.com/iAmStarter/istd-bmad/main/assets/donate.webp" alt="Donate via PayPal — Theerasak Duangkaew" width="220" />
  <br/>
  <sub>Scan to pay · Theerasak Duangkaew</sub>
</p>

---

## What it does

- Runs a **local MCP server** that connects to Claude Code, Cursor, Windsurf, GitHub Copilot, and more
- Serves all **BMAD-METHOD skills** (create PRD, architecture, stories, dev story, code review, etc.)
- **Reads your project's `docs/`** and `CLAUDE.md` automatically — every skill gets your project context injected
- Shows a **live web dashboard** to see connected sessions and skill activity
- Works across your **whole local network** — one server, every developer and every tool

---

## Prerequisites

- Node.js 20+
- At least one supported AI tool (Claude Code, Cursor, Windsurf, GitHub Copilot, Cline, Codex, Gemini CLI, etc.)
- Git

---

## Installation

The fastest path uses `npx` — no clone, no `npm install`. Skills install into a stable home directory (`~/.istd-bmad/`) so the server can find them on every run.

```bash
npx istd-bmad setup       # interactive: pick which tools to install for
npx istd-bmad start       # start the MCP server
```

Or install globally so the `istd-bmad` command is always available:

```bash
npm install -g istd-bmad
istd-bmad setup
istd-bmad start
```

### Setup options

```bash
npx istd-bmad setup --yes                          # recommended defaults
npx istd-bmad setup --tools claude-code,cursor     # explicit tool list
npx istd-bmad setup --force                        # reinstall / upgrade BMAD
```

**Supported tools:** `claude-code`, `cursor`, `windsurf`, `github-copilot`, `cline`, `roo`, `codex`, `gemini`, `replit`

### Where skills are installed

Default: `~/.istd-bmad/` (and `~/.istd-bmad/.claude/skills/` for the BMAD skill files).

Override with the `ISTD_BMAD_HOME` env var:

```bash
ISTD_BMAD_HOME=/opt/istd-bmad npx istd-bmad setup
ISTD_BMAD_HOME=/opt/istd-bmad npx istd-bmad start
```

---

## Starting the server

```bash
npx istd-bmad start
# or, if installed globally:
istd-bmad start
```

You will see:

```
✅ Loaded 42 BMAD skills

╔══════════════════════════════════════════════════════════════╗
║                 iStdBMAD — MCP Server                        ║
╠══════════════════════════════════════════════════════════════╣
║  Web Dashboard:  http://localhost:3000/                      ║
║                  http://192.168.1.x:3000/                    ║
║  MCP endpoint:   http://localhost:3000/sse                   ║
║                  http://192.168.1.x:3000/sse                 ║
╚══════════════════════════════════════════════════════════════╝
```

Keep this terminal open while you work. The server must be running for Claude Code to use BMAD skills.

---

## Connect your AI tool (one-time per machine)

### Claude Code

Register the server globally so it's available in every Claude Code session:

```bash
claude mcp add --transport sse --scope user iStdBMAD http://localhost:3000/sse
```

**Verify** it's registered:

```bash
claude mcp list
```

You should see `iStdBMAD` in the list. Restart Claude Code after registering.

### Cursor / Windsurf / GitHub Copilot

These tools discover MCP servers via the config file in the project directory (created by `istd-bmad init`). No global registration needed — open the project and the connection is automatic.

### Cline / Roo Code

Open VS Code → sidebar → MCP Servers → Add → SSE → `http://localhost:3000/sse`

### Codex / Gemini CLI / Replit

BMAD skills are installed as local files (`.agents/skills/`). No server connection needed — the tool reads them directly from your project.

---

## Set up a project

Every project needs a `.mcp.json` so Claude Code knows to use iStdBMAD, plus a `docs/` folder for your project-specific documents.

### Option A — Use `istd-bmad init` (recommended)

```bash
cd my-project
npx istd-bmad init --yes
```

By default, init prompts you to choose which AI tools to configure. Pass `--tools` to skip the prompt:

```bash
npx istd-bmad init --yes --tools claude-code,cursor
npx istd-bmad init --yes --tools cursor,windsurf,github-copilot
```

This creates the appropriate MCP config file(s) for each selected tool:

| Tool | Config file created |
|------|---------------------|
| Claude Code | `.mcp.json` |
| Cursor | `.cursor/mcp.json` |
| Windsurf | `.windsurf/mcp.json` |
| GitHub Copilot (VS Code) | `.vscode/mcp.json` |
| Cline / Roo / Codex / Gemini | (printed as manual instructions) |

Plus the full project scaffold:

```
my-project/
├── .mcp.json              ← Claude Code config (if selected)
├── .cursor/mcp.json       ← Cursor config (if selected)
├── CLAUDE.md              ← project rules (fill in before starting)
├── docs/
│   ├── project-brief.md   ← describe your project here first
│   ├── prd.md
│   ├── architecture.md
│   └── stories/
└── .gitignore
```

### Option B — Manual (existing projects)

Create the MCP config file for your tool:

**Claude Code** — `.mcp.json`:
```json
{
  "mcpServers": {
    "iStdBMAD": { "type": "sse", "url": "http://localhost:3000/sse" }
  }
}
```

**Cursor** — `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "iStdBMAD": { "url": "http://localhost:3000/sse" }
  }
}
```

**Windsurf** — `.windsurf/mcp.json`:
```json
{
  "mcpServers": {
    "iStdBMAD": { "serverUrl": "http://localhost:3000/sse" }
  }
}
```

**GitHub Copilot (VS Code)** — `.vscode/mcp.json`:
```json
{
  "inputs": [],
  "servers": {
    "iStdBMAD": { "type": "sse", "url": "http://localhost:3000/sse" }
  }
}
```

**Cline / Roo Code**: Open VS Code → sidebar → MCP Servers → Add → SSE → `http://localhost:3000/sse`

**Codex / Gemini CLI / Replit**: BMAD skills are installed directly (no MCP config needed — skills live in `.agents/skills/`).

Create `docs/` folder and `CLAUDE.md` manually (see templates below).

---

## First use in a project

### 1. Fill in `docs/project-brief.md`

This is the most important step. iStdBMAD reads this to understand your project before injecting context into any skill.

```markdown
# My Project — Project Brief

## What is this?
A web app that lets restaurant owners manage their menu and orders in real time.

## Key Goals
- [ ] Menu management (add, edit, delete items)
- [ ] Real-time order tracking
- [ ] Role-based access (owner, staff)

## Tech Stack
- Language: TypeScript
- Framework: Next.js 14
- Database: PostgreSQL + Prisma

## Constraints
- Must work offline for staff tablets
- Must handle 100 concurrent orders

## Success Looks Like
Staff can take orders without paper. Owner can update menu instantly.
```

### 2. Fill in `CLAUDE.md`

Rules Claude Code will follow in every conversation in this project:

```markdown
# My Project — Claude Rules

## Project Overview
Restaurant management web app. TypeScript + Next.js + PostgreSQL.

## Required Reading (before any code change)
- docs/prd.md           — requirements
- docs/architecture.md  — technical decisions

## Hard Rules
### MUST NOT
- Never skip tests
- Never use `any` in TypeScript
- Never commit directly to main

### MUST
- Follow architecture in docs/architecture.md
- Run `npm test` before marking a story done

## BMAD Workflow
1. bmad-help                     → get oriented
2. bmad-create-prd               → write docs/prd.md
3. bmad-create-architecture      → write docs/architecture.md
4. bmad-create-epics-and-stories → write docs/stories/
5. bmad-dev-story                → implement a story
6. bmad-code-review              → review before merge
```

### 3. Open Claude Code in your project

```bash
cd my-project
claude
```

Claude Code will connect to iStdBMAD automatically when it sees `.mcp.json`.

---

## BMAD Workflow (after setup)

### Getting started

```
use bmad-help
```

BMAD will look at your project state and tell you exactly what to do next.

### Full development cycle

| Step | Skill | Output |
|------|-------|--------|
| 1. Define the product | `bmad-create-prd` | `docs/prd.md` |
| 2. Design the system | `bmad-create-architecture` | `docs/architecture.md` |
| 3. Break into stories | `bmad-create-epics-and-stories` | `docs/stories/` |
| 4. Implement a story | `bmad-dev-story` | code |
| 5. Review code | `bmad-code-review` | review notes |
| 6. Plan the sprint | `bmad-sprint-planning` | sprint plan |

### Saving skill output to docs

After a skill runs and Claude produces a document, save it:

```
Save this as docs/prd.md using write_project_doc
```

Claude will call `write_project_doc` to save directly to your `docs/` folder.

### Reading project docs

```
Read docs/prd.md using read_project_doc
```

Or just invoke any skill — iStdBMAD injects the relevant docs automatically.

---

## Available BMAD Skills (42 total)

### Agents (specialists)
| Skill | Role |
|-------|------|
| `bmad-agent-pm` | Product Manager — requirements, priorities |
| `bmad-agent-architect` | System Architect — technical design |
| `bmad-agent-dev` | Senior Engineer — implementation |
| `bmad-agent-analyst` | Business Analyst — research, analysis |
| `bmad-agent-ux-designer` | UX Designer — user flows, wireframes |
| `bmad-agent-tech-writer` | Technical Writer — documentation |

### Planning & Documentation
| Skill | What it does |
|-------|-------------|
| `bmad-create-prd` | Write the Product Requirements Document |
| `bmad-create-architecture` | Design the system architecture |
| `bmad-create-epics-and-stories` | Break PRD into epics and user stories |
| `bmad-create-story` | Write a single detailed user story |
| `bmad-create-ux-design` | Create UX design specifications |
| `bmad-product-brief` | Write a concise product brief |
| `bmad-prfaq` | Write a PR/FAQ document (Amazon-style) |
| `bmad-document-project` | Generate project documentation |

### Development
| Skill | What it does |
|-------|-------------|
| `bmad-dev-story` | Implement a user story (full TDD flow) |
| `bmad-quick-dev` | Fast implementation for small tasks |
| `bmad-code-review` | Review code for quality and correctness |
| `bmad-check-implementation-readiness` | Check if ready to start a story |
| `bmad-correct-course` | Fix a story that went off track |

### Research & Analysis
| Skill | What it does |
|-------|-------------|
| `bmad-domain-research` | Research a domain or technology |
| `bmad-market-research` | Research the market and competitors |
| `bmad-technical-research` | Deep technical research |
| `bmad-brainstorming` | Structured brainstorming session |

### Sprint & Project Management
| Skill | What it does |
|-------|-------------|
| `bmad-sprint-planning` | Plan the next sprint |
| `bmad-sprint-status` | Report current sprint status |
| `bmad-retrospective` | Run a sprint retrospective |
| `bmad-generate-project-context` | Generate a project context summary |

### Testing
| Skill | What it does |
|-------|-------------|
| `bmad-qa-generate-e2e-tests` | Generate end-to-end tests |
| `bmad-validate-prd` | Validate PRD for completeness |

### Reviews & Editing
| Skill | What it does |
|-------|-------------|
| `bmad-review-adversarial-general` | Adversarial review of documents |
| `bmad-review-edge-case-hunter` | Find edge cases |
| `bmad-editorial-review-prose` | Review writing quality |
| `bmad-editorial-review-structure` | Review document structure |
| `bmad-edit-prd` | Edit and improve an existing PRD |

### Utilities
| Skill | What it does |
|-------|-------------|
| `bmad-help` | Get oriented — what to do next |
| `bmad-party-mode` | Creative brainstorming with multiple personas |
| `bmad-customize` | Customize BMAD for your team |
| `bmad-index-docs` | Index all project documentation |
| `bmad-shard-doc` | Split large documents into smaller parts |
| `bmad-distillator` | Summarize and distill content |

---

## MCP Tools (available to Claude)

Beyond skills, iStdBMAD exposes tools Claude can call directly:

| Tool | Description |
|------|-------------|
| `list_project_docs` | List all files in `docs/` |
| `read_project_doc` | Read a specific doc file |
| `write_project_doc` | Save content to `docs/<file>` |
| `get_project_rules` | Read `CLAUDE.md` |
| `update_project_rules` | Update `CLAUDE.md` |

---

## Web Dashboard

Open in any browser while the server is running:

```
http://localhost:3000/
```

Shows:
- **Active sessions** — which projects are connected right now
- **Live activity feed** — every skill call as it happens
- **Skills available** — all 42 BMAD skills
- **Stats** — uptime, session count, docs written

---

## Team / Network Usage

To share one server across multiple developers on the same network:

**On the server machine** (run once):
```bash
npx istd-bmad start
# Note the Network URL: http://192.168.x.x:3000/sse
```

**On each developer's machine** — register the server:
```bash
claude mcp add --transport sse --scope user iStdBMAD http://192.168.x.x:3000/sse
```

**In each project's `.mcp.json`** — use the network IP:
```json
{
  "mcpServers": {
    "iStdBMAD": {
      "type": "sse",
      "url": "http://192.168.x.x:3000/sse"
    }
  }
}
```

---

## Updating BMAD Skills

To get the latest BMAD-METHOD skills:

```bash
npx istd-bmad setup --force
npx istd-bmad start
```

All connected developers get the updated skills immediately — no action needed on their end.

---

## Troubleshooting

**Claude Code doesn't see iStdBMAD tools**
- Make sure the server is running (`npx istd-bmad start`)
- Restart Claude Code after registering with `claude mcp add`
- Check `claude mcp list` — `iStdBMAD` should be listed

**"No project root detected" in skill responses**
- Your project needs `.mcp.json` — run `npx istd-bmad init --yes` or create it manually
- Restart Claude Code after adding `.mcp.json`

**Skills loaded but no project context injected**
- Make sure `docs/project-brief.md` exists and has content
- The server reads `docs/` from whichever project Claude Code has open

**Server won't start — "Skills directory not found"**
- Run `npx istd-bmad setup` first to install BMAD skills
- Or check `~/.istd-bmad/.claude/skills/` exists (or `$ISTD_BMAD_HOME/.claude/skills/` if you set the override)

---

## Project Structure

The npm package itself:

```
istd-bmad/
├── bin/cli.js         ← CLI entry point (setup / init / start)
├── server.js          ← MCP server (SSE transport + web dashboard)
├── setup.js           ← One-time BMAD skill installer
├── init.js            ← Per-project scaffolder
├── tools.js           ← Supported tools registry
├── paths.js           ← Resolves install location
├── public/
│   └── index.html     ← Web dashboard UI
└── package.json
```

After running `npx istd-bmad setup`, BMAD skills live in your home directory (so any `npx istd-bmad start` invocation can find them):

```
~/.istd-bmad/                 ← override with $ISTD_BMAD_HOME
├── .claude/
│   └── skills/               ← 42 BMAD skill files
└── _bmad/                    ← BMAD core configuration
```
