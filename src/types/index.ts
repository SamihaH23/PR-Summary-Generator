export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type TestCategory = 'Unit' | 'Integration' | 'Security' | 'Edge Case' | 'Regression';


export type DiffViewMode = 'unified' | 'side-by-side';

export interface TestCase {
  id: string;
  category: TestCategory;
  title: string;
  description?: string;
  completed?: boolean;
}

export interface GitDiffLine {
  type: 'add' | 'delete' | 'context' | 'header';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface GitDiffChunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: GitDiffLine[];
}

export interface GitDiffFile {
  oldPath: string;
  newPath: string;
  status: 'added' | 'deleted' | 'modified' | 'renamed' | 'binary';
  chunks: GitDiffChunk[];
  additions: number;
  deletions: number;
  language: string;
  isBinary?: boolean;
}

export interface ParsedDiff {
  files: GitDiffFile[];
  totalAdditions: number;
  totalDeletions: number;
  totalFiles: number;
  rawText: string;
}

export interface RiskBreakdown {
  securityRisk: number; // 0-100
  apiBreakingRisk: number; // 0-100
  complexityRisk: number; // 0-100
}

export interface CommitSuggestions {
  conventionalCommit: string;
  branchName: string;
  shortHeadline: string;
}

export interface PRSummary {
  title: string;
  summaryPoints: string[];
  riskLevel: RiskLevel;
  riskRationale: string;
  riskBreakdown?: RiskBreakdown;
  breakingChanges: string[];
  suggestedTests: TestCase[];
  securityNotes?: string[];
  commitSuggestions?: CommitSuggestions;
  complexityScore?: 'Small' | 'Medium' | 'Large' | 'Chunky';
  estimatedReviewTime?: string;
  prDescriptionMarkdown: string;
  /** Where the summary came from: live Gemini call or the offline heuristic engine. */
  source?: 'ai' | 'offline';
}

export interface LineAnnotation {
  id: string;
  filePath: string;
  lineNumber: number;
  lineContent: string;
  text: string;
  aiResponse?: string;
  createdAt: number;
}

export interface PRHistoryItem {
  id: string;
  timestamp: number;
  title: string;
  riskLevel: RiskLevel;
  totalFiles: number;
  additions: number;
  deletions: number;
  summary: PRSummary;
  rawDiff: string;
}

export interface SampleDiff {
  id: string;
  title: string;
  description: string;
  tags: string[];
  rawDiff: string;
}

export interface AISettings {
  apiKey: string;
  githubToken?: string;
  model: string;
  customPrompt?: string;
  useOfflineFallback: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'error' | 'success' | 'info';
  message: string;
}
