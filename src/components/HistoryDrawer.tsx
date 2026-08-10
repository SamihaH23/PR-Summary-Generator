import React, { useState } from 'react';
import { X, History, Search, Trash2, ArrowUpRight, Calendar } from 'lucide-react';
import { PRHistoryItem } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: PRHistoryItem[];
  onSelectHistory: (item: PRHistoryItem) => void;
  onClearHistory: () => void;
  onDeleteHistoryItem: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectHistory,
  onClearHistory,
  onDeleteHistoryItem
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredHistory = history.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.summary.summaryPoints.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1400,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)'
    }}>
      <div className="history-drawer">
        
        {/* Drawer Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f3f4f6' }}>
              PR Review History ({history.length})
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Search Input */}
        {history.length > 0 && (
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search past PR summaries..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'rgba(0,0,0,0.3)',
                color: '#ffffff',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
            <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        )}

        {/* History List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: '#6b7280', fontSize: '0.85rem' }}>
              <History size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <p>No saved PR reviews found</p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <h3
                    onClick={() => {
                      onSelectHistory(item);
                      onClose();
                    }}
                    style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f3f4f6', cursor: 'pointer', flex: 1 }}
                  >
                    {item.title}
                  </h3>
                  <span className={`badge badge-risk-${item.riskLevel}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                    {item.riskLevel}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>{item.totalFiles} files (+{item.additions}/-{item.deletions})</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                  <button
                    onClick={() => onDeleteHistoryItem(item.id)}
                    style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '4px' }}
                    title="Delete item"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    onClick={() => {
                      onSelectHistory(item);
                      onClose();
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    Restore <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        {history.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClearHistory} className="btn btn-secondary btn-sm" style={{ color: '#f87171' }}>
              <Trash2 size={12} /> Clear All History
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
