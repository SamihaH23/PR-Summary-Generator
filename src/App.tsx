import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ApiKeyModal } from './components/ApiKeyModal';
import { DiffInput } from './components/DiffInput';
import { DiffViewer } from './components/DiffViewer';
import { SummaryOutput } from './components/SummaryOutput';
import { HistoryDrawer } from './components/HistoryDrawer';

import { parseGitDiff } from './utils/diffParser';
import { generatePRSummary, splitDiffForAI, MAX_AI_PARTS } from './utils/aiSummarizer';
import { SAMPLE_DIFFS } from './data/sampleDiffs';
import { AISettings, ParsedDiff, PRSummary, ToastMessage, PRHistoryItem } from './types';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export const App: React.FC = () => {
  const [selectedSampleId, setSelectedSampleId] = useState<string>('auth-service');
  const [rawDiff, setRawDiff] = useState<string>(SAMPLE_DIFFS[0].rawDiff);
  const [parsedDiff, setParsedDiff] = useState<ParsedDiff>(parseGitDiff(SAMPLE_DIFFS[0].rawDiff));
  const [summary, setSummary] = useState<PRSummary | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // History state
  const [history, setHistory] = useState<PRHistoryItem[]>(() => {
    const saved = localStorage.getItem('pr_ai_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const [settings, setSettings] = useState<AISettings>(() => {
    const saved = localStorage.getItem('pr_ai_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      apiKey: '',
      githubToken: '',
      model: 'gemini-1.5-flash',
      useOfflineFallback: false
    };
  });

  // Escape closes whichever overlay is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setIsSettingsOpen(false);
      setIsHistoryOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Auto-parse raw diff on change
  useEffect(() => {
    const parsed = parseGitDiff(rawDiff);
    setParsedDiff(parsed);
  }, [rawDiff]);

  // Initial trigger for sample diff
  useEffect(() => {
    handleAnalyze(parsedDiff);
  }, []);

  const addToast = (type: 'error' | 'success' | 'info', message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleSaveSettings = (newSettings: AISettings) => {
    setSettings(newSettings);
    localStorage.setItem('pr_ai_settings', JSON.stringify(newSettings));
    addToast('success', 'AI settings saved successfully!');
  };

  const handleSelectSample = (sampleId: string) => {
    const found = SAMPLE_DIFFS.find(s => s.id === sampleId);
    if (found) {
      setSelectedSampleId(sampleId);
      setRawDiff(found.rawDiff);
      const parsed = parseGitDiff(found.rawDiff);
      setParsedDiff(parsed);
      handleAnalyze(parsed);
    }
  };

  const saveToHistory = (res: PRSummary, targetParsed: ParsedDiff) => {
    const newItem: PRHistoryItem = {
      id: `hist-${Date.now()}`,
      timestamp: Date.now(),
      title: res.title,
      riskLevel: res.riskLevel,
      totalFiles: targetParsed.totalFiles,
      additions: targetParsed.totalAdditions,
      deletions: targetParsed.totalDeletions,
      summary: res,
      rawDiff: targetParsed.rawText
    };

    setHistory(prev => {
      const updated = [newItem, ...prev.filter(h => h.rawDiff !== targetParsed.rawText)].slice(0, 20);
      localStorage.setItem('pr_ai_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory(prev => {
      const updated = prev.filter(h => h.id !== id);
      localStorage.setItem('pr_ai_history', JSON.stringify(updated));
      return updated;
    });
    addToast('info', 'History item deleted.');
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('pr_ai_history');
    addToast('info', 'History cleared.');
  };

  const handleRestoreHistory = (item: PRHistoryItem) => {
    setRawDiff(item.rawDiff);
    setSelectedSampleId('');
    setSummary(item.summary);
    addToast('success', `Restored PR review: "${item.title}"`);
  };

  const handleAnalyze = async (customParsed?: ParsedDiff) => {
    const targetParsed = customParsed || parsedDiff;
    if (!targetParsed || !targetParsed.rawText || !targetParsed.rawText.trim()) {
      addToast('error', 'Please enter or upload a valid Git diff.');
      return;
    }

    const usingLiveAI = Boolean(settings.apiKey?.trim()) && !settings.useOfflineFallback;
    const partCount = usingLiveAI ? splitDiffForAI(targetParsed).length : 1;
    if (partCount > MAX_AI_PARTS) {
      addToast('info', `Very large diff: only the first ${MAX_AI_PARTS} of ${partCount} parts are sent to the AI.`);
    } else if (partCount > 1) {
      addToast('info', `Large diff: analyzing in ${partCount} parts.`);
    }

    setIsAnalyzing(true);
    try {
      const res = await generatePRSummary(targetParsed, settings);
      setSummary(res);
      saveToHistory(res, targetParsed);
    } catch (err: any) {
      console.error('Error generating summary:', err);
      addToast('error', err.message || 'AI analysis failed. Using offline analyzer.');
      try {
        const fallbackRes = await generatePRSummary(targetParsed, { ...settings, useOfflineFallback: true });
        setSummary(fallbackRes);
        saveToHistory(fallbackRes, targetParsed);
      } catch (e) {}
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="app-container">
      
      {/* Header */}
      <Header
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectSample={handleSelectSample}
        selectedSampleId={selectedSampleId}
        historyCount={history.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      {/* Main Responsive Grid */}
      <div className="main-grid">
        
        {/* Left Column: Input & Parsed Diff Inspection */}
        <div className="left-column">
          
          <DiffInput
            rawDiff={rawDiff}
            onDiffChange={(val) => {
              setRawDiff(val);
              setSelectedSampleId('');
            }}
            onAnalyze={() => handleAnalyze()}
            isAnalyzing={isAnalyzing}
            fileStats={{
              totalFiles: parsedDiff.totalFiles,
              totalAdditions: parsedDiff.totalAdditions,
              totalDeletions: parsedDiff.totalDeletions
            }}
            githubToken={settings.githubToken}
          />

          <DiffViewer parsedDiff={parsedDiff} apiKey={settings.apiKey} />

        </div>

        {/* Right Column: AI PR Summary Output */}
        <div className="right-column">
            <SummaryOutput
              key={summary ? `${summary.title}-${summary.riskLevel}-${summary.summaryPoints.length}` : 'empty'}
              summary={summary}
              isAnalyzing={isAnalyzing}
              onUpdateSummary={(updated) => setSummary(updated)}
              totalAdditions={parsedDiff.totalAdditions}
              totalDeletions={parsedDiff.totalDeletions}
            />

        </div>

      </div>

      {/* API Key Settings Modal */}
      <ApiKeyModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      {/* Review History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectHistory={handleRestoreHistory}
        onClearHistory={handleClearHistory}
        onDeleteHistoryItem={handleDeleteHistoryItem}
      />

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="toast-container" role="status" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              {toast.type === 'error' && <AlertCircle size={18} color="var(--danger)" />}
              {toast.type === 'success' && <CheckCircle2 size={18} color="var(--success)" />}
              {toast.type === 'info' && <Info size={18} color="var(--accent-primary)" />}
              <div style={{ flex: 1 }}>{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
