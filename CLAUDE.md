# CLAUDE.md

Guidance for Claude Code when working on the test-framework-template.

## Project Overview

Reusable, YAML-driven CI test framework with dual-judge verification (Simple + LLM). Installs into any project via `make install`. Part of the ai-qa-workflow ecosystem (Phase 5: Automate).

## Core Commands

```bash
cd cicd/tests
npm run build           # TypeScript compile
npm test                # Run all tests with LLM judge
npm test -- --no-llm    # Run without LLM (faster)
npm test -- --suite build  # Run specific suite
npm test -- --id TC-001    # Run specific test
npm test -- --dry-run      # Preview without executing
npm run list            # List available tests
```

Install to a project:
```bash
make install TARGET=/path/to/project NAME=project-name
```

## Project Structure

```
cicd/tests/
├── src/
│   ├── cli.ts            # CLI entry point (Commander)
│   ├── config.ts         # Project configuration — customize per project
│   ├── types.ts          # Core interfaces (TestCase, TestStep, etc.)
│   ├── loader.ts         # YAML parser with dependency resolution
│   ├── executor.ts       # Test execution with variable capture
│   ├── mcp-client.ts     # MCP tool client for integration testing (optional)
│   ├── log-collector.ts  # Docker log capture with test markers
│   ├── judge/
│   │   ├── simple-judge.ts  # Deterministic: exit codes, patterns, error detection
│   │   └── llm-judge.ts     # Semantic: Ollama-based analysis with structured prompts
│   └── reporter/
│       ├── console.ts    # Colored terminal output
│       └── json.ts       # Structured JSON for CI/CD
├── testcases/
│   ├── build/            # TC-BUILD-*.yml
│   ├── integration/      # TC-INTEGRATION-*.yml (or TC-INT-*.yml)
│   └── e2e/              # TC-E2E-*.yml
└── package.json
```

## Test Case YAML Format

```yaml
id: TC-SUITE-NNN
name: Human-readable test name
suite: build|integration|e2e
goal: One-line objective for LLM judge context
priority: 1                    # Lower = runs first
timeout: 30000                 # Milliseconds
dependencies: [TC-SUITE-001]   # Tests that must pass first

steps:
  - name: Step description
    command: shell command to execute
    timeout: 5000              # Optional, overrides test timeout
    expectPatterns:            # All must match (regex)
      - "pattern"
    rejectPatterns:            # None should match (regex)
      - "error"
    capture:                   # Extract values from JSON output
      varName: "json.path"

criteria: |
  Human-readable criteria for LLM judge evaluation.
```

## Variable Capture

Steps can extract values from JSON output and inject them into later steps:

```yaml
steps:
  - name: Create resource
    command: curl -s -X POST http://localhost:3000/api/resources
    capture:
      resourceId: "id"
  - name: Verify resource
    command: curl -s http://localhost:3000/api/resources/{{resourceId}}
```

**Path syntax:**
- `id` — direct field
- `data.name` — nested field
- `data[name=foo].id` — array find by field match
- `$[type=user].email` — root array find

MCP double-encoded responses (`content[0].text` wrapping) are automatically unwrapped.

## MCP Client (Optional)

For MCP server projects, `mcp-client.ts` spawns the server and calls tools:

```bash
npx tsx cicd/tests/src/mcp-client.ts <tool_name> '<json_args>'
```

Configure the server command:
- Environment variable: `MCP_SERVER_COMMAND="node dist/mcpServer.js"`
- Default in config.ts: `mcp.serverCommand`

Requires `@modelcontextprotocol/sdk` (optional peer dependency — install in your project if needed).

## Dual-Judge System

Both judges must pass for a test to pass:

- **Simple Judge**: Exit codes = 0, expectPatterns found, rejectPatterns absent, no ERROR_PATTERNS in logs
- **LLM Judge**: Semantic analysis of output against `criteria` and `goal` fields using Ollama

Use `--no-llm` to skip LLM judging when Ollama is unavailable.

## Configuration

Edit `config.ts` per project:
- `projectName` — used in LLM prompts
- `llm.defaultUrl` / `llm.defaultModel` — Ollama endpoint
- `ERROR_PATTERNS` / `ERROR_EXCLUSIONS` — project-specific error detection
- `mcp.serverCommand` — MCP server startup command

## Development Guidelines

- Keep everything configurable via `config.ts` — never hardcode project-specific values
- Template files get installed via Makefile — update install target for new files
- Follow existing TypeScript patterns (strict types, async/await)
- Test suites are configurable via `SUITES` array in config.ts

## CI Flow Commands

- `/ci-testcase` — generate YAML test cases from requirements
- `/ci-run` — execute tests with guided output
- `/add-tool` — add new MCP tools following standard patterns
