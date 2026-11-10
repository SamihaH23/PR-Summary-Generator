import { describe, it, expect } from 'vitest';
import { parseGitDiff } from '../diffParser';
import { generatePRSummary, splitDiffForAI, MAX_DIFF_CHARS } from '../aiSummarizer';

const offline = { apiKey: '', model: 'gemini-2.5-flash', useOfflineFallback: true } as any;
const fileDiff = (name: string, line: string) =>
  `diff --git a/${name} b/${name}\n--- a/${name}\n+++ b/${name}\n@@ -1 +1 @@\n-old\n+${line}\n`;

describe('offline heuristics', () => {
  it('marks summaries as offline', async () => {
    const s = await generatePRSummary(parseGitDiff(fileDiff('a.ts', 'x')), offline);
    expect(s.source).toBe('offline');
  });

  it('does not treat "author" as an auth change', async () => {
    const s = await generatePRSummary(parseGitDiff(fileDiff('a.ts', 'const author = "me";')), offline);
    expect(s.summaryPoints).not.toContain('Refactored authentication service');
  });

  it('ignores keywords that only appear in unchanged lines', async () => {
    const diff = `diff --git a/a.ts b/a.ts\n--- a/a.ts\n+++ b/a.ts\n@@ -1,2 +1,2 @@\n login();\n-a\n+b\n`;
    const s = await generatePRSummary(parseGitDiff(diff), offline);
    expect(s.summaryPoints).not.toContain('Refactored authentication service');
  });

  it('extracts the dropped column name', async () => {
    const s = await generatePRSummary(parseGitDiff(fileDiff('m.sql', 'ALTER TABLE users DROP COLUMN full_name;')), offline);
    expect(s.breakingChanges.join(' ')).toContain('full_name');
  });
});

describe('splitDiffForAI', () => {
  it('keeps small diffs in one part', () => {
    expect(splitDiffForAI(parseGitDiff(fileDiff('a.ts', 'x')))).toHaveLength(1);
  });

  it('splits big diffs on file boundaries', () => {
    const big = 'y'.repeat(MAX_DIFF_CHARS / 2);
    const parsed = parseGitDiff(['a', 'b', 'c'].map(n => fileDiff(`${n}.ts`, big)).join(''));
    const parts = splitDiffForAI(parsed);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.reduce((n, p) => n + p.totalFiles, 0)).toBe(3);
  });
});
