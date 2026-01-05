/**
 * LLM Judge - Semantic analysis of test results using Ollama.
 *
 * Uses a language model to evaluate test execution logs against criteria.
 * Catches silent failures that exit code checking misses.
 */

import axios from 'axios';
import { TestResult, Judgment } from '../types.js';
import { CONFIG } from '../config.js';

export class LLMJudge {
  private ollamaUrl: string;
  private model: string;
  private batchSize: number;

  constructor(
    ollamaUrl: string = CONFIG.llm.defaultUrl,
    model: string = CONFIG.llm.defaultModel
  ) {
    this.ollamaUrl = ollamaUrl;
    this.model = model;
    this.batchSize = CONFIG.llm.batchSize;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  }

  private buildPrompt(results: TestResult[]): string {
    const testsSection = results
      .map((r, i) => {
        const stepsSummary = r.steps
          .map((step, j) => {
            const status = step.exitCode === 0 ? 'PASS' : 'FAIL';
            const stepTimeout = r.testCase.steps[j]?.timeout || r.testCase.timeout;
            return `  ${j + 1}. "${step.name}" - ${status} (exit: ${step.exitCode}, duration: ${this.formatDuration(step.duration)}, timeout: ${this.formatDuration(stepTimeout)})`;
          })
          .join('\n');

        const allStepsPassed = r.steps.every((s) => s.exitCode === 0);
        const simpleResult = allStepsPassed ? 'PASS' : 'FAIL';

        const timeoutMs = r.testCase.timeout;
        const withinTimeout = r.totalDuration < timeoutMs;
        const timeoutNote = withinTimeout
          ? `Total duration ${this.formatDuration(r.totalDuration)} is within timeout of ${this.formatDuration(timeoutMs)}.`
          : `Total duration ${this.formatDuration(r.totalDuration)} exceeded timeout of ${this.formatDuration(timeoutMs)}.`;

        const logTruncateLimit = 3000;
        const truncatedLogs =
          r.logs.length > logTruncateLimit
            ? r.logs.substring(0, logTruncateLimit) + '\n... (truncated)'
            : r.logs;

        return `
### Test ${i + 1}: ${r.testCase.id} - ${r.testCase.name}

**Criteria:**
${r.testCase.criteria}

**Step Results:**
${stepsSummary}

**Simple Judge Result:** ${simpleResult} (${allStepsPassed ? 'all steps exit code 0' : 'some steps failed'})

**Timing:** ${timeoutNote}

**Execution Logs:**
\`\`\`
${truncatedLogs}
\`\`\`
`;
      })
      .join('\n---\n');

    return `You are a test evaluation judge for ${CONFIG.projectName}.

Analyze the following test results and determine if each test passed or failed based on the criteria provided.

For each test, examine:
1. The expected criteria
2. The actual execution logs (stdout, stderr, exit codes)
3. Whether the output meets the criteria

${testsSection}

Respond with a JSON array containing one object per test:
[
  {"testId": "TC-XXX-001", "pass": true, "reason": "Brief explanation"},
  {"testId": "TC-XXX-002", "pass": false, "reason": "Brief explanation", "evidence": "The actual log line that caused failure"}
]

When marking a test as FAIL, you MUST provide the "evidence" field with the exact log line content that caused the failure.

Important:
- For AI-generated text, accept reasonable variations
- For build/runtime tests, check exit codes AND absence of error messages in logs
- If logs show errors even with exit code 0, the test should FAIL
- Long durations are acceptable if within the configured timeout
- Be lenient with formatting differences, focus on semantic correctness

Respond ONLY with the JSON array, no other text.`;
  }

  private async judgeBatch(results: TestResult[]): Promise<Judgment[]> {
    const prompt = this.buildPrompt(results);

    const response = await axios.post(
      `${this.ollamaUrl}/api/generate`,
      {
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 1000,
        },
      },
      {
        timeout: CONFIG.llm.timeout,
      }
    );

    const responseText = response.data.response;

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in LLM response');
    }

    try {
      const judgments = JSON.parse(jsonMatch[0]) as Judgment[];

      const resultIds = results.map((r) => r.testCase.id);
      const judgedIds = new Set(judgments.map((j) => j.testId));

      for (const id of resultIds) {
        if (!judgedIds.has(id)) {
          judgments.push({
            testId: id,
            pass: false,
            reason: 'No judgment provided by LLM',
          });
        }
      }

      return judgments;
    } catch {
      throw new Error(`Failed to parse LLM response: ${responseText.substring(0, 200)}`);
    }
  }

  async judgeResults(results: TestResult[]): Promise<Judgment[]> {
    const allJudgments: Judgment[] = [];

    for (let i = 0; i < results.length; i += this.batchSize) {
      const batch = results.slice(i, i + this.batchSize);
      process.stderr.write(
        `  [LLM] Judging batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(results.length / this.batchSize)}...\n`
      );

      try {
        const judgments = await this.judgeBatch(batch);
        allJudgments.push(...judgments);
      } catch (error) {
        process.stderr.write(`  [LLM] Failed to judge batch: ${error}\n`);
        for (const r of batch) {
          allJudgments.push({
            testId: r.testCase.id,
            pass: false,
            reason: 'LLM judgment failed: ' + String(error),
          });
        }
      }
    }

    return allJudgments;
  }

  async unloadModel(): Promise<void> {
    try {
      process.stderr.write(`  [LLM] Unloading judge model ${this.model}...\n`);
      await axios.post(
        `${this.ollamaUrl}/api/generate`,
        {
          model: this.model,
          keep_alive: 0,
        },
        {
          timeout: 30000,
        }
      );
      process.stderr.write(`  [LLM] Judge model unloaded.\n`);
    } catch {
      process.stderr.write(`  [LLM] Warning: Failed to unload judge model\n`);
    }
  }
}
