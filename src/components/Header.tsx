import React from 'react';
import { GitPullRequest, Key, Sparkles, History } from 'lucide-react';
import { AISettings } from '../types';

interface HeaderProps {
  settings: AISettings;
  onOpenSettings: () => void;
  onSelectSample: (sampleId: string) => void;
  selectedSampleId?: string;
  historyCount: number;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenSettings,
  onSelectSample,
  selectedSampleId,
  historyCount,
  onOpenHistory
}) => {
  const hasKey = Boolean(settings.apiKey && settings.apiKey.trim());

  return (
    <header className="glass-panel app-header header-bar" style={{ padding: '18px 24px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* Top Row: Brand (Left) & Controls (Right) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Brand Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(var(--accent-rgb), 0.4)',
            flexShrink: 0
          }}>
            <GitPullRequest size={22} color="var(--on-accent)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                PR Summary Generator
              </h1>
              <span className="badge" style={{ background: 'rgba(var(--accent-rgb), 0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(var(--accent-rgb), 0.3)' }}>
                <Sparkles size={12} /> AI Senior Reviewer
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Fast, high-signal automated PR summary, breaking change detection & test scenarios
            </p>
          </div>
        </div>

        {/* Primary Controls (Right Aligned) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>

          {/* History Drawer Toggle */}
          <button
            onClick={onOpenHistory}
            className="btn btn-secondary btn-sm"
            title="View Review History"
          >
            <History size={14} />
            <span>History</span>
            {historyCount > 0 && (
              <span className="badge" style={{ padding: '2px 6px', fontSize: '0.68rem', background: 'var(--accent-primary)', color: 'var(--text-main)' }}>
                {historyCount}
              </span>
            )}
          </button>

          {/* AI Settings Button */}
          <button
            onClick={onOpenSettings}
            className="btn btn-secondary btn-sm"
            title="Configure AI & API Settings"
            style={{ whiteSpace: 'nowrap' }}
          >
            <Key size={14} color={hasKey ? 'var(--success)' : 'var(--text-muted)'} />
            <span>{hasKey ? 'Gemini Active' : 'API Key Setup'}</span>
            {hasKey && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--success)',
                boxShadow: '0 0 6px var(--success)'
              }} />
            )}
          </button>

        </div>

      </div>

      {/* Bottom Sub-Bar: Sample Preset Diffs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        paddingTop: '12px',
        borderTop: '1px solid var(--border-color)',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Preset Samples:
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onSelectSample('auth-service')}
            className={`btn btn-sm ${selectedSampleId === 'auth-service' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ whiteSpace: 'nowrap' }}
          >
            Auth Service Refactor
          </button>
          <button
            onClick={() => onSelectSample('payment-webhook')}
            className={`btn btn-sm ${selectedSampleId === 'payment-webhook' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ whiteSpace: 'nowrap' }}
          >
            Payment Webhook
          </button>
          <button
            onClick={() => onSelectSample('schema-migration')}
            className={`btn btn-sm ${selectedSampleId === 'schema-migration' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ whiteSpace: 'nowrap' }}
          >
            DB Schema Migration
          </button>
        </div>
      </div>

    </header>
  );
};
