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
  const [model, setModel] = useState(settings.model || 'gemini-1.5-flash');
  const [useOfflineFallback, setUseOfflineFallback] = useState(settings.useOfflineFallback);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      apiKey: apiKey.trim(),
      model,
      useOfflineFallback
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '520px',
        padding: '24px',
        position: 'relative',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
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
            background: 'rgba(99, 102, 241, 0.15)',
            color: 'var(--accent-primary)'
          }}>
            <Key size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f3f4f6' }}>
              AI Engine Configuration
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
              Configure your Google Gemini API Key or use the offline analyzer
            </p>
          </div>
        </div>

        {/* Gemini API Key input */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: '#d1d5db' }}>
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
              background: 'rgba(0, 0, 0, 0.3)',
              color: '#ffffff',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.88rem',
              outline: 'none'
            }}
          />
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '6px' }}>
            Your key is saved locally in your browser storage and never sent anywhere else.
          </p>
        </div>

        {/* Model Selector */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px', color: '#d1d5db' }}>
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
              color: '#ffffff',
              fontSize: '0.88rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast & High Signal)</option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Latest)</option>
          </select>
        </div>

        {/* Force Offline Mode Toggle */}
        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={16} color="var(--accent-cyan)" />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#f3f4f6' }}>Instant Heuristic Mode</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Use zero-latency rule engine without API calls</div>
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
