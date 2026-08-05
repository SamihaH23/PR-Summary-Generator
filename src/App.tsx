import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ApiKeyModal } from './components/ApiKeyModal';
import { DiffInput } from './components/DiffInput';
import { DiffViewer } from './components/DiffViewer';
import { SummaryOutput } from './components/SummaryOutput';

import { parseGitDiff } from './utils/diffParser';
import { generatePRSummary } from './utils/aiSummarizer';
import { SAMPLE_DIFFS } from './data/sampleDiffs';
import { AISettings, ParsedDiff, PRSummary } from './types';
import { Sparkles, Code } from 'lucide-react';

export const App: React.FC = () => {
  const [selectedSampleId, setSelectedSampleId] = useState<string>('auth-service');
  const [rawDiff, setRawDiff] = useState<string>(SAMPLE_DIFFS[0].rawDiff);
  const [parsedDiff, setParsedDiff] = useState<ParsedDiff>(parseGitDiff(SAMPLE_DIFFS[0].rawDiff));
  const [summary, setSummary] = useState<PRSummary | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [viewTab, setViewTab] = useState<'summary' | 'diff'>('summary');

  const [settings, setSettings] = useState<AISettings>(() => {
    const saved = localStorage.getItem('pr_ai_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      apiKey: '',
      model: 'gemini-1.5-flash',
      useOfflineFallback: false
    };
  });

  // Auto-parse raw diff on change
  useEffect(() => {
    const parsed = parseGitDiff(rawDiff);
    setParsedDiff(parsed);
  }, [rawDiff]);

  // Initial trigger for sample diff
  useEffect(() => {
    handleAnalyze(parsedDiff);
  }, []);

  const handleSaveSettings = (newSettings: AISettings) => {
    setSettings(newSettings);
    localStorage.setItem('pr_ai_settings', JSON.stringify(newSettings));
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

  const handleAnalyze = async (customParsed?: ParsedDiff) => {
    const targetParsed = customParsed || parsedDiff;
    if (!targetParsed || !targetParsed.rawText || !targetParsed.rawText.trim()) return;

    setIsAnalyzing(true);
    try {
      const res = await generatePRSummary(targetParsed, settings);
      setSummary(res);
      setViewTab('summary');
    } catch (err) {
      console.error('Error generating summary:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px' }}>
      
      {/* Header */}
      <Header
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectSample={handleSelectSample}
        selectedSampleId={selectedSampleId}
      />

      {/* Grid Layout: Left (Input & Diff) | Right (Summary Output) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        
        {/* Left Column: Input & Parsed Diff Inspection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
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
          />

          <DiffViewer parsedDiff={parsedDiff} />

        </div>

        {/* Right Column: AI PR Summary Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Navigation View Switcher */}
          <div className="glass-panel" style={{ padding: '6px', display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setViewTab('summary')}
              className={`btn ${viewTab === 'summary' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, justifyContent: 'center', padding: '8px 14px', fontSize: '0.85rem' }}
            >
              <Sparkles size={16} /> AI Summary & Risk
            </button>
            <button
              onClick={() => setViewTab('diff')}
              className={`btn ${viewTab === 'diff' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, justifyContent: 'center', padding: '8px 14px', fontSize: '0.85rem' }}
            >
              <Code size={16} /> Full Diff View
            </button>
          </div>

          {viewTab === 'summary' ? (
            <SummaryOutput summary={summary} isAnalyzing={isAnalyzing} />
          ) : (
            <DiffViewer parsedDiff={parsedDiff} />
          )}

        </div>

      </div>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

    </div>
  );
};
