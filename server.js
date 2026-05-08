import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  RootsListChangedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import { SKILLS_DIR } from './paths.js';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const START_TIME = Date.now();

// ── Load BMAD skill files ────────────────────────────────────────────────────
// Structure: .claude/skills/<skill-name>/SKILL.md

async function loadSkills() {
  if (!existsSync(SKILLS_DIR)) {
    console.error(`\n❌ Skills directory not found: ${SKILLS_DIR}`);
    console.error('   Run: istd-bmad setup\n');
    process.exit(1);
  }

  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const skillDirs = entries.filter((e) => e.isDirectory());

  if (skillDirs.length === 0) {
    console.error('\n❌ No skill directories found. Run: istd-bmad setup\n');
    process.exit(1);
  }

  const skills = {};
  for (const dir of skillDirs) {
    const skillFile = join(SKILLS_DIR, dir.name, 'SKILL.md');
    if (!existsSync(skillFile)) continue;

    const content = await readFile(skillFile, 'utf-8');
    const description = extractDescription(content) ?? `BMAD: ${dir.name.replace(/-/g, ' ')}`;
    skills[dir.name] = { content, description };
  }

  return skills;
}

function extractDescription(md) {
  const match = md.match(/^---[\s\S]*?description:\s*['"]?(.+?)['"]?\s*\n[\s\S]*?---/m);
  return match?.[1]?.trim() ?? null;
}

// ── Project context helpers ──────────────────────────────────────────────────

async function resolveRoot(server) {
  try {
    const { roots } = await server.listRoots();
    const fileRoot = roots.find((r) => r.uri.startsWith('file://'));
    if (!fileRoot) return null;
    return fileURLToPath(fileRoot.uri);
  } catch {
    return null;
  }
}

async function walkDocs(docsDir, base = docsDir) {
  const results = [];
  if (!existsSync(docsDir)) return results;

  const entries = await readdir(docsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = join(docsDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkDocs(full, base)));
    } else if (entry.isFile()) {
      results.push(relative(base, full));
    }
  }
  return results;
}

async function loadProjectContext(root) {
  if (!root) return null;

  const docsDir = join(root, 'docs');
  const claudeMdPath = join(root, 'CLAUDE.md');

  const docFiles = await walkDocs(docsDir);

  const snippets = [];
  for (const rel of docFiles.slice(0, 5)) {
    try {
      const text = await readFile(join(docsDir, rel), 'utf-8');
      snippets.push(`### docs/${rel}\n${text.slice(0, 600)}${text.length > 600 ? '\n...(truncated)' : ''}`);
    } catch {
      // skip unreadable
    }
  }

  let rules = null;
  if (existsSync(claudeMdPath)) {
    rules = await readFile(claudeMdPath, 'utf-8');
  }

  return {
    root,
    projectName: root.split('/').pop(),
    docFiles,
    snippets,
    rules,
  };
}

function injectContext(skillContent, ctx) {
  if (!ctx) return skillContent;

  const parts = [`${skillContent}`, `\n---\n## iStdBMAD: Project Context\n`];

  if (ctx.projectName) parts.push(`**Project:** ${ctx.projectName}`);

  if (ctx.rules) {
    parts.push(`\n**Project Rules (CLAUDE.md):**\n${ctx.rules}`);
  }

  if (ctx.docFiles.length > 0) {
    parts.push(`\n**Available Docs:** ${ctx.docFiles.join(', ')}`);
  }

  if (ctx.snippets.length > 0) {
    parts.push(`\n**Doc Previews:**\n${ctx.snippets.join('\n\n')}`);
  }

  return parts.join('\n');
}

// ── Activity log (for Web UI) ────────────────────────────────────────────────

const activityLog = [];
const uiClients = new Set();

function logActivity(event) {
  const entry = { time: new Date().toISOString(), ...event };
  activityLog.unshift(entry);
  if (activityLog.length > 200) activityLog.pop();

  const data = `data: ${JSON.stringify(entry)}\n\n`;
  for (const res of uiClients) {
    try { res.write(data); } catch { uiClients.delete(res); }
  }
}

// ── MCP Server factory ───────────────────────────────────────────────────────

function createMcpServer(skills, sessionMeta) {
  const server = new Server(
    { name: 'iStdBMAD', version: '1.0.0' },
    { capabilities: { tools: {}, prompts: {}, resources: {}, roots: { listChanged: true } } }
  );

  // ── Roots change notification ──────────────────────────────────────────────
  server.setNotificationHandler(RootsListChangedNotificationSchema, async () => {
    const newRoot = await resolveRoot(server);
    if (newRoot) {
      sessionMeta.projectRoot = newRoot;
      sessionMeta.projectName = newRoot.split('/').pop();
      logActivity({ type: 'root_changed', project: sessionMeta.projectName, root: newRoot });
    }
  });

  // ── Tools: BMAD skills ─────────────────────────────────────────────────────
  const docTools = [
    {
      name: 'list_project_docs',
      description: 'List all files in the current project docs/ folder',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'read_project_doc',
      description: 'Read a file from the current project docs/ folder',
      inputSchema: {
        type: 'object',
        required: ['path'],
        properties: {
          path: { type: 'string', description: 'Relative path inside docs/ (e.g. "prd.md")' },
        },
      },
    },
    {
      name: 'write_project_doc',
      description: 'Save content to a file in the current project docs/ folder',
      inputSchema: {
        type: 'object',
        required: ['path', 'content'],
        properties: {
          path: { type: 'string', description: 'Relative path inside docs/ (e.g. "prd.md")' },
          content: { type: 'string', description: 'File content to save' },
        },
      },
    },
    {
      name: 'get_project_rules',
      description: 'Read the CLAUDE.md project rules file',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'update_project_rules',
      description: 'Update the CLAUDE.md project rules file',
      inputSchema: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', description: 'New CLAUDE.md content' },
        },
      },
    },
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      ...Object.entries(skills).map(([name, { description }]) => ({
        name,
        description,
        inputSchema: {
          type: 'object',
          properties: {
            context: { type: 'string', description: 'Extra context or instructions' },
          },
        },
      })),
      ...docTools,
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;

    logActivity({ type: 'tool_call', skill: name, project: sessionMeta.projectName ?? '(unknown)' });

    // ── Doc management tools ─────────────────────────────────────────────────
    const root = sessionMeta.projectRoot;

    if (name === 'list_project_docs') {
      if (!root) return text('No project root detected. Open a project in Claude Code.');
      const files = await walkDocs(join(root, 'docs'));
      return text(files.length ? files.join('\n') : '(docs/ folder is empty)');
    }

    if (name === 'read_project_doc') {
      if (!root) return text('No project root detected.');
      const safePath = safeDocPath(root, args?.path);
      if (!safePath) return error('Invalid path');
      if (!existsSync(safePath)) return text(`File not found: docs/${args.path}`);
      return text(await readFile(safePath, 'utf-8'));
    }

    if (name === 'write_project_doc') {
      if (!root) return text('No project root detected.');
      const safePath = safeDocPath(root, args?.path);
      if (!safePath) return error('Invalid path — must be inside docs/');
      await mkdir(dirname(safePath), { recursive: true });
      await writeFile(safePath, args.content ?? '', 'utf-8');
      logActivity({ type: 'doc_written', file: `docs/${args.path}`, project: sessionMeta.projectName });
      return text(`Saved to docs/${args.path}`);
    }

    if (name === 'get_project_rules') {
      if (!root) return text('No project root detected.');
      const p = join(root, 'CLAUDE.md');
      return text(existsSync(p) ? await readFile(p, 'utf-8') : '(CLAUDE.md not found)');
    }

    if (name === 'update_project_rules') {
      if (!root) return text('No project root detected.');
      await writeFile(join(root, 'CLAUDE.md'), args?.content ?? '', 'utf-8');
      logActivity({ type: 'rules_updated', project: sessionMeta.projectName });
      return text('CLAUDE.md updated.');
    }

    // ── BMAD skill invocation ────────────────────────────────────────────────
    const skill = skills[name];
    if (!skill) return error(`Unknown skill: ${name}`);

    const ctx = await loadProjectContext(root);
    const body = injectContext(
      args?.context ? `${skill.content}\n\n---\n## Additional Context\n${args.context}` : skill.content,
      ctx
    );

    return text(body);
  });

  // ── Prompts: BMAD skills ───────────────────────────────────────────────────
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: Object.entries(skills).map(([name, { description }]) => ({
      name,
      description,
      arguments: [{ name: 'context', description: 'Optional extra context', required: false }],
    })),
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    const skill = skills[name];
    if (!skill) throw new Error(`Unknown prompt: ${name}`);

    const root = sessionMeta.projectRoot;
    const ctx = await loadProjectContext(root);
    const body = injectContext(skill.content, ctx);
    const finalText = args?.context ? `${body}\n\n---\n${args.context}` : body;

    return {
      description: skill.description,
      messages: [{ role: 'user', content: { type: 'text', text: finalText } }],
    };
  });

  // ── Resources: project docs ────────────────────────────────────────────────
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const root = sessionMeta.projectRoot;
    if (!root) return { resources: [] };

    const files = await walkDocs(join(root, 'docs'));
    const resources = files.map((rel) => ({
      uri: `project://docs/${rel}`,
      name: rel,
      mimeType: 'text/markdown',
    }));

    if (existsSync(join(root, 'CLAUDE.md'))) {
      resources.unshift({ uri: 'project://rules', name: 'CLAUDE.md (project rules)', mimeType: 'text/markdown' });
    }

    return { resources };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
    const { uri } = req.params;
    const root = sessionMeta.projectRoot;
    if (!root) throw new Error('No project root detected');

    let filePath;
    if (uri === 'project://rules') {
      filePath = join(root, 'CLAUDE.md');
    } else if (uri.startsWith('project://docs/')) {
      const rel = uri.slice('project://docs/'.length);
      filePath = safeDocPath(root, rel);
      if (!filePath) throw new Error('Invalid resource path');
    } else {
      throw new Error(`Unknown resource URI: ${uri}`);
    }

    if (!existsSync(filePath)) throw new Error(`File not found: ${uri}`);

    return {
      contents: [{ uri, mimeType: 'text/markdown', text: await readFile(filePath, 'utf-8') }],
    };
  });

  return server;
}

// Prevent path traversal
function safeDocPath(root, rel) {
  if (!rel || rel.includes('..')) return null;
  const resolved = join(root, 'docs', rel);
  if (!resolved.startsWith(join(root, 'docs'))) return null;
  return resolved;
}

function text(t) { return { content: [{ type: 'text', text: String(t) }] }; }
function error(msg) { return { isError: true, content: [{ type: 'text', text: msg }] }; }

// ── Express app ──────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// Serve Web UI static files
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, 'public')));

const sessions = new Map();
const skills = await loadSkills();
console.log(`✅ Loaded ${Object.keys(skills).length} BMAD skills`);

// ── MCP SSE endpoint ─────────────────────────────────────────────────────────

app.get('/sse', async (req, res) => {
  const sessionMeta = { projectRoot: null, projectName: null };
  const server = createMcpServer(skills, sessionMeta);
  const transport = new SSEServerTransport('/messages', res);

  await server.connect(transport);

  // Attempt root discovery right after connect
  const root = await resolveRoot(server);
  if (root) {
    sessionMeta.projectRoot = root;
    sessionMeta.projectName = root.split('/').pop();
  }

  sessions.set(transport.sessionId, { server, transport, meta: sessionMeta });
  logActivity({ type: 'connected', project: sessionMeta.projectName ?? '(unknown)', sessionId: transport.sessionId });

  res.on('close', () => {
    logActivity({ type: 'disconnected', project: sessionMeta.projectName ?? '(unknown)', sessionId: transport.sessionId });
    sessions.delete(transport.sessionId);
  });
});

app.post('/messages', async (req, res) => {
  const { sessionId } = req.query;
  const session = sessions.get(sessionId);
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  await session.transport.handlePostMessage(req, res);
});

// ── Web UI API ───────────────────────────────────────────────────────────────

app.get('/api/status', (req, res) => {
  res.json({
    server: 'iStdBMAD',
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    skillCount: Object.keys(skills).length,
    skills: Object.keys(skills),
    sessions: [...sessions.values()].map((s) => ({
      sessionId: s.transport.sessionId,
      project: s.meta.projectName ?? '(unknown)',
      root: s.meta.projectRoot,
    })),
    recentActivity: activityLog.slice(0, 50),
  });
});

app.get('/ui-events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  uiClients.add(res);
  res.write(`data: ${JSON.stringify({ type: 'init', message: 'Connected to iStdBMAD' })}\n\n`);

  req.on('close', () => uiClients.delete(res));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'iStdBMAD', skills: Object.keys(skills).length, sessions: sessions.size });
});

// ── Start ────────────────────────────────────────────────────────────────────

const localIp = getLocalIp();

app.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                 iStdBMAD — MCP Server                        ║
╠══════════════════════════════════════════════════════════════╣
║  Web Dashboard:                                              ║
║    Local  :  http://localhost:${PORT}/                         ║
║    Network:  http://${localIp}:${PORT}/                ║
║                                                              ║
║  MCP SSE endpoint:                                           ║
║    Local  :  http://localhost:${PORT}/sse                      ║
║    Network:  http://${localIp}:${PORT}/sse             ║
╠══════════════════════════════════════════════════════════════╣
║  Add to ~/.claude/settings.json :                            ║
╚══════════════════════════════════════════════════════════════╝

${JSON.stringify({ mcpServers: { iStdBMAD: { type: 'sse', url: `http://${localIp}:${PORT}/sse` } } }, null, 2)}
`);
});

function getLocalIp() {
  const nets = networkInterfaces();
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}
