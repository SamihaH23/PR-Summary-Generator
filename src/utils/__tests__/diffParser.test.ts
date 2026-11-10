import { describe, it, expect } from 'vitest';
import { parseGitDiff } from '../diffParser';

const DIFF = `diff --git a/src/a.ts b/src/a.ts
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,2 +1,3 @@
 const x = 1;
-const y = 2;
+const y = 3;
+const z = 4;
diff --git a/new.py b/new.py
new file mode 100644
--- /dev/null
+++ b/new.py
@@ -0,0 +1 @@
+print("hi")
`;

describe('parseGitDiff', () => {
  it('returns an empty result for empty input', () => {
    expect(parseGitDiff('').totalFiles).toBe(0);
  });

  it('counts files, additions and deletions', () => {
    const d = parseGitDiff(DIFF);
    expect(d.totalFiles).toBe(2);
    expect(d.totalAdditions).toBe(3);
    expect(d.totalDeletions).toBe(1);
  });

  it('detects added files and languages', () => {
    const [a, b] = parseGitDiff(DIFF).files;
    expect(a.language).toBe('typescript');
    expect(b.status).toBe('added');
    expect(b.language).toBe('python');
  });
});
