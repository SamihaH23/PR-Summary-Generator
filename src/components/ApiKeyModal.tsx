import React, { useState } from 'react';
import { X, Key, Check, Zap } from 'lucide-react';
import { AISettings } from '../types';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AISettings;
  onSaveSettings: (newSettings: AISettings) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings
}) => {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [githubToken, setGithubToken] = useState(settings.githubToken || '');
  const [model, setModel] = useState(settings.model && !/gemini-(1\.|2\.0)/.test(settings.model) ? settings.model : 'gemini-2.5-flash');
  const [customPrompt, setCustomPrompt] = useState(settings.customPrompt || '');
  const [useOfflineFallback, setUseOfflineFallback] = useState(settings.useOfflineFallback);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      apiKey: apiKey.trim(),
      githubToken: githubToken.trim(),
      model,
      customPrompt: customPrompt.trim(),
      useOfflineFallback
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI settings"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(22, 18, 15, 0.45)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '24px',
        position: 'relative',
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close settings"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{
            padding: '8px',
            borderRadius: '8px',
            background: 'rgba(var(--accent-rgb), 0.15)',
            color: 'var(--accent-primary)'
          }}>
            <Key size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              AI Engine & API Configuration
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Configure your Google Gemini API Key, GitHub token, and custom prompts
            </p>
          </div>
        </div>

        {/* Gemini API Key input */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: 'var(--text-soft)' }}>
            Google Gemini API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'rgba(var(--inset-rgb), 0.3)',
              color: 'var(--text-main)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.88rem',
              outline: 'none'
            }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Saved locally in browser localStorage.
          </p>
        </div>

        {/* GitHub Personal Access Token */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: 'var(--text-soft)' }}>
            GitHub Personal Access Token (Optional)
          </label>
          <input
            type="password"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            placeholder="ghp_..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'rgba(var(--inset-rgb), 0.3)',
              color: 'var(--text-main)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.88rem',
              outline: 'none'
            }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Required for private repository PR diff fetching or avoiding rate limits.
          </p>
        </div>

        {/* Model Selector */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: 'var(--text-soft)' }}>
            Model Selection
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-main)',
              fontSize: '0.88rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deeper review)</option>
          </select>
        </div>

        {/* Custom Guidelines / Prompt */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: 'var(--text-soft)' }}>
            Custom Review Focus Guidelines (Optional)
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. Focus on TypeScript strict mode, check for SQL injection vulnerabilities, check performance..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'rgba(var(--inset-rgb), 0.3)',
              color: 'var(--text-main)',
              fontSize: '0.84rem',
              outline: 'none',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Force Offline Mode Toggle */}
        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          background: 'rgba(var(--fg-rgb), 0.03)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={16} color="var(--accent-cyan)" />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-main)' }}>Instant Offline Heuristic Mode</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Use zero-latency rule engine without API calls</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={useOfflineFallback}
            onChange={(e) => setUseOfflineFallback(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            <Check size={16} /> Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
