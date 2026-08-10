import React, { useState, useRef } from 'react';
import { Upload, Sparkles, AlertCircle, Link as LinkIcon, Code2, Command } from 'lucide-react';

interface DiffInputProps {
  rawDiff: string;
  onDiffChange: (val: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  fileStats?: { totalFiles: number; totalAdditions: number; totalDeletions: number };
  githubToken?: string;
}

export const DiffInput: React.FC<DiffInputProps> = ({
  rawDiff,
  onDiffChange,
  onAnalyze,
  isAnalyzing,
  fileStats,
  githubToken
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'url'>('paste');
  const [prUrl, setPrUrl] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onDiffChange(content);
        setActiveTab('paste');
      }
    };
    reader.readAsText(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (rawDiff.trim() && !isAnalyzing) {
        onAnalyze();
      }
    }
  };

  const handleFetchPR = async () => {
    if (!prUrl.trim()) return;
    setUrlError('');
    setUrlLoading(true);

    try {
      // Parse GitHub URL: https://github.com/owner/repo/pull/123
      const match = prUrl.trim().match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
      let fetchUrl = prUrl.trim();
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3.diff'
      };

      if (githubToken && githubToken.trim()) {
        headers['Authorization'] = `token ${githubToken.trim()}`;
      }

      if (match) {
        const [, owner, repo, pullNumber] = match;
        fetchUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`;
      } else if (!fetchUrl.endsWith('.diff')) {
        fetchUrl = fetchUrl.replace(/\/$/, '') + '.diff';
      }

      const res = await fetch(fetchUrl, { headers });
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('GitHub API rate limit exceeded or access forbidden. Add a Personal Access Token in API Settings.');
        } else if (res.status === 404) {
          throw new Error('PR not found. Ensure the repository and PR number exist and are accessible.');
        } else {
          throw new Error(`Failed to fetch PR (${res.status} ${res.statusText}).`);
        }
      }
      const text = await res.text();
      if (!text || !text.trim()) {
        throw new Error('Retrieved empty diff content from GitHub PR.');
      }
      onDiffChange(text);
      setActiveTab('paste');
    } catch (err: any) {
      setUrlError(err.message || 'Failed to fetch PR URL');
    } finally {
      setUrlLoading(false);
    }
  };

  const lineCount = rawDiff ? rawDiff.split('\n').length : 0;

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('paste')}
            className={`btn btn-sm ${activeTab === 'paste' ? 'btn-secondary' : 'btn-outline'}`}
            style={{ borderColor: activeTab === 'paste' ? 'var(--accent-primary)' : 'transparent' }}
          >
            <Code2 size={14} /> Paste Diff
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`btn btn-sm ${activeTab === 'upload' ? 'btn-secondary' : 'btn-outline'}`}
            style={{ borderColor: activeTab === 'upload' ? 'var(--accent-primary)' : 'transparent' }}
          >
            <Upload size={14} /> Upload File (.diff)
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`btn btn-sm ${activeTab === 'url' ? 'btn-secondary' : 'btn-outline'}`}
            style={{ borderColor: activeTab === 'url' ? 'var(--accent-primary)' : 'transparent' }}
          >
            <LinkIcon size={14} /> Fetch GitHub PR
          </button>
        </div>

        {fileStats && fileStats.totalFiles > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: '#9ca3af' }}>
            <span>Files: <strong>{fileStats.totalFiles}</strong></span>
            <span style={{ color: '#34d399' }}>+{fileStats.totalAdditions}</span>
            <span style={{ color: '#f87171' }}>-{fileStats.totalDeletions}</span>
          </div>
        )}
      </div>

      {/* Tab Contents */}
      {activeTab === 'paste' && (
        <div style={{ position: 'relative' }}>
          <textarea
            value={rawDiff}
            onChange={(e) => onDiffChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste raw `git diff` output or git patch here... (Press Cmd+Enter to run AI summary)"
            style={{
              width: '100%',
              minHeight: '260px',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'rgba(5, 8, 15, 0.6)',
              color: '#e5e7eb',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              lineHeight: '1.5',
              outline: 'none',
              resize: 'vertical'
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.75rem',
            color: '#6b7280',
            pointerEvents: 'none'
          }}>
            <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', color: '#9ca3af', textTransform: 'none' }}>
              <Command size={10} /> + Enter
            </span>
            <span>{lineCount} lines</span>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--border-color)',
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'rgba(0, 0, 0, 0.2)',
            transition: 'all 0.2s ease'
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".diff,.patch,.txt"
            style={{ display: 'none' }}
          />
          <Upload size={32} color="var(--accent-primary)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '0.95rem', color: '#f3f4f6', marginBottom: '4px' }}>
            Click to upload or drag & drop `.diff` / `.patch` file
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
            Supports standard unified git diff format
          </p>
        </div>
      )}

      {activeTab === 'url' && (
        <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/pull/123"
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(0, 0, 0, 0.3)',
                color: '#ffffff',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
            <button
              onClick={handleFetchPR}
              disabled={urlLoading || !prUrl.trim()}
              className="btn btn-secondary"
            >
              {urlLoading ? 'Fetching...' : 'Fetch PR Diff'}
            </button>
          </div>
          {urlError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#f87171' }}>
              <AlertCircle size={14} /> {urlError}
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
        <button
          onClick={() => onDiffChange('')}
          className="btn btn-secondary btn-sm"
          disabled={!rawDiff}
        >
          Clear Input
        </button>

        <button
          onClick={onAnalyze}
          disabled={isAnalyzing || !rawDiff.trim()}
          className="btn btn-primary"
          style={{ padding: '10px 22px', fontSize: '0.92rem', fontWeight: 600 }}
        >
          <Sparkles size={18} />
          {isAnalyzing ? 'Analyzing Diff...' : 'Generate PR Summary'}
        </button>
      </div>

    </div>
  );
};
