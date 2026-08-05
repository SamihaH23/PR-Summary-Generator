import React, { useState, useRef } from 'react';
import { Upload, Sparkles, AlertCircle, Link as LinkIcon, Code2 } from 'lucide-react';

interface DiffInputProps {
  rawDiff: string;
  onDiffChange: (val: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  fileStats?: { totalFiles: number; totalAdditions: number; totalDeletions: number };
}

export const DiffInput: React.FC<DiffInputProps> = ({
  rawDiff,
  onDiffChange,
  onAnalyze,
  isAnalyzing,
  fileStats
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

  const handleFetchPR = async () => {
    if (!prUrl.trim()) return;
    setUrlError('');
    setUrlLoading(true);

    try {
      // Parse github PR URL: https://github.com/owner/repo/pull/123 -> convert to .diff URL
      let fetchUrl = prUrl.trim();
      if (fetchUrl.includes('github.com') && !fetchUrl.endsWith('.diff')) {
        fetchUrl = fetchUrl.replace(/\/$/, '') + '.diff';
      }

      const res = await fetch(fetchUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch PR diff (${res.status} ${res.statusText}). Note: CORS may restrict direct browser fetches from public GitHub repos. You can copy the diff content or use sample diffs.`);
      }
      const text = await res.text();
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('paste')}
            className={`btn ${activeTab === 'paste' ? 'btn-secondary' : 'btn-outline'}`}
            style={{ padding: '6px 12px', fontSize: '0.82rem', borderColor: activeTab === 'paste' ? 'var(--accent-primary)' : 'transparent' }}
          >
            <Code2 size={14} /> Paste Raw Diff
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`btn ${activeTab === 'upload' ? 'btn-secondary' : 'btn-outline'}`}
            style={{ padding: '6px 12px', fontSize: '0.82rem', borderColor: activeTab === 'upload' ? 'var(--accent-primary)' : 'transparent' }}
          >
            <Upload size={14} /> Upload File (.diff)
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`btn ${activeTab === 'url' ? 'btn-secondary' : 'btn-outline'}`}
            style={{ padding: '6px 12px', fontSize: '0.82rem', borderColor: activeTab === 'url' ? 'var(--accent-primary)' : 'transparent' }}
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
            placeholder="Paste raw `git diff` output or git patch here..."
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
          <div style={{ position: 'absolute', bottom: '12px', right: '14px', fontSize: '0.75rem', color: '#6b7280', pointerEvents: 'none' }}>
            {lineCount} lines
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
            Supports standard unified diff format
          </p>
        </div>
      )}

      {activeTab === 'url' && (
        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/pull/123"
              style={{
                flex: 1,
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
              {urlLoading ? 'Fetching...' : 'Fetch Diff'}
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
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          disabled={!rawDiff}
        >
          Clear Input
        </button>

        <button
          onClick={onAnalyze}
          disabled={isAnalyzing || !rawDiff.trim()}
          className="btn btn-primary"
          style={{ padding: '12px 24px', fontSize: '0.95rem', fontWeight: 600 }}
        >
          <Sparkles size={18} />
          {isAnalyzing ? 'Analyzing Diff...' : 'Generate PR Summary'}
        </button>
      </div>

    </div>
  );
};
