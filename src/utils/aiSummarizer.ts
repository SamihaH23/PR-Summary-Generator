import { ParsedDiff, PRSummary, AISettings, RiskLevel, TestCase, RiskBreakdown, CommitSuggestions } from '../types';

export const DEFAULT_MODEL = 'gemini-2.5-flash';
export const MAX_DIFF_CHARS = 12000;
/** Cap on how many AI calls one analysis may make for a big diff. */
export const MAX_AI_PARTS = 5;
const RISK_ORDER: RiskLevel[] = ['Low', 'Medium', 'High', 'Critical'];

// Older saved settings may still point at retired 1.x/2.0 models.
function resolveModel(name?: string): string {
  if (!name || /gemini-(1\.|2\.0)/.test(name)) return DEFAULT_MODEL;
  return name;
}

export async function generatePRSummary(
  parsedDiff: ParsedDiff,
  settings: AISettings
): Promise<PRSummary> {
  const { apiKey, model, useOfflineFallback, customPrompt } = settings;

  // Try live Gemini API call if API key exists and offline mode isn't explicitly forced
  if (apiKey && apiKey.trim() !== '' && !useOfflineFallback) {
    try {
      const parts = splitDiffForAI(parsedDiff).slice(0, MAX_AI_PARTS);
      const results = await Promise.all(
        parts.map(part => fetchGeminiSummary(part, apiKey, model, customPrompt))
      );
      const valid = results.filter((r): r is PRSummary => r !== null);
      if (valid.length > 0) {
        const merged = valid.length === 1 ? valid[0] : mergeSummaries(valid, parsedDiff);
        return { ...merged, source: 'ai' };
      }
    } catch (err: any) {
      console.warn('Gemini API call error:', err);
      throw err;
    }
  }

  // Fallback heuristic engine
  return { ...generateHeuristicSummary(parsedDiff), source: 'offline' };
}

/**
 * Split a diff into groups of whole files that each fit in one AI request.
 * A single file bigger than the limit becomes its own (truncated) part.
 */
export function splitDiffForAI(parsedDiff: ParsedDiff): ParsedDiff[] {
  if (parsedDiff.rawText.length <= MAX_DIFF_CHARS) return [parsedDiff];

  const fileTexts = parsedDiff.rawText.split(/(?=^diff --git )/m).filter(t => t.trim());
  if (fileTexts.length !== parsedDiff.files.length) return [parsedDiff];

  const parts: ParsedDiff[] = [];
  let current: { text: string; files: ParsedDiff['files'] } = { text: '', files: [] };
  const flush = () => {
    if (!current.files.length) return;
    parts.push({
      files: current.files,
      totalFiles: current.files.length,
      totalAdditions: current.files.reduce((a, f) => a + f.additions, 0),
      totalDeletions: current.files.reduce((a, f) => a + f.deletions, 0),
      rawText: current.text
    });
    current = { text: '', files: [] };
  };

  fileTexts.forEach((text, i) => {
    if (current.text.length + text.length > MAX_DIFF_CHARS) flush();
    current.text += text;
    current.files.push(parsedDiff.files[i]);
  });
  flush();
  return parts;
}

function mergeSummaries(parts: PRSummary[], fullDiff: ParsedDiff): PRSummary {
  const unique = <T,>(items: T[], key: (t: T) => string) => {
    const seen = new Set<string>();
    return items.filter(i => {
      const k = key(i).toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };
  const first = parts[0];
  const riskLevel = parts.reduce<RiskLevel>(
    (max, p) => (RISK_ORDER.indexOf(p.riskLevel) > RISK_ORDER.indexOf(max) ? p.riskLevel : max),
    'Low'
  );
  const maxOf = (k: keyof RiskBreakdown) => Math.max(...parts.map(p => p.riskBreakdown?.[k] ?? 0));
  const summaryPoints = unique(parts.flatMap(p => p.summaryPoints), s => s);
  const breakingChanges = unique(parts.flatMap(p => p.breakingChanges), s => s);
  const suggestedTests = unique(parts.flatMap(p => p.suggestedTests), t => t.title)
    .map((t, i) => ({ ...t, id: `t-${i}` }));
  const securityNotes = unique(parts.flatMap(p => p.securityNotes ?? []), s => s);
  const riskRationale = parts.find(p => p.riskLevel === riskLevel)?.riskRationale ?? first.riskRationale;
  const totalDiffLines = fullDiff.totalAdditions + fullDiff.totalDeletions;

  return {
    ...first,
    summaryPoints,
    riskLevel,
    riskRationale,
    riskBreakdown: {
      securityRisk: maxOf('securityRisk'),
      apiBreakingRisk: maxOf('apiBreakingRisk'),
      complexityRisk: maxOf('complexityRisk')
    },
    breakingChanges,
    suggestedTests,
    securityNotes,
    complexityScore: totalDiffLines > 500 ? 'Chunky' : totalDiffLines > 250 ? 'Large' : totalDiffLines > 80 ? 'Medium' : 'Small',
    estimatedReviewTime: `~${Math.max(1, Math.ceil(totalDiffLines / 40))} mins review`,
    prDescriptionMarkdown: generatePRMarkdown(
      first.title, summaryPoints, riskLevel, riskRationale, breakingChanges, suggestedTests, securityNotes
    )
  };
}

/**
 * Line-level Ask AI feature
 */
export async function askAiAboutLine(
  lineContent: string,
  filePath: string,
  apiKey?: string,
  modelName: string = DEFAULT_MODEL
): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    return `Line Analysis: Changes line in ${filePath}. Code snippet: "${lineContent.trim()}". (Configure Gemini API Key in header settings for deep AI code inspection).`;
  }

  const prompt = `You are a senior code reviewer. Analyze this specific code line change in ${filePath}:
Line: "${lineContent}"

Briefly explain (in 2 short sentences):
1. What this code change does.
2. Any potential bug, security risk, or performance implication to watch out for.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolveModel(modelName)}:generateContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey.trim() },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Line analysis completed.';
  } catch (e) {
    return `Code Line: "${lineContent.trim()}". Modifies logic in ${filePath}.`;
  }
}

async function fetchGeminiSummary(
  parsedDiff: ParsedDiff,
  apiKey: string,
  modelName: string = DEFAULT_MODEL,
  customPrompt?: string
): Promise<PRSummary | null> {
  const prompt = `You are a senior lead engineer conducting a fast, high-signal PR code review.
Analyze the following Git diff and generate a structured JSON summary matching this schema:

{
  "title": "Short descriptive title of the PR",
  "summaryPoints": [
    "Added login validation",
    "Refactored authentication service",
    "Updated API endpoint"
  ],
  "riskLevel": "Low" | "Medium" | "High" | "Critical",
  "riskRationale": "Brief explanation of why this risk level was chosen",
  "riskBreakdown": {
    "securityRisk": 60,
    "apiBreakingRisk": 80,
    "complexityRisk": 40
  },
  "breakingChanges": [
    "List of breaking changes, schema changes, or signature updates"
  ],
  "suggestedTests": [
    {
      "id": "t1",
      "category": "Unit" | "Integration" | "Security" | "Edge Case" | "Regression",
      "title": "Test case title",
      "description": "Specific test scenario description"
    }
  ],
  "securityNotes": [
    "Optional security recommendations or concerns"
  ],
  "commitSuggestions": {
    "conventionalCommit": "feat(auth): refactor login validation and credential check",
    "branchName": "feature/auth-login-validation",
    "shortHeadline": "Refactor auth service & login validation"
  },
  "complexityScore": "Small" | "Medium" | "Large" | "Chunky",
  "estimatedReviewTime": "~4 mins review",
  "prDescriptionMarkdown": "Full GitHub PR description in markdown format"
}

Rule Guidelines:
1. Summaries MUST be concise, action-oriented bullet points.
2. Explicitly flag breaking API endpoint changes or schema modifications.
3. Suggest concrete, practical conventional commits and git branch names.
${customPrompt ? `4. Additional User Guidelines: ${customPrompt}` : ''}
Respond ONLY with valid JSON (no markdown formatting fences around JSON).

GIT DIFF TO ANALYZE:
Total Files: ${parsedDiff.totalFiles} (+${parsedDiff.totalAdditions} / -${parsedDiff.totalDeletions})

Raw Diff Snippet:
${parsedDiff.rawText.slice(0, MAX_DIFF_CHARS)}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolveModel(modelName)}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey.trim() },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    let message = `Gemini API HTTP ${response.status}`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson.error && errJson.error.message) {
        message = errJson.error.message;
      }
    } catch (e) {}
    throw new Error(`API Error: ${message}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Received empty response from Gemini API.');

  try {
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return normalizePRSummary(parsed, parsedDiff);
  } catch (parseErr) {
    throw new Error('Failed to parse response JSON from Gemini AI.');
  }
}

/**
 * High-accuracy heuristic rule engine for instant offline analysis
 */
function generateHeuristicSummary(parsedDiff: ParsedDiff): PRSummary {
  const summaryPoints: string[] = [];
  const breakingChanges: string[] = [];
  const suggestedTests: TestCase[] = [];
  const securityNotes: string[] = [];

  let riskLevel: RiskLevel = 'Low';
  let securityRisk = 10;
  let apiBreakingRisk = 10;
  let complexityRisk = Math.min(80, Math.floor(parsedDiff.totalAdditions / 2));

  // Only look at added/removed lines so unchanged context doesn't trigger rules.
  const diffText = parsedDiff.files
    .flatMap(f => f.chunks.flatMap(c => c.lines.filter(l => l.type !== 'context').map(l => l.content)))
    .join('\n')
    .toLowerCase();
  // Match at a word start so "auth" doesn't fire on e.g. "oauth". Symbols like "@post" match anywhere.
  const has = (...words: string[]) =>
    words.some(w => {
      const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(/^\w/.test(w) ? `\\b${escaped}` : escaped).test(diffText);
    });

  // 1. Analyze Auth & Password validation
  if (has('login', 'password', 'authenticat', 'authoriz') || /\bauth\b/.test(diffText)) {
    summaryPoints.push('Refactored authentication service');
    securityRisk += 40;

    if (has('validate') || has('strength') || has('bcrypt')) {
      summaryPoints.push('Added password strength & credential validation');
      suggestedTests.push({
        id: 't-pass-invalid',
        category: 'Unit',
        title: 'Invalid password strength',
        description: 'Verify password rejecting passwords under 8 characters or missing special characters'
      });
    }
    if (has('token') || has('expiresin') || has('jwt')) {
      suggestedTests.push({
        id: 't-token-exp',
        category: 'Security',
        title: 'Expired token handling',
        description: 'Verify behavior when authentication token expires or is malformed'
      });
    }
    if (has('rememberme') || has('remember')) {
      suggestedTests.push({
        id: 't-remember-me',
        category: 'Integration',
        title: 'Remember Me session duration',
        description: 'Verify token expiration extension (30 days vs 1 hour) when Remember Me is enabled'
      });
    }
  }

  // 2. Analyze API Endpoint Changes
  if (has('@post') || has('@get') || has('/v2/') || has('endpoint')) {
    summaryPoints.push('Updated REST API endpoint contracts');
    if (has('/v2/') || has('/v1/')) {
      breakingChanges.push('API endpoint version route updated (e.g. /v2/auth/login)');
      apiBreakingRisk += 60;
    }
  }

  // 3. Analyze Webhook & Signatures
  if (has('stripe') || has('webhook') || has('signature')) {
    summaryPoints.push('Added HMAC webhook signature verification and event handling');
    securityNotes.push('Ensure raw request body payload is preserved for cryptographic signature verification.');
    securityRisk += 60;

    suggestedTests.push({
      id: 't-webhook-sig',
      category: 'Security',
      title: 'Invalid Webhook Signature',
      description: 'Ensure incoming request with altered payload or secret returns HTTP 400 Bad Request'
    });
    suggestedTests.push({
      id: 't-webhook-success',
      category: 'Integration',
      title: 'Payment Succeeded Event',
      description: 'Confirm order status transitions to PAID upon valid webhook receipt'
    });
  }

  // 4. Analyze Database migrations & column changes
  if (has('alter table') || has('drop column') || has('migration')) {
    summaryPoints.push('Executed database schema migration');
    apiBreakingRisk += 70;

    if (has('drop column')) {
      const match = diffText.match(/drop column\s+([a-z0-9_]+)/i);
      const colName = match ? match[1] : 'column';
      breakingChanges.push(`Dropped database column \`${colName}\`. Downstream dependencies must be updated.`);
    }
    suggestedTests.push({
      id: 't-db-migration',
      category: 'Regression',
      title: 'Database Data Integrity Check',
      description: 'Verify existing user records correctly migrate split fields without data loss'
    });
  }

  // Fallback summary points if empty
  if (summaryPoints.length === 0) {
    parsedDiff.files.forEach(file => {
      if (file.status === 'added') {
        summaryPoints.push(`Added new file ${file.newPath}`);
      } else if (file.status === 'deleted') {
        summaryPoints.push(`Removed file ${file.oldPath}`);
        breakingChanges.push(`Deleted source module ${file.oldPath}`);
        apiBreakingRisk += 30;
      } else {
        summaryPoints.push(`Updated ${file.newPath} (+${file.additions} / -${file.deletions})`);
      }
    });
  }

  const maxRiskScore = Math.max(securityRisk, apiBreakingRisk, complexityRisk);
  if (maxRiskScore >= 75 || breakingChanges.length >= 2) {
    riskLevel = 'Critical';
  } else if (maxRiskScore >= 50 || breakingChanges.length >= 1) {
    riskLevel = 'High';
  } else if (maxRiskScore >= 30 || parsedDiff.totalAdditions > 50) {
    riskLevel = 'Medium';
  } else {
    riskLevel = 'Low';
  }

  // Default fallback tests if none generated
  if (suggestedTests.length === 0) {
    suggestedTests.push({
      id: 't-unit-basic',
      category: 'Unit',
      title: 'Unit test modified functions',
      description: 'Test target method with valid inputs and assert expected return values'
    });
    suggestedTests.push({
      id: 't-edge-null',
      category: 'Edge Case',
      title: 'Null / Undefined payload verification',
      description: 'Verify graceful exception handling when unexpected null parameters are passed'
    });
  }

  const riskRationale = getRiskRationale(riskLevel, parsedDiff, breakingChanges.length);
  const title = generatePRTitle(summaryPoints, parsedDiff);

  const totalDiffLines = parsedDiff.totalAdditions + parsedDiff.totalDeletions;
  const complexityScore = totalDiffLines > 500 ? 'Chunky' : totalDiffLines > 250 ? 'Large' : totalDiffLines > 80 ? 'Medium' : 'Small';
  const estimatedReviewTime = `~${Math.max(1, Math.ceil(totalDiffLines / 40))} mins review`;

  const commitSuggestions: CommitSuggestions = {
    conventionalCommit: `refactor: ${title.toLowerCase()}`,
    branchName: `feature/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    shortHeadline: title
  };

  const riskBreakdown: RiskBreakdown = {
    securityRisk: Math.min(100, securityRisk),
    apiBreakingRisk: Math.min(100, apiBreakingRisk),
    complexityRisk: Math.min(100, complexityRisk)
  };

  const prDescriptionMarkdown = generatePRMarkdown(
    title,
    summaryPoints,
    riskLevel,
    riskRationale,
    breakingChanges,
    suggestedTests,
    securityNotes
  );

  return {
    title,
    summaryPoints,
    riskLevel,
    riskRationale,
    riskBreakdown,
    breakingChanges,
    suggestedTests,
    securityNotes,
    commitSuggestions,
    complexityScore,
    estimatedReviewTime,
    prDescriptionMarkdown
  };
}

export function generatePRMarkdown(
  title: string,
  summaryPoints: string[],
  riskLevel: RiskLevel,
  riskRationale: string,
  breakingChanges: string[],
  suggestedTests: TestCase[],
  securityNotes: string[] = []
): string {
  return `# ${title}

## Summary
${summaryPoints.map(p => `• ${p}`).join('\n')}

## Risk Assessment
**Level**: ${riskLevel}
${riskRationale}

${breakingChanges.length > 0 ? `## ⚠️ Breaking Changes\n${breakingChanges.map(b => `- ${b}`).join('\n')}\n` : ''}
## Suggested Test Cases
${suggestedTests.map(t => `- [${t.completed ? 'x' : ' '}] **[${t.category}]** ${t.title}: ${t.description || ''}`).join('\n')}

${securityNotes.length > 0 ? `## 🛡️ Security Notes\n${securityNotes.map(s => `- ${s}`).join('\n')}` : ''}
`;
}

function getRiskRationale(level: RiskLevel, parsedDiff: ParsedDiff, breakingCount: number): string {
  switch (level) {
    case 'Critical':
      return `Critical risk due to security alterations or ${breakingCount} breaking changes across ${parsedDiff.totalFiles} modified files.`;
    case 'High':
      return `High risk due to API contract alterations, schema migrations, or sensitive authentication modifications.`;
    case 'Medium':
      return `Medium risk due to refactoring core service logic across ${parsedDiff.totalFiles} files with moderate code diff size (+${parsedDiff.totalAdditions}/-${parsedDiff.totalDeletions}).`;
    case 'Low':
      return `Low risk isolated changes with minimal potential side-effects on existing workflows.`;
  }
}

function generatePRTitle(points: string[], diff: ParsedDiff): string {
  if (points.length > 0) {
    return points[0];
  }
  return `PR Review: ${diff.totalFiles} files modified (+${diff.totalAdditions}/-${diff.totalDeletions})`;
}

function normalizePRSummary(raw: any, parsedDiff: ParsedDiff): PRSummary {
  const riskLevel = (['Low', 'Medium', 'High', 'Critical'].includes(raw.riskLevel) ? raw.riskLevel : 'Medium') as RiskLevel;
  const summaryPoints = Array.isArray(raw.summaryPoints) ? raw.summaryPoints : ['Updated source files'];
  const breakingChanges = Array.isArray(raw.breakingChanges) ? raw.breakingChanges : [];
  const suggestedTests = Array.isArray(raw.suggestedTests) ? raw.suggestedTests.map((t: any, idx: number) => ({
    id: t.id || `t-${idx}`,
    category: t.category || 'Unit',
    title: t.title || 'Verify functionality',
    description: t.description || '',
    completed: Boolean(t.completed)
  })) : [];
  const securityNotes = Array.isArray(raw.securityNotes) ? raw.securityNotes : [];
  const title = raw.title || 'Pull Request Summary';
  const riskRationale = raw.riskRationale || `Analyzed ${parsedDiff.totalFiles} files in diff.`;

  const totalDiffLines = parsedDiff.totalAdditions + parsedDiff.totalDeletions;
  const complexityScore = raw.complexityScore || (totalDiffLines > 500 ? 'Chunky' : totalDiffLines > 250 ? 'Large' : totalDiffLines > 80 ? 'Medium' : 'Small');
  const estimatedReviewTime = raw.estimatedReviewTime || `~${Math.max(1, Math.ceil(totalDiffLines / 40))} mins review`;

  const commitSuggestions = raw.commitSuggestions || {
    conventionalCommit: `refactor: ${title.toLowerCase()}`,
    branchName: `feature/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    shortHeadline: title
  };

  const prDescriptionMarkdown = raw.prDescriptionMarkdown || generatePRMarkdown(
    title,
    summaryPoints,
    riskLevel,
    riskRationale,
    breakingChanges,
    suggestedTests,
    securityNotes
  );

  return {
    title,
    summaryPoints,
    riskLevel,
    riskRationale,
    riskBreakdown: raw.riskBreakdown || {
      securityRisk: riskLevel === 'Critical' ? 85 : riskLevel === 'High' ? 65 : 25,
      apiBreakingRisk: breakingChanges.length > 0 ? 80 : 20,
      complexityRisk: Math.min(90, Math.floor(parsedDiff.totalAdditions / 2))
    },
    breakingChanges,
    suggestedTests,
    securityNotes,
    commitSuggestions,
    complexityScore,
    estimatedReviewTime,
    prDescriptionMarkdown
  };
}
