export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type TestCategory = 'Unit' | 'Integration' | 'Security' | 'Edge Case' | 'Regression';

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
  status: 'added' | 'deleted' | 'modified' | 'renamed';
  chunks: GitDiffChunk[];
  additions: number;
  deletions: number;
  language: string;
}

export interface ParsedDiff {
  files: GitDiffFile[];
  totalAdditions: number;
  totalDeletions: number;
  totalFiles: number;
  rawText: string;
}

export interface PRSummary {
  title: string;
  summaryPoints: string[];
  riskLevel: RiskLevel;
  riskRationale: string;
  breakingChanges: string[];
  suggestedTests: TestCase[];
  securityNotes?: string[];
  architecturalImpact?: string;
  prDescriptionMarkdown: string;
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
  model: string;
  customPrompt?: string;
  useOfflineFallback: boolean;
}
