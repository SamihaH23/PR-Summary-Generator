import React from 'react';
import { GitPullRequest, Key, Sparkles } from 'lucide-react';
import { AISettings } from '../types';

interface HeaderProps {
  settings: AISettings;
  onOpenSettings: () => void;
  onSelectSample: (sampleId: string) => void;
  selectedSampleId?: string;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenSettings,
  onSelectSample,
  selectedSampleId
}) => {
  const hasKey = Boolean(settings.apiKey && settings.apiKey.trim());

  return (
    <header className="glass-panel" style={{ padding: '16px 24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Title Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
          }}>
            <GitPullRequest size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3f4f6', letterSpacing: '-0.02em' }}>
                PR Summary Generator
              </h1>
              <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                <Sparkles size={12} /> AI Senior Reviewer
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#9ca3af', marginTop: '2px' }}>
              Fast, high-signal automated PR summary, breaking change detection & test scenarios
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Preset Sample Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 500 }}>Sample Diffs:</span>
            <button
              onClick={() => onSelectSample('auth-service')}
              className={`btn ${selectedSampleId === 'auth-service' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              Auth Service
            </button>
            <button
              onClick={() => onSelectSample('payment-webhook')}
              className={`btn ${selectedSampleId === 'payment-webhook' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              Payment Webhook
            </button>
            <button
              onClick={() => onSelectSample('schema-migration')}
              className={`btn ${selectedSampleId === 'schema-migration' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              DB Schema
            </button>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />

          {/* AI Settings button */}
          <button
            onClick={onOpenSettings}
            className="btn btn-secondary"
            title="Configure Gemini API Settings"
            style={{ padding: '7px 14px', fontSize: '0.82rem' }}
          >
            <Key size={14} color={hasKey ? '#34d399' : '#9ca3af'} />
            <span>{hasKey ? 'Gemini Active' : 'API Key Setup'}</span>
            {hasKey && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#34d399',
                boxShadow: '0 0 6px #34d399'
              }} />
            )}
          </button>

        </div>

      </div>
    </header>
  );
};
