# CLAUDE.md

Guidance for Claude Code when working on the test-framework-template.

## Project Overview

Reusable, YAML-driven CI test framework with dual-judge verification (Simple + LLM). Part of the ai-qa-workflow ecosystem (Phase 5: Automate).

## Installation

Installation is agent-driven. When an AI agent reads this file, it should guide the user through installing the framework into their project.

### Agent Installation Flow

#### Phase 1: Orient

Read this CLAUDE.md to understand available components. Each component is conditional:

| Component | Files | When to include |
|-----------|-------|----------------|
| **Core framework** (always) | cli.ts, config.ts, types.ts, loader.ts, executor.ts | Always |
| **Judges** (always) | judge/simple-judge.ts, judge/llm-judge.ts, judge/index.ts | Always |
| **Reporters** (always) | reporter/console.ts, reporter/json.ts, reporter/index.ts | Always |
| **Docker log collector** | log-collector.ts | If project uses Docker (docker-compose.yml exists) |
| **MCP client** | mcp-client.ts | If project is an MCP server (`@modelcontextprotocol/sdk` in package.json) |
| **Claude commands** | .claude/commands/{ci-testcase,ci-run,add-tool}.md | Recommended for all projects |
| **GitHub workflows** | .github/workflows/{test-pipeline,test-suite}.yml | Optional |
| **Example test cases** | testcases/{build,integration,e2e}/*.yml | Recommended for fresh install, skip for updates |
| **Supporting files** | package.json, tsconfig.json, scripts/format-results.sh | Always |

#### Phase 2: Detect Context

Examine the user's current working directory:

1. **Read package.json** (if it exists) → extract project name, check for `@modelcontextprotocol/sdk` in dependencies
2. **Check for docker-compose.yml** → Docker project? Include log-collector.ts
3. **Check for existing `cicd/tests/`** → update (preserve user's config.ts and test cases) vs fresh install
4. **Check `.claude/commands/`** → what commands are already installed
5. **If no project context detected**, ask the user what they're working on

#### Phase 3: Ask the User

Prompt for configuration (show defaults, let user override):

1. **Project name** — default from package.json `name` field, or ask
2. **Ollama URL** — default: `http://localhost:11434`
3. **Ollama model** — default: `llama3:8b`
4. **Include MCP client?** — auto-yes if MCP SDK detected, otherwise ask
5. **Include Docker log collector?** — auto-yes if docker-compose detected, otherwise ask
6. **Install Claude commands?** — recommend yes
7. **Install example test cases?** — recommend yes for fresh install, skip for updates

#### Phase 4: Install

1. **Create directory structure:**
   ```
   cicd/tests/src/judge/
   cicd/tests/src/reporter/
   cicd/tests/testcases/{build,integration,e2e}/
   cicd/scripts/
   cicd/results/
   ```

2. **Copy selected files** from the template source directory into the target project

3. **Adapt config.ts** with user's answers — replace placeholder values:
   - `projectName: 'my-project'` → user's project name
   - `sessionPrefix: 'test-session'` → `'{projectName}-session'`
   - `llm.defaultUrl` → user's Ollama URL
   - `llm.defaultModel` → user's model
   - If MCP: set `mcp.serverCommand` to match their server

4. **Adapt package.json** — if MCP client included, add `@modelcontextprotocol/sdk` to peerDependencies

5. **Create .gitignore** in `cicd/results/`:
   ```
   *
   !.gitignore
   ```

6. **Run `npm install`** in `cicd/tests/`

#### Phase 5: Verify

1. Run `cd cicd/tests && npm run build` — TypeScript must compile
2. Run `npm run list` — test loader must work (shows example test cases if installed)
3. If either fails, diagnose and fix before reporting success

#### Phase 6: Report

Show the user:
- Summary of installed components (what was included/excluded and why)
- Configuration values applied
- Next steps:
  - Write test cases in `cicd/tests/testcases/`
  - Customize error patterns in `config.ts`
  - Run tests: `cd cicd/tests && npm test -- --no-llm`

### Updates

To update an existing installation, run the same flow. The agent should:
- Compare installed files against the template source (check for divergence)
- Preserve the user's `config.ts` customizations, test cases, and error patterns
- Only update framework files (judges, executor, loader, etc.)
- Show what changed before applying updates

### Manual Installation (Alternative)

```bash
make install TARGET=/path/to/project NAME=project-name
cd /path/to/project/cicd/tests && npm install
# Then manually edit config.ts
```

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
- Template files are installed via agent-driven flow (see Installation section) or Makefile fallback
- Follow existing TypeScript patterns (strict types, async/await)
- Test suites are configurable via `SUITES` array in config.ts

## CI Flow Commands

- `/ci-testcase` — generate YAML test cases from requirements
- `/ci-run` — execute tests with guided output
- `/add-tool` — add new MCP tools following standard patterns
