'use client';

import { useState } from 'react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import FileUploader from '@/components/FileUploader';
import ProcessingStatus from '@/components/ProcessingStatus';
import ResultDisplay from '@/components/ResultDisplay';
import { Language, getTranslation } from '@/lib/i18n';
import { parseMusicXML } from '@/lib/music/parser';
import { writeMusicXML } from '@/lib/music/writer';
import { ParallelDynaQTrainer } from '@/lib/algorithm/parallelTrainer';
import { IndexedDBCache } from '@/lib/cache/indexedDB';
import { Note, Action, WorkerProgress } from '@/lib/algorithm/types';

type ProcessingState = 'idle' | 'parsing' | 'training' | 'generating' | 'complete' | 'error';

export default function Home() {
  const [language, setLanguage] = useState<Language>('en');
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [progress, setProgress] = useState<{ episode: number; reward: number } | undefined>();
  const [workerProgresses, setWorkerProgresses] = useState<WorkerProgress[]>([]);
  const [workerCount, setWorkerCount] = useState<number>(1);
  const [error, setError] = useState<string>('');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [noteCount, setNoteCount] = useState<number>(0);

  const t = getTranslation(language);

  const handleFileSelect = async (file: File) => {
    console.log('='.repeat(80));
    console.log(`🎻 Starting processing for: ${file.name}`);
    console.log('='.repeat(80));
    
    setCurrentFile(file);
    setProcessingState('parsing');
    setError('');
    setProgress(undefined);
    setWorkerProgresses([]);

    try {
      // Initialize cache
      const cache = new IndexedDBCache();
      await cache.init();

      // Calculate file hash
      const hash = await cache.calculateHash(file);
      console.log(`🔑 File hash: ${hash.substring(0, 16)}...`);

      // Check cache
      const cached = await cache.loadResult(hash);
      if (cached) {
        console.log('✅ Using cached result (<1s)');
        setProcessingState('generating');
        
        // Parse original file to get notes for writing
        const notes = await parseMusicXML(file);
        setNoteCount(notes.length);
        
        // Write result
        const blob = await writeMusicXML(file, cached.fingering);
        setResultBlob(blob);
        setProcessingState('complete');
        return;
      }

      // Parse MusicXML
      console.log('📄 Parsing MusicXML...');
      const notes = await parseMusicXML(file);
      setNoteCount(notes.length);

      if (notes.length === 0) {
        throw new Error(t.errorNoNotes);
      }

      console.log(`✅ Parsed ${notes.length} notes`);

      // Train model with parallel workers
      setProcessingState('training');
      console.log('🚀 Starting parallel Dyna-Q training...');
      
      const trainer = new ParallelDynaQTrainer();
      setWorkerCount(trainer.getWorkerCount());
      
      const fingering = await trainer.train(notes, (workerProgress) => {
        // Update worker progress
        setWorkerProgresses(prev => {
          const newProgresses = [...prev];
          const index = newProgresses.findIndex(p => p.workerId === workerProgress.workerId);
          if (index >= 0) {
            newProgresses[index] = workerProgress;
          } else {
            newProgresses.push(workerProgress);
          }
          return newProgresses;
        });
        
        // Also update single progress for backward compatibility
        setProgress({ 
          episode: workerProgress.episode, 
          reward: workerProgress.reward 
        });
      });

      if (fingering.length !== notes.length) {
        console.error(`⚠️ Fingering length mismatch: ${fingering.length} vs ${notes.length}`);
        throw new Error(`Fingering generation incomplete: ${fingering.length}/${notes.length} notes`);
      }

      console.log(`✅ Generated fingering for all ${fingering.length} notes`);

      // Cache result
      await cache.saveResult(hash, fingering, undefined);

      // Write MusicXML
      setProcessingState('generating');
      console.log('📝 Writing result to MusicXML...');
      const blob = await writeMusicXML(file, fingering);
      setResultBlob(blob);
      setProcessingState('complete');

      console.log('='.repeat(80));
      console.log('✅ Processing complete!');
      console.log('='.repeat(80));

    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message || t.error);
      setProcessingState('error');
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !currentFile) return;

    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url;
    
    // Preserve original extension
    const originalExt = currentFile.name.endsWith('.mxl') ? '.mxl' : '.musicxml';
    a.download = currentFile.name.replace(/\.(musicxml|mxl)$/, `_fingered${originalExt}`);
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`📥 Downloaded: ${a.download}`);
  };

  const handleClearCache = async () => {
    try {
      const cache = new IndexedDBCache();
      await cache.init();
      await cache.clearCache();
      alert(t.cacheCleared);
      window.location.reload();
    } catch (err) {
      console.error('Error clearing cache:', err);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">{t.title}</h1>
            <p className="text-gray-600">{t.subtitle}</p>
          </div>
          <LanguageSwitcher currentLang={language} onLanguageChange={setLanguage} />
        </div>

        {/* Main Content */}
        <div className="flex flex-col items-center gap-8">
          {processingState === 'idle' && (
            <>
              <FileUploader
                onFileSelect={handleFileSelect}
                buttonText={t.uploadButton}
                hintText={t.uploadHint}
              />
              
              {/* Features */}
              <div className="w-full bg-white rounded-lg shadow-lg p-6 mt-8">
                <h2 className="text-2xl font-bold mb-4">{t.features.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-blue-600">✨ {t.features.dynaQ}</h3>
                    <p className="text-sm text-gray-600">{t.features.dynaQDesc}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-600">🎯 {t.features.zeroShot}</h3>
                    <p className="text-sm text-gray-600">{t.features.zeroShotDesc}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-600">💻 {t.features.browser}</h3>
                    <p className="text-sm text-gray-600">{t.features.browserDesc}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-600">💾 {t.features.cache}</h3>
                    <p className="text-sm text-gray-600">{t.features.cacheDesc}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-600">🌐 {t.features.multilingual}</h3>
                    <p className="text-sm text-gray-600">{t.features.multilingualDesc}</p>
                  </div>
                </div>
              </div>

              {/* About */}
              <div className="w-full bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-4">{t.about.title}</h2>
                <p className="text-gray-700 mb-4">{t.about.description}</p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>{t.about.algorithm}</li>
                  <li>{t.about.training}</li>
                  <li>{t.about.quality}</li>
                </ul>
              </div>
            </>
          )}

          {(processingState === 'parsing' || processingState === 'training' || processingState === 'generating') && (
            <ProcessingStatus
              status={
                processingState === 'parsing' ? t.processing :
                processingState === 'training' ? t.training :
                t.generating
              }
              progress={progress}
              workerProgresses={workerProgresses}
              workerCount={workerCount}
              t={t}
              phase={processingState}
            />
          )}

          {processingState === 'complete' && (
            <ResultDisplay
              onDownload={handleDownload}
              noteCount={noteCount}
              downloadText={t.download}
              notesText={t.notes}
              successText={t.success}
            />
          )}

          {processingState === 'error' && (
            <div className="w-full max-w-md bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-red-600 mb-2">{t.error}</h2>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Debug Button */}
          <button
            onClick={handleClearCache}
            className="mt-8 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm"
          >
            {t.clearCache}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-gray-500">
          <p>Powered by Dyna-Q Reinforcement Learning</p>
          <p className="mt-1">© 2026 Viola Fingering Generator</p>
        </div>
      </div>
    </main>
  );
}
