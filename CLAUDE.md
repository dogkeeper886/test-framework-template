# CLAUDE.md

Guidance for Claude Code when working on the test-framework-template.

## Project Overview

Reusable, YAML-driven CI test framework with dual-judge verification (Simple + LLM). Part of the ai-qa-workflow ecosystem (Phase 5: Automate).

## Installation

Agent-driven: run `/install` and follow the prompts.

Manual alternative:
```bash
make install TARGET=/path/to/project NAME=project-name
cd /path/to/project/cicd/tests && npm install
# Edit config.ts for your project
```

## Core Commands

```bash
cd cicd/tests
npm run build                      # TypeScript compile
npm test                           # Run all tests with LLM judge
npm test -- --no-llm               # Run without LLM (faster)
npm test -- --suite build          # Run specific suite
npm test -- --id TC-001            # Run specific test
npm test -- --tag auth             # Run tests tagged 'auth'
npm test -- --dry-run              # Preview without executing
npm run list                       # List available tests
npm run list -- --tag auth         # List tests by tag
```

## Project Structure

```
cicd/tests/
├── src/
│   ├── cli.ts              # CLI entry point (Commander)
│   ├── config.ts           # Project configuration — customize per project
│   ├── types.ts            # Core interfaces (TestCase, TestStep, etc.)
│   ├── loader.ts           # YAML parser with dependency resolution
│   ├── executor.ts         # Test execution with variable capture
│   ├── mcp-client.ts       # MCP tool client (optional)
│   ├── log-collector.ts    # Docker log capture (optional)
│   ├── judge/              # Simple + LLM judges
│   └── reporter/           # Console + JSON reporters
├── testcases/
│   ├── build/              # TC-BUILD-*.yml
│   ├── integration/        # TC-INT-*.yml
│   └── e2e/                # TC-E2E-*.yml
└── package.json

.claude/
├── skills/                 # /ci-testcase, /ci-run, /add-tool, /install, /review-docs-privacy
└── rules/                  # test-yaml-format.md, workflow-patterns.md
```

## Test Case YAML

See `.claude/rules/test-yaml-format.md` for full schema, variable capture syntax, and suite guidelines.

Key fields: `id`, `name`, `suite`, `steps`, `tags` (optional), `criteria`, `goal`, `dependencies`.

## Dual-Judge System

Both judges must pass for a test to pass:
- **Simple Judge**: Exit codes, expectPatterns, rejectPatterns, ERROR_PATTERNS
- **LLM Judge**: Semantic analysis via Ollama against `criteria` and `goal`

Use `--no-llm` to skip LLM judging when Ollama is unavailable.

## Configuration

Edit `config.ts` per project:
- `projectName` — used in LLM prompts
- `SUITES` — extend with custom suite names (e.g., `runtime`, `inference`)
- `ERROR_PATTERNS` / `ERROR_EXCLUSIONS` — project-specific error detection
- `mcp.serverCommand` — MCP server startup command

**Environment variables** (for CI, override without editing source):
- `LLM_JUDGE_URL` — Ollama endpoint (default: `http://localhost:11434`)
- `LLM_JUDGE_MODEL` — Model for judging (default: `llama3:8b`)

**Separate judge instance:** If testing an Ollama instance, run the judge on a different port to avoid GPU contention.

## MCP Client (Optional)

For MCP server projects, `mcp-client.ts` spawns the server and calls tools:
```bash
npx tsx cicd/tests/src/mcp-client.ts <tool_name> '<json_args>'
```
Configure via `MCP_SERVER_COMMAND` env var or `config.ts` → `mcp.serverCommand`.

## CI Workflows

See `.claude/rules/workflow-patterns.md` for per-feature and suite-based workflow patterns.

Template includes: `build.yml`, `test-run.yml`, `test-feature-example.yml`, `ci.yml` (recommended) and legacy `test-pipeline.yml`, `test-suite.yml`.

## Development Guidelines

- Keep everything configurable via `config.ts` — never hardcode project-specific values
- Template files are installed via agent-driven flow (`/install`) or Makefile fallback
- Follow existing TypeScript patterns (strict types, async/await)
- No hardcoded IPs, infrastructure IDs, or private repo references

## Skills

- `/ci-testcase` — generate YAML test cases from requirements
- `/ci-run` — execute tests with guided output
- `/add-tool` — add new MCP tools following standard patterns
- `/install` — install framework into a project
- `/review-docs-privacy` — review for security and quality
