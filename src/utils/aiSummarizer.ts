import { ParsedDiff, PRSummary, AISettings, RiskLevel, TestCase, RiskBreakdown, CommitSuggestions } from '../types';

export async function generatePRSummary(
  parsedDiff: ParsedDiff,
  settings: AISettings
): Promise<PRSummary> {
  const { apiKey, model, useOfflineFallback, customPrompt } = settings;

  // Try live Gemini API call if API key exists and offline mode isn't explicitly forced
  if (apiKey && apiKey.trim() !== '' && !useOfflineFallback) {
    try {
      const summary = await fetchGeminiSummary(parsedDiff, apiKey, model, customPrompt);
      if (summary) {
        return summary;
      }
    } catch (err: any) {
      console.warn('Gemini API call error:', err);
      throw err;
    }
  }

  // Fallback heuristic engine
  return generateHeuristicSummary(parsedDiff);
}

/**
 * Line-level Ask AI feature
 */
export async function askAiAboutLine(
  lineContent: string,
  filePath: string,
  apiKey?: string,
  modelName: string = 'gemini-1.5-flash'
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
    const targetModel = modelName.includes('2.0') ? 'gemini-2.0-flash' : 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey.trim()}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  modelName: string = 'gemini-1.5-flash',
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
${parsedDiff.rawText.slice(0, 12000)}
`;

  const targetModel = modelName.includes('2.0') ? 'gemini-2.0-flash' : 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey.trim()}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  const diffText = parsedDiff.rawText.toLowerCase();

  // 1. Analyze Auth & Password validation
  if (diffText.includes('login') || diffText.includes('auth') || diffText.includes('password')) {
    summaryPoints.push('Refactored authentication service');
    securityRisk += 40;

    if (diffText.includes('validate') || diffText.includes('strength') || diffText.includes('bcrypt')) {
      summaryPoints.push('Added password strength & credential validation');
      suggestedTests.push({
        id: 't-pass-invalid',
        category: 'Unit',
        title: 'Invalid password strength',
        description: 'Verify password rejecting passwords under 8 characters or missing special characters'
      });
    }
    if (diffText.includes('token') || diffText.includes('expiresin') || diffText.includes('jwt')) {
      suggestedTests.push({
        id: 't-token-exp',
        category: 'Security',
        title: 'Expired token handling',
        description: 'Verify behavior when authentication token expires or is malformed'
      });
    }
    if (diffText.includes('rememberme') || diffText.includes('remember')) {
      suggestedTests.push({
        id: 't-remember-me',
        category: 'Integration',
        title: 'Remember Me session duration',
        description: 'Verify token expiration extension (30 days vs 1 hour) when Remember Me is enabled'
      });
    }
  }

  // 2. Analyze API Endpoint Changes
  if (diffText.includes('@post') || diffText.includes('@get') || diffText.includes('/v2/') || diffText.includes('endpoint')) {
    summaryPoints.push('Updated REST API endpoint contracts');
    if (diffText.includes('/v2/') || diffText.includes('/v1/')) {
      breakingChanges.push('API endpoint version route updated (e.g. /v2/auth/login)');
      apiBreakingRisk += 60;
    }
  }

  // 3. Analyze Webhook & Signatures
  if (diffText.includes('stripe') || diffText.includes('webhook') || diffText.includes('signature')) {
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
  if (diffText.includes('alter table') || diffText.includes('drop column') || diffText.includes('migration')) {
    summaryPoints.push('Executed database schema migration');
    apiBreakingRisk += 70;

    if (diffText.includes('drop column')) {
      const match = diffText.match(/drop column\s+([a_z0-9_]+)/i);
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
