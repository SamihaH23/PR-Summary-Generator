import React, { useState } from 'react';
import { PRSummary, TestCase, TestCategory } from '../types';
import { AlertTriangle, CheckSquare, Shield, Copy, Check, FileText, Sparkles, Plus, Download, FileCode2, Trash2, GitCommit, GitBranch, Clock, BarChart2 } from 'lucide-react';
import { generatePRMarkdown } from '../utils/aiSummarizer';

interface SummaryOutputProps {
  summary: PRSummary | null;
  isAnalyzing: boolean;
  onUpdateSummary?: (updated: PRSummary) => void;
  totalAdditions?: number;
  totalDeletions?: number;
}

export const SummaryOutput: React.FC<SummaryOutputProps> = ({
  summary,
  isAnalyzing,
  onUpdateSummary,
  totalAdditions = 0,
  totalDeletions = 0
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCommit, setCopiedCommit] = useState(false);
  const [copiedBranch, setCopiedBranch] = useState(false);
  const [newTestTitle, setNewTestTitle] = useState('');
  const [newTestCategory, setNewTestCategory] = useState<TestCategory>('Unit');
  const [showAddForm, setShowAddForm] = useState(false);

  if (isAnalyzing) {
    return (
      <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles className="loading-shimmer" size={20} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f3f4f6' }}>
            Analyzing Git Diff & Generating PR Insights...
          </h3>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="loading-shimmer" style={{ height: '24px', width: '60%', borderRadius: '6px' }} />
          <div className="loading-shimmer" style={{ height: '18px', width: '90%', borderRadius: '6px' }} />
          <div className="loading-shimmer" style={{ height: '18px', width: '80%', borderRadius: '6px' }} />
          <div className="loading-shimmer" style={{ height: '40px', width: '100%', borderRadius: '8px', marginTop: '10px' }} />
          <div className="loading-shimmer" style={{ height: '120px', width: '100%', borderRadius: '8px' }} />
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
        <FileText size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '6px' }}>
          Ready for PR Review
        </h3>
        <p style={{ fontSize: '0.82rem', color: '#6b7280', maxWidth: '420px', margin: '0 auto' }}>
          Paste a Git diff or select one of the pre-loaded sample diffs above, then click <strong>Generate PR Summary</strong>.
        </p>
      </div>
    );
  }

  const handleToggleTest = (id: string) => {
    const updatedTests = summary.suggestedTests.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    updateSummaryState(updatedTests);
  };

  const handleAddTest = () => {
    if (!newTestTitle.trim()) return;
    const newTest: TestCase = {
      id: `custom-${Date.now()}`,
      category: newTestCategory,
      title: newTestTitle.trim(),
      completed: false
    };
    const updatedTests = [...summary.suggestedTests, newTest];
    updateSummaryState(updatedTests);
    setNewTestTitle('');
    setShowAddForm(false);
  };

  const handleDeleteTest = (id: string) => {
    const updatedTests = summary.suggestedTests.filter(t => t.id !== id);
    updateSummaryState(updatedTests);
  };

  const updateSummaryState = (updatedTests: TestCase[]) => {
    const updatedMarkdown = generatePRMarkdown(
      summary.title,
      summary.summaryPoints,
      summary.riskLevel,
      summary.riskRationale,
      summary.breakingChanges,
      updatedTests,
      summary.securityNotes || []
    );

    const updatedSummary: PRSummary = {
      ...summary,
      suggestedTests: updatedTests,
      prDescriptionMarkdown: updatedMarkdown
    };

    if (onUpdateSummary) {
      onUpdateSummary(updatedSummary);
    }
  };

  const copyMarkdown = () => {
    navigator.clipboard.writeText(summary.prDescriptionMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCommit = () => {
    if (summary.commitSuggestions?.conventionalCommit) {
      navigator.clipboard.writeText(summary.commitSuggestions.conventionalCommit);
      setCopiedCommit(true);
      setTimeout(() => setCopiedCommit(false), 2000);
    }
  };

  const copyBranch = () => {
    if (summary.commitSuggestions?.branchName) {
      navigator.clipboard.writeText(summary.commitSuggestions.branchName);
      setCopiedBranch(true);
      setTimeout(() => setCopiedBranch(false), 2000);
    }
  };

  const downloadMarkdownFile = () => {
    const element = document.createElement('a');
    const file = new Blob([summary.prDescriptionMarkdown], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `PR_Summary_${Date.now()}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadJsonReport = () => {
    const element = document.createElement('a');
    const file = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = `PR_Report_${Date.now()}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const verifiedCount = summary.suggestedTests.filter(t => t.completed).length;

  const totalLines = totalAdditions + totalDeletions;
  const addRatio = totalLines > 0 ? Math.round((totalAdditions / totalLines) * 100) : 50;
  const delRatio = 100 - addRatio;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Executive Summary Card */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
            {summary.title}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {summary.complexityScore && (
              <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#d1d5db', border: '1px solid var(--border-color)' }}>
                <BarChart2 size={11} /> {summary.complexityScore} Size
              </span>
            )}
            {summary.estimatedReviewTime && (
              <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <Clock size={11} /> {summary.estimatedReviewTime}
              </span>
            )}
            <div className={`badge badge-risk-${summary.riskLevel}`}>
              <AlertTriangle size={13} />
              Risk: {summary.riskLevel}
            </div>
          </div>
        </div>

        {/* Diff Additions / Deletions Visual Ratio Bar */}
        {totalLines > 0 && (
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>
              <span style={{ color: '#34d399', fontWeight: 600 }}>+{totalAdditions} ({addRatio}%)</span>
              <span style={{ color: '#f87171', fontWeight: 600 }}>-{totalDeletions} ({delRatio}%)</span>
            </div>
            <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.4)', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${addRatio}%`, height: '100%', background: '#34d399' }} />
            </div>
          </div>
        )}

        {/* Summary Points */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            Summary
          </h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {summary.summaryPoints.map((point, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.92rem', color: '#f3f4f6' }}>
                <span style={{ color: 'var(--accent-primary)', marginTop: '2px', fontWeight: 700 }}>•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Risk Rationale */}
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderLeft: `4px solid ${getRiskColor(summary.riskLevel)}`,
          fontSize: '0.85rem',
          color: '#d1d5db',
          marginBottom: '16px'
        }}>
          <strong>Risk Assessment Rationale:</strong> {summary.riskRationale}
        </div>

        {/* Risk Breakdown Sub-meters */}
        {summary.riskBreakdown && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>
                <span>Security Risk</span>
                <span>{summary.riskBreakdown.securityRisk}%</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${summary.riskBreakdown.securityRisk}%`, background: getGaugeColor(summary.riskBreakdown.securityRisk) }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>
                <span>API Breaking</span>
                <span>{summary.riskBreakdown.apiBreakingRisk}%</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${summary.riskBreakdown.apiBreakingRisk}%`, background: getGaugeColor(summary.riskBreakdown.apiBreakingRisk) }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>
                <span>Complexity</span>
                <span>{summary.riskBreakdown.complexityRisk}%</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${summary.riskBreakdown.complexityRisk}%`, background: getGaugeColor(summary.riskBreakdown.complexityRisk) }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Conventional Commit & Branch Name Generator */}
      {summary.commitSuggestions && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <GitCommit size={18} /> Git Commit & Branch Generator
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Conventional Commit */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                <GitCommit size={14} color="#34d399" />
                <code style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: '#34d399', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {summary.commitSuggestions.conventionalCommit}
                </code>
              </div>
              <button onClick={copyCommit} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                {copiedCommit ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                <span>{copiedCommit ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Branch Name */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                <GitBranch size={14} color="var(--accent-cyan)" />
                <code style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {summary.commitSuggestions.branchName}
                </code>
              </div>
              <button onClick={copyBranch} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                {copiedBranch ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                <span>{copiedBranch ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breaking Changes Alert (if present) */}
      {summary.breakingChanges && summary.breakingChanges.length > 0 && (
        <div className="glass-panel" style={{
          padding: '20px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          background: 'rgba(239, 68, 68, 0.05)'
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <AlertTriangle size={18} color="#f87171" /> Breaking Changes Detected ({summary.breakingChanges.length})
          </h3>
          <ul style={{ listStyle: 'disc', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.88rem', color: '#fca5a5' }}>
            {summary.breakingChanges.map((change, i) => (
              <li key={i}>{change}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested Test Cases Checklist */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={18} color="var(--accent-cyan)" /> Suggested Tests
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
              {verifiedCount} / {summary.suggestedTests.length} verified
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem' }}
            >
              <Plus size={12} /> Add Test
            </button>
          </div>
        </div>

        {/* Add Test Form */}
        {showAddForm && (
          <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <select
                value={newTestCategory}
                onChange={(e) => setNewTestCategory(e.target.value as TestCategory)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              >
                <option value="Unit">Unit</option>
                <option value="Integration">Integration</option>
                <option value="Security">Security</option>
                <option value="Edge Case">Edge Case</option>
                <option value="Regression">Regression</option>
              </select>
              <input
                type="text"
                value={newTestTitle}
                onChange={(e) => setNewTestTitle(e.target.value)}
                placeholder="Enter test scenario description..."
                style={{
                  flex: 1,
                  minWidth: '200px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(0,0,0,0.2)',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <button onClick={handleAddTest} className="btn btn-primary btn-sm">
                Add Scenario
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {summary.suggestedTests.map((test) => {
            const isChecked = Boolean(test.completed);
            return (
              <div
                key={test.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ marginTop: '2px', cursor: 'pointer' }} onClick={() => handleToggleTest(test.id)}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleToggleTest(test.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(99, 102, 241, 0.2)',
                      color: 'var(--accent-primary)',
                      textTransform: 'uppercase'
                    }}>
                      {test.category}
                    </span>
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: isChecked ? '#34d399' : '#f3f4f6',
                      textDecoration: isChecked ? 'line-through' : 'none'
                    }}>
                      {test.title}
                    </span>
                  </div>
                  {test.description && (
                    <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '2px' }}>
                      {test.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteTest(test.id)}
                  style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '2px' }}
                  title="Remove test case"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security & Quality Notes (if present) */}
      {summary.securityNotes && summary.securityNotes.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Shield size={18} color="#fbbf24" /> Security & Quality Audit Notes
          </h3>
          <ul style={{ listStyle: 'disc', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: '#d1d5db' }}>
            {summary.securityNotes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Export Suite & Ready-to-Copy PR Description */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--accent-primary)" /> Ready-to-Copy PR Description (Markdown)
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={downloadJsonReport}
              className="btn btn-secondary btn-sm"
              title="Download full JSON report"
            >
              <FileCode2 size={13} /> JSON
            </button>
            <button
              onClick={downloadMarkdownFile}
              className="btn btn-secondary btn-sm"
              title="Download as .md file"
            >
              <Download size={13} /> Export .md
            </button>
            <button
              onClick={copyMarkdown}
              className="btn btn-primary btn-sm"
            >
              {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
            </button>
          </div>
        </div>

        <pre style={{
          padding: '16px',
          borderRadius: '8px',
          background: 'rgba(5, 8, 15, 0.8)',
          border: '1px solid var(--border-color)',
          color: '#d1d5db',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.82rem',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {summary.prDescriptionMarkdown}
        </pre>
      </div>

    </div>
  );
};

function getRiskColor(level: string): string {
  switch (level) {
    case 'Critical': return '#ef4444';
    case 'High': return '#f97316';
    case 'Medium': return '#f59e0b';
    case 'Low': return '#10b981';
    default: return '#6366f1';
  }
}

function getGaugeColor(score: number): string {
  if (score >= 70) return '#ef4444';
  if (score >= 40) return '#f59e0b';
  return '#10b981';
}
