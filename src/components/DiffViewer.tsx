import React, { useState, useMemo } from 'react';
import { FileCode, ChevronDown, ChevronRight, FilePlus, FileMinus, Edit3, Search, Maximize2, Minimize2, WrapText, Columns, AlignJustify, MessageSquare, Sparkles, X } from 'lucide-react';
import { ParsedDiff, GitDiffFile, DiffViewMode, LineAnnotation } from '../types';
import { askAiAboutLine } from '../utils/aiSummarizer';

interface DiffViewerProps {
  parsedDiff: ParsedDiff;
  apiKey?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ parsedDiff, apiKey }) => {
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});
  const [filterQuery, setFilterQuery] = useState('');
  const [lineWrap, setLineWrap] = useState(false);
  const [diffViewMode, setDiffViewMode] = useState<DiffViewMode>('unified');

  // Line annotation state
  const [selectedLine, setSelectedLine] = useState<{ filePath: string; lineNumber: number; content: string } | null>(null);
  const [annotationText, setAnnotationText] = useState('');
  const [annotations, setAnnotations] = useState<LineAnnotation[]>([]);
  const [aiAnalyzingLine, setAiAnalyzingLine] = useState(false);

  const filteredFiles = useMemo(() => {
    if (!parsedDiff.files) return [];
    if (!filterQuery.trim()) return parsedDiff.files;
    const q = filterQuery.toLowerCase();
    return parsedDiff.files.filter(f =>
      f.newPath.toLowerCase().includes(q) || f.oldPath.toLowerCase().includes(q)
    );
  }, [parsedDiff.files, filterQuery]);

  if (!parsedDiff.files || parsedDiff.files.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>
        <FileCode size={36} style={{ marginBottom: '8px', opacity: 0.5 }} />
        <p style={{ fontSize: '0.9rem' }}>No parsed git diff content to display</p>
      </div>
    );
  }

  const toggleFile = (path: string) => {
    setCollapsedFiles(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    parsedDiff.files.forEach(f => {
      const p = f.newPath !== 'unknown' ? f.newPath : f.oldPath;
      next[p] = true;
    });
    setCollapsedFiles(next);
  };

  const expandAll = () => {
    setCollapsedFiles({});
  };

  const handleLineClick = (filePath: string, lineNumber?: number, content?: string) => {
    if (!lineNumber || !content) return;
    setSelectedLine({ filePath, lineNumber, content });
    setAnnotationText('');
  };

  const handleSaveAnnotation = async (askAi: boolean = false) => {
    if (!selectedLine) return;

    let aiResp: string | undefined = undefined;
    if (askAi) {
      setAiAnalyzingLine(true);
      aiResp = await askAiAboutLine(selectedLine.content, selectedLine.filePath, apiKey);
      setAiAnalyzingLine(false);
    }

    const newAnno: LineAnnotation = {
      id: `anno-${Date.now()}`,
      filePath: selectedLine.filePath,
      lineNumber: selectedLine.lineNumber,
      lineContent: selectedLine.content,
      text: annotationText.trim() || 'Code review note',
      aiResponse: aiResp,
      createdAt: Date.now()
    };

    setAnnotations(prev => [...prev, newAnno]);
    setSelectedLine(null);
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileCode size={18} color="var(--accent-cyan)" /> Changed Files ({filteredFiles.length} / {parsedDiff.totalFiles})
        </h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* View mode toggle */}
          <div style={{ display: 'flex', gap: '2px', background: 'rgba(0,0,0,0.3)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setDiffViewMode('unified')}
              className={`btn btn-sm ${diffViewMode === 'unified' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '4px 8px', fontSize: '0.75rem', border: 'none' }}
              title="Unified Inline View"
            >
              <AlignJustify size={13} /> Unified
            </button>
            <button
              onClick={() => setDiffViewMode('side-by-side')}
              className={`btn btn-sm ${diffViewMode === 'side-by-side' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '4px 8px', fontSize: '0.75rem', border: 'none' }}
              title="Split Side-by-Side View"
            >
              <Columns size={13} /> Split
            </button>
          </div>

          <button
            onClick={() => setLineWrap(!lineWrap)}
            className={`btn btn-sm ${lineWrap ? 'btn-secondary' : 'btn-outline'}`}
            title="Toggle line wrapping"
          >
            <WrapText size={13} /> {lineWrap ? 'Wrap On' : 'Wrap Off'}
          </button>
          <button onClick={expandAll} className="btn btn-secondary btn-sm" title="Expand all file diffs">
            <Maximize2 size={13} /> Expand All
          </button>
          <button onClick={collapseAll} className="btn btn-secondary btn-sm" title="Collapse all file diffs">
            <Minimize2 size={13} /> Collapse All
          </button>
        </div>
      </div>

      {/* File Search Filter */}
      {parsedDiff.files.length > 2 && (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search changed file paths..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'rgba(0,0,0,0.25)',
              color: '#ffffff',
              fontSize: '0.82rem',
              outline: 'none'
            }}
          />
          <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      )}

      {/* File Tree List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredFiles.map((file, idx) => {
          const filePath = file.newPath !== 'unknown' ? file.newPath : file.oldPath;
          const isCollapsed = collapsedFiles[filePath];
          const fileAnnotations = annotations.filter(a => a.filePath === filePath);

          return (
            <div
              key={idx}
              style={{
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(0, 0, 0, 0.25)',
                overflow: 'hidden'
              }}
            >
              {/* File Header */}
              <div
                onClick={() => toggleFile(filePath)}
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#e5e7eb', overflow: 'hidden' }}>
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  {getStatusIcon(file.status)}
                  <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {filePath}
                  </span>
                  {fileAnnotations.length > 0 && (
                    <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.2)', color: 'var(--accent-primary)', fontSize: '0.68rem', padding: '2px 6px' }}>
                      <MessageSquare size={10} /> {fileAnnotations.length}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: '#34d399' }}>+{file.additions}</span>
                  <span style={{ color: '#f87171' }}>-{file.deletions}</span>
                </div>
              </div>

              {/* Diff Code Chunks */}
              {!isCollapsed && (
                <div className="diff-container" style={{ overflowX: 'auto', background: 'rgba(5, 8, 15, 0.8)' }}>
                  {file.isBinary ? (
                    <div style={{ padding: '16px', color: '#9ca3af', fontStyle: 'italic', fontSize: '0.82rem' }}>
                      Binary file changes omitted
                    </div>
                  ) : diffViewMode === 'unified' ? (
                    /* UNIFIED VIEW */
                    file.chunks.map((chunk, chunkIdx) => (
                      <div key={chunkIdx}>
                        <div className="diff-line-header" style={{ padding: '4px 14px', fontSize: '0.75rem' }}>
                          {chunk.header}
                        </div>

                        {chunk.lines.map((line, lineIdx) => {
                          let lineClass = '';
                          let prefix = ' ';
                          if (line.type === 'add') {
                            lineClass = 'diff-line-add';
                            prefix = '+';
                          } else if (line.type === 'delete') {
                            lineClass = 'diff-line-delete';
                            prefix = '-';
                          }

                          const lineNum = line.newLineNumber || line.oldLineNumber;
                          const lineAnno = annotations.find(a => a.filePath === filePath && a.lineNumber === lineNum);

                          return (
                            <React.Fragment key={lineIdx}>
                              <div
                                className={lineClass}
                                style={{
                                  display: 'flex',
                                  alignItems: 'stretch',
                                  fontSize: '0.82rem',
                                  lineHeight: '1.5'
                                }}
                              >
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLineClick(filePath, lineNum, line.content);
                                  }}
                                  className="split-diff-num"
                                  title="Click to annotate or ask AI"
                                >
                                  {line.oldLineNumber || ''}
                                </div>
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLineClick(filePath, lineNum, line.content);
                                  }}
                                  className="split-diff-num"
                                  title="Click to annotate or ask AI"
                                >
                                  {line.newLineNumber || ''}
                                </div>
                                <div style={{ width: '20px', minWidth: '20px', textAlign: 'center', userSelect: 'none', fontWeight: 600 }}>
                                  {prefix}
                                </div>
                                <div style={{
                                  flex: 1,
                                  paddingRight: '12px',
                                  whiteSpace: lineWrap ? 'pre-wrap' : 'pre',
                                  wordBreak: lineWrap ? 'break-all' : 'normal'
                                }}>
                                  {line.content}
                                </div>
                              </div>

                              {/* Inline Annotation Box */}
                              {lineAnno && (
                                <div style={{
                                  padding: '10px 14px 10px 100px',
                                  background: 'rgba(99, 102, 241, 0.08)',
                                  borderLeft: '4px solid var(--accent-primary)',
                                  fontSize: '0.8rem',
                                  color: '#e5e7eb'
                                }}>
                                  <div style={{ fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <MessageSquare size={12} /> Note on Line {lineAnno.lineNumber}
                                  </div>
                                  <div>{lineAnno.text}</div>
                                  {lineAnno.aiResponse && (
                                    <div style={{ marginTop: '6px', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#d1d5db' }}>
                                      <strong style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}><Sparkles size={11} /> AI Line Analysis:</strong>
                                      {lineAnno.aiResponse}
                                    </div>
                                  )}
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    ))
                  ) : (
                    /* SPLIT SIDE-BY-SIDE VIEW */
                    file.chunks.map((chunk, chunkIdx) => (
                      <div key={chunkIdx}>
                        <div className="diff-line-header" style={{ padding: '4px 14px', fontSize: '0.75rem' }}>
                          {chunk.header}
                        </div>

                        <div className="split-diff-grid">
                          {chunk.lines.map((line, lineIdx) => {
                            const isAdd = line.type === 'add';
                            const isDel = line.type === 'delete';

                            return (
                              <React.Fragment key={lineIdx}>
                                {/* Left Cell (Old Code) */}
                                <div className={`split-diff-cell ${isDel ? 'diff-line-delete' : ''}`}>
                                  <div className="split-diff-num">{line.oldLineNumber || ''}</div>
                                  <div style={{ padding: '0 8px', whiteSpace: 'pre', overflowX: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                    {isDel || line.type === 'context' ? line.content : ''}
                                  </div>
                                </div>

                                {/* Right Cell (New Code) */}
                                <div className={`split-diff-cell ${isAdd ? 'diff-line-add' : ''}`}>
                                  <div className="split-diff-num">{line.newLineNumber || ''}</div>
                                  <div style={{ padding: '0 8px', whiteSpace: 'pre', overflowX: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                    {isAdd || line.type === 'context' ? line.content : ''}
                                  </div>
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Line Annotation Modal */}
      {selectedLine && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1600,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={16} color="var(--accent-primary)" /> Annotate Line {selectedLine.lineNumber}
              </h3>
              <button onClick={() => setSelectedLine(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#34d399', overflowX: 'auto' }}>
              {selectedLine.content}
            </div>

            <textarea
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
              placeholder="Add your review note or question..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'rgba(0,0,0,0.2)',
                color: '#ffffff',
                fontSize: '0.84rem',
                outline: 'none'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => handleSaveAnnotation(false)} className="btn btn-secondary btn-sm">
                Save Note
              </button>
              <button onClick={() => handleSaveAnnotation(true)} disabled={aiAnalyzingLine} className="btn btn-primary btn-sm">
                <Sparkles size={13} /> {aiAnalyzingLine ? 'Analyzing...' : 'Ask AI About Line'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

function getStatusIcon(status: GitDiffFile['status']) {
  switch (status) {
    case 'added':
      return <FilePlus size={14} color="#34d399" />;
    case 'deleted':
      return <FileMinus size={14} color="#f87171" />;
    case 'renamed':
      return <Edit3 size={14} color="#fbbf24" />;
    default:
      return <Edit3 size={14} color="var(--accent-cyan)" />;
  }
}
