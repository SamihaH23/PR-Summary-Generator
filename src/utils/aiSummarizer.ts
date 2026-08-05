import { ParsedDiff, PRSummary, AISettings, RiskLevel, TestCase } from '../types';

/**
 * Summarizes a Git diff using Google Gemini API if key is provided,
 * or using intelligent heuristic analysis as an instant zero-latency fallback.
 */
export async function generatePRSummary(
  parsedDiff: ParsedDiff,
  settings: AISettings
): Promise<PRSummary> {
  const { apiKey, model, useOfflineFallback } = settings;

  // Try live Gemini API call if API key exists and offline mode isn't explicitly forced
  if (apiKey && apiKey.trim() !== '' && !useOfflineFallback) {
    try {
      const summary = await fetchGeminiSummary(parsedDiff, apiKey, model);
      if (summary) {
        return summary;
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local heuristic analyzer:', err);
    }
  }

  // Fallback heuristic engine
  return generateHeuristicSummary(parsedDiff);
}

async function fetchGeminiSummary(
  parsedDiff: ParsedDiff,
  apiKey: string,
  modelName: string = 'gemini-1.5-flash'
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
  "prDescriptionMarkdown": "Full GitHub PR description in markdown format"
}

Rule Guidelines:
1. Summaries MUST be concise, action-oriented bullet points (e.g., 'Added password strength validation', 'Migrated auth payload to DTO').
2. Explicitly flag breaking API endpoint changes, removed database columns, or altered method signatures in breakingChanges.
3. Classify risk level accurately:
   - Critical: Payment processing, security bypasses, raw crypto/hashing changes.
   - High: Schema migrations, auth flow alterations, public API endpoint modifications.
   - Medium: Auth refactor, service logic changes, token expiry handling.
   - Low: UI tweaks, non-breaking helper updates, refactoring without side-effects.
4. Suggest concrete, practical test cases tailored to the specific diff changes (e.g. 'Invalid password', 'Expired token', 'Remember Me session expiry', 'Malformed payload').
5. Respond ONLY with valid JSON (no markdown formatting fences around JSON).

GIT DIFF TO ANALYZE:
Total Files: ${parsedDiff.totalFiles} (+${parsedDiff.totalAdditions} / -${parsedDiff.totalDeletions})

Raw Diff Snippet:
${parsedDiff.rawText.slice(0, 10000)}
`;

  const targetModel = modelName.includes('2.0') ? 'gemini-2.0-flash' : 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

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
    throw new Error(`Gemini API HTTP Error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) return null;

  try {
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return normalizePRSummary(parsed, parsedDiff);
  } catch (parseErr) {
    console.error('Failed to parse Gemini response JSON:', parseErr);
    return null;
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
  let riskScore = 0; // 0-10 scale

  const diffText = parsedDiff.rawText.toLowerCase();

  // 1. Analyze Auth & Password validation
  if (diffText.includes('login') || diffText.includes('auth') || diffText.includes('password')) {
    summaryPoints.push('Refactored authentication service');
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
    riskScore += 4;
  }

  // 2. Analyze API Endpoint Changes
  if (diffText.includes('@post') || diffText.includes('@get') || diffText.includes('/v2/') || diffText.includes('endpoint')) {
    summaryPoints.push('Updated REST API endpoint contracts');
    if (diffText.includes('/v2/') || diffText.includes('/v1/')) {
      breakingChanges.push('API endpoint version route updated (e.g. /v2/auth/login)');
      riskScore += 3;
    }
  }

  // 3. Analyze Webhook & Signatures
  if (diffText.includes('stripe') || diffText.includes('webhook') || diffText.includes('signature')) {
    summaryPoints.push('Added HMAC webhook signature verification and event handling');
    securityNotes.push('Ensure raw request body payload is preserved for cryptographic signature verification.');
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
    riskScore += 5;
  }

  // 4. Analyze Database migrations & column changes
  if (diffText.includes('alter table') || diffText.includes('drop column') || diffText.includes('migration')) {
    summaryPoints.push('Executed database schema migration');
    if (diffText.includes('drop column')) {
      const match = diffText.match(/drop column\s+([a_z0-9_]+)/i);
      const colName = match ? match[1] : 'column';
      breakingChanges.push(`Dropped database column \`${colName}\`. Downstream dependencies must be updated.`);
      riskScore += 5;
    }
    suggestedTests.push({
      id: 't-db-migration',
      category: 'Regression',
      title: 'Database Data Integrity Check',
      description: 'Verify existing user records correctly migrate split fields without data loss'
    });
  }

  // File breakdown analysis if summaryPoints is sparse
  if (summaryPoints.length === 0) {
    parsedDiff.files.forEach(file => {
      if (file.status === 'added') {
        summaryPoints.push(`Added new file ${file.newPath}`);
      } else if (file.status === 'deleted') {
        summaryPoints.push(`Removed file ${file.oldPath}`);
        breakingChanges.push(`Deleted source module ${file.oldPath}`);
      } else {
        summaryPoints.push(`Updated ${file.newPath} (+${file.additions} / -${file.deletions})`);
      }
    });
  }

  // Calculate Risk Level
  if (riskScore >= 7 || breakingChanges.length >= 2) {
    riskLevel = 'Critical';
  } else if (riskScore >= 4 || breakingChanges.length >= 1) {
    riskLevel = 'High';
  } else if (riskScore >= 2 || parsedDiff.totalAdditions > 50) {
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

  const prDescriptionMarkdown = `# ${title}

## Summary
${summaryPoints.map(p => `• ${p}`).join('\n')}

## Risk Assessment
**Level**: ${riskLevel}
${riskRationale}

${breakingChanges.length > 0 ? `## ⚠️ Breaking Changes\n${breakingChanges.map(b => `- ${b}`).join('\n')}\n` : ''}
## Suggested Test Cases
${suggestedTests.map(t => `- [ ] **[${t.category}]** ${t.title}: ${t.description || ''}`).join('\n')}

${securityNotes.length > 0 ? `## 🛡️ Security Notes\n${securityNotes.map(s => `- ${s}`).join('\n')}` : ''}
`;

  return {
    title,
    summaryPoints,
    riskLevel,
    riskRationale,
    breakingChanges,
    suggestedTests,
    securityNotes,
    prDescriptionMarkdown
  };
}

function getRiskRationale(level: RiskLevel, parsedDiff: ParsedDiff, breakingCount: number): string {
  switch (level) {
    case 'Critical':
      return `Critical risk due to cryptographic/payment changes or ${breakingCount} breaking changes across ${parsedDiff.totalFiles} modified files.`;
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
  return {
    title: raw.title || 'Pull Request Summary',
    summaryPoints: Array.isArray(raw.summaryPoints) ? raw.summaryPoints : ['Updated source files'],
    riskLevel: (['Low', 'Medium', 'High', 'Critical'].includes(raw.riskLevel) ? raw.riskLevel : 'Medium') as RiskLevel,
    riskRationale: raw.riskRationale || `Analyzed ${parsedDiff.totalFiles} files in diff.`,
    breakingChanges: Array.isArray(raw.breakingChanges) ? raw.breakingChanges : [],
    suggestedTests: Array.isArray(raw.suggestedTests) ? raw.suggestedTests.map((t: any, idx: number) => ({
      id: t.id || `t-${idx}`,
      category: t.category || 'Unit',
      title: t.title || 'Verify functionality',
      description: t.description || ''
    })) : [],
    securityNotes: Array.isArray(raw.securityNotes) ? raw.securityNotes : [],
    prDescriptionMarkdown: raw.prDescriptionMarkdown || '# PR Summary\n\nGenerated by PR Summary Generator'
  };
}
