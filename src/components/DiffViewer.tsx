import React, { useState } from 'react';
import { FileCode, ChevronDown, ChevronRight, FilePlus, FileMinus, Edit3 } from 'lucide-react';
import { ParsedDiff, GitDiffFile } from '../types';

interface DiffViewerProps {
  parsedDiff: ParsedDiff;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ parsedDiff }) => {
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});

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

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileCode size={18} color="var(--accent-cyan)" /> Changed Files ({parsedDiff.totalFiles})
        </h3>
        <div style={{ fontSize: '0.8rem', display: 'flex', gap: '12px' }}>
          <span style={{ color: '#34d399', fontWeight: 600 }}>+{parsedDiff.totalAdditions}</span>
          <span style={{ color: '#f87171', fontWeight: 600 }}>-{parsedDiff.totalDeletions}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {parsedDiff.files.map((file, idx) => {
          const filePath = file.newPath !== 'unknown' ? file.newPath : file.oldPath;
          const isCollapsed = collapsedFiles[filePath];

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#e5e7eb' }}>
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  {getStatusIcon(file.status)}
                  <span style={{ fontWeight: 500 }}>{filePath}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: '#34d399' }}>+{file.additions}</span>
                  <span style={{ color: '#f87171' }}>-{file.deletions}</span>
                </div>
              </div>

              {/* Diff Code Chunks */}
              {!isCollapsed && (
                <div className="diff-container" style={{ overflowX: 'auto', background: 'rgba(5, 8, 15, 0.8)' }}>
                  {file.chunks.map((chunk, chunkIdx) => (
                    <div key={chunkIdx}>
                      {/* Chunk Header */}
                      <div className="diff-line-header" style={{ padding: '4px 14px', fontSize: '0.75rem' }}>
                        {chunk.header}
                      </div>

                      {/* Code Lines */}
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

                        return (
                          <div
                            key={lineIdx}
                            className={lineClass}
                            style={{
                              display: 'flex',
                              alignItems: 'stretch',
                              fontSize: '0.82rem',
                              lineHeight: '1.5'
                            }}
                          >
                            {/* Old Line Number */}
                            <div style={{
                              width: '40px',
                              padding: '0 8px',
                              textAlign: 'right',
                              color: 'rgba(255, 255, 255, 0.25)',
                              userSelect: 'none',
                              borderRight: '1px solid rgba(255, 255, 255, 0.05)'
                            }}>
                              {line.oldLineNumber || ''}
                            </div>
                            {/* New Line Number */}
                            <div style={{
                              width: '40px',
                              padding: '0 8px',
                              textAlign: 'right',
                              color: 'rgba(255, 255, 255, 0.25)',
                              userSelect: 'none',
                              borderRight: '1px solid rgba(255, 255, 255, 0.05)'
                            }}>
                              {line.newLineNumber || ''}
                            </div>
                            {/* Line Prefix */}
                            <div style={{ width: '20px', textAlign: 'center', userSelect: 'none', fontWeight: 600 }}>
                              {prefix}
                            </div>
                            {/* Content */}
                            <div style={{ flex: 1, paddingRight: '12px', whiteSpace: 'pre' }}>
                              {line.content}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

function getStatusIcon(status: GitDiffFile['status']) {
  switch (status) {
    case 'added':
      return <FilePlus size={14} color="#34d399" />;
    case 'deleted':
      return <FileMinus size={14} color="#f87171" />;
    default:
      return <Edit3 size={14} color="var(--accent-cyan)" />;
  }
}
