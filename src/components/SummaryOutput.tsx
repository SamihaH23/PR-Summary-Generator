import React, { useState } from 'react';
import { PRSummary } from '../types';
import { AlertTriangle, CheckSquare, Shield, Copy, Check, FileText, Sparkles } from 'lucide-react';

interface SummaryOutputProps {
  summary: PRSummary | null;
  isAnalyzing: boolean;
}

export const SummaryOutput: React.FC<SummaryOutputProps> = ({ summary, isAnalyzing }) => {
  const [copied, setCopied] = useState(false);
  const [testStates, setTestStates] = useState<Record<string, boolean>>({});

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

  const toggleTest = (id: string) => {
    setTestStates(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyMarkdown = () => {
    navigator.clipboard.writeText(summary.prDescriptionMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Executive Summary Card */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
            {summary.title}
          </h2>
          <div className={`badge badge-risk-${summary.riskLevel}`}>
            <AlertTriangle size={13} />
            Risk: {summary.riskLevel}
          </div>
        </div>

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
          color: '#d1d5db'
        }}>
          <strong>Risk Assessment Rationale:</strong> {summary.riskRationale}
        </div>
      </div>

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={18} color="var(--accent-cyan)" /> Suggested Tests
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
            {Object.values(testStates).filter(Boolean).length} / {summary.suggestedTests.length} verified
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {summary.suggestedTests.map((test) => {
            const isChecked = Boolean(testStates[test.id]);
            return (
              <div
                key={test.id}
                onClick={() => toggleTest(test.id)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ marginTop: '2px' }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}} // Handled by div click
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
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

      {/* Generated PR Markdown Output Box */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--accent-primary)" /> Ready-to-Copy PR Description (Markdown)
          </h3>
          <button
            onClick={copyMarkdown}
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
          </button>
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
