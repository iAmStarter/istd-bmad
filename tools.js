// Supported tools, their BMAD IDs, and MCP config generators
// Tools marked mcp:null use local skill files only (no MCP server needed)

export const TOOLS = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    recommended: true,
    mcp: {
      file: '.mcp.json',
      dir: null,
      build: (url) => ({
        mcpServers: { iStdBMAD: { type: 'sse', url } },
      }),
    },
  },
  {
    id: 'cursor',
    name: 'Cursor',
    recommended: true,
    mcp: {
      file: '.cursor/mcp.json',
      dir: '.cursor',
      build: (url) => ({
        mcpServers: { iStdBMAD: { url } },
      }),
    },
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    recommended: false,
    mcp: {
      file: '.windsurf/mcp.json',
      dir: '.windsurf',
      build: (url) => ({
        mcpServers: { iStdBMAD: { serverUrl: url } },
      }),
    },
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot (VS Code)',
    recommended: true,
    mcp: {
      file: '.vscode/mcp.json',
      dir: '.vscode',
      build: (url) => ({
        inputs: [],
        servers: { iStdBMAD: { type: 'sse', url } },
      }),
    },
  },
  {
    id: 'cline',
    name: 'Cline (VS Code)',
    recommended: false,
    mcp: null,
    mcpNote: 'Open VS Code → Cline sidebar → MCP Servers → Add → SSE → <server-url>',
  },
  {
    id: 'roo',
    name: 'Roo Code (VS Code)',
    recommended: false,
    mcp: null,
    mcpNote: 'Open VS Code → Roo Code sidebar → MCP Servers → Add → SSE → <server-url>',
  },
  {
    id: 'codex',
    name: 'Codex',
    recommended: true,
    mcp: null,
    mcpNote: 'BMAD skills installed to .agents/skills/ — no MCP config needed',
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    recommended: false,
    mcp: null,
    mcpNote: 'BMAD skills installed to .agents/skills/ — no MCP config needed',
  },
  {
    id: 'replit',
    name: 'Replit Agent',
    recommended: false,
    mcp: null,
    mcpNote: 'BMAD skills installed to .agents/skills/ — no MCP config needed',
  },
];

export const TOOL_IDS = TOOLS.map((t) => t.id);

export function getTool(id) {
  return TOOLS.find((t) => t.id === id) ?? null;
}

export function toolsWithMcp() {
  return TOOLS.filter((t) => t.mcp !== null);
}
