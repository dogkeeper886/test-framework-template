# Dual-Judge Test Framework Template

A reusable, YAML-driven test framework with dual-judge verification (Simple + LLM) for CI/CD pipelines.

## Project Goal

This test framework design template was extracted from the [ollama37](https://github.com/dogkeeper886/ollama37) project to provide a **reusable testing foundation** that can be adopted by any project.

### Why This Framework?

Traditional testing often relies solely on exit codes, which can miss subtle failures where a process completes "successfully" but produces incorrect results. This framework addresses that gap by combining:

- **Deterministic Verification**: Fast, reliable checks for exit codes, expected patterns, and error detection
- **Semantic Analysis**: LLM-powered evaluation that understands whether test output actually meets human-readable criteria

### Design Philosophy

The framework is built around three core principles:

1. **Reusability**: Install into any project with a single command. The YAML-driven approach means tests are configuration, not code—making them accessible to developers and non-developers alike.

2. **Comprehensive Logging**: Every test execution produces detailed, timestamped logs with test markers for precise extraction. This enables effective debugging, auditing, and tracking of test history.

3. **Proper Test Design**: Tests are organized by suite (build, integration, e2e), support dependencies between test cases, and provide clear pass/fail criteria that both humans and LLMs can evaluate.

### Key Technologies

| Technology | Purpose |
|------------|---------|
| **TypeScript** | Strict type safety and modern async/await patterns |
| **YAML** | Declarative test case definitions |
| **Ollama** | Local LLM integration for semantic judging |
| **Docker Compose** | Log collection with marker-based extraction |
| **GitHub Actions** | CI/CD pipeline orchestration |

### Notable Features

- **Dual-Judge System**: Both simple (fast) and LLM (semantic) judges must pass
- **YAML-Driven Tests**: Tests defined as configuration, not code
- **Dependency Resolution**: Tests can depend on other tests passing first
- **Log Collection with Markers**: Precise extraction of logs per test from Docker streams
- **Installable Template**: Add to any project via `make install`
- **Flexible Output**: Console (colored) and JSON formats for CI consumption

## Quick Start

```bash
# Clone or download this template, then install to your project
cd /path/to/test-framework-template
make install TARGET=/path/to/your/project NAME=your-project

# Example:
make install TARGET=/home/user/src/my-app NAME=my-app

# Then in your project
cd /path/to/your/project/cicd/tests
npm install
npm test
```

## Makefile Commands

```bash
make help                                    # Show usage
make install TARGET=/path/to/project         # Install with default name
make install TARGET=/path/to/project NAME=x  # Install with custom name
make clean TARGET=/path/to/project           # Remove framework from project
```

## Configuration

Edit `cicd/tests/src/config.ts` in your project:

```typescript
export const CONFIG = {
  projectName: 'your-project',
  
  // Ollama LLM Judge settings
  llm: {
    defaultUrl: 'http://localhost:11434',  // ← Your Ollama URL
    defaultModel: 'llama3:8b',             // ← Your model
    batchSize: 5,
    timeout: 300000,
  },
};

// Project-specific error patterns
export const ERROR_PATTERNS: RegExp[] = [
  /\berror\b/i,
  /\bfailed\b/i,
  // Add your patterns...
];
```

## Running Tests

```bash
cd your-project/cicd/tests

npm test                    # Run all tests with LLM judge
npm test -- --no-llm        # Run without LLM (faster)
npm test -- --suite build   # Run specific suite
npm test -- --id TC-001     # Run specific test
npm test -- --dry-run       # Preview what would run
npm run list                # List available tests

# Override Ollama URL
npm test -- --judge-url http://host:11434 --judge-model gemma3:12b
```

## Writing Test Cases

Create YAML files in `cicd/tests/testcases/<suite>/`:

```yaml
id: TC-BUILD-001
name: Project Build
suite: build
priority: 1
timeout: 60000
dependencies: []

steps:
  - name: Install dependencies
    command: npm install
    timeout: 60000
    
  - name: Run build
    command: npm run build
    expectPatterns:
      - "Successfully compiled"
    rejectPatterns:
      - "error"

criteria: |
  Verify the project builds without errors.
```

## Directory Structure

```
your-project/
├── cicd/
│   ├── tests/
│   │   ├── src/
│   │   │   ├── config.ts        # ← Configure here
│   │   │   ├── cli.ts
│   │   │   ├── types.ts
│   │   │   ├── loader.ts
│   │   │   ├── executor.ts
│   │   │   ├── log-collector.ts
│   │   │   ├── judge/
│   │   │   └── reporter/
│   │   ├── testcases/
│   │   │   ├── build/           # ← Your tests
│   │   │   ├── integration/
│   │   │   └── e2e/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── scripts/
│   │   └── format-results.sh
│   └── results/
└── .github/workflows/
    ├── test-pipeline.yml
    └── test-suite.yml
```

## Judge System

| Judge | Purpose | Speed |
|-------|---------|-------|
| **Simple** | Exit codes, pattern matching, error detection | Fast |
| **LLM** | Semantic analysis of logs against criteria | Slower |

Both must pass for a test to pass. Use `--no-llm` to skip LLM judging.

## License

MIT
