'use client';

import { WorkerProgress } from '@/lib/algorithm/types';

interface ProcessingStatusProps {
  status: string;
  progress?: {
    episode: number;
    reward: number;
  };
  workerProgresses?: WorkerProgress[];
  workerCount?: number;
  t: any;
  phase?: 'parsing' | 'training' | 'generating';
}

export default function ProcessingStatus({ 
  status, 
  progress, 
  workerProgresses,
  workerCount = 1,
  t,
  phase = 'training'
}: ProcessingStatusProps) {
  // Calculate total progress from all workers
  // Phase-based progress: parsing=0-5%, training=5-95%, generating=95-100%
  let phaseProgress = 0;
  if (phase === 'parsing') {
    phaseProgress = 0.02; // 2% during parsing
  } else if (phase === 'generating') {
    phaseProgress = 0.98; // 98% during generating
  } else if (workerProgresses && workerProgresses.length > 0) {
    // Training phase: 5-95% range
    const trainProgress = workerProgresses.reduce((sum, p) => sum + p.progress, 0) / workerProgresses.length;
    phaseProgress = 0.05 + trainProgress * 0.90; // Map 0-1 to 5-95%
  } else if (progress) {
    const trainProgress = Math.min(progress.episode / 10000, 1);
    phaseProgress = 0.05 + trainProgress * 0.90;
  } else {
    phaseProgress = 0.05; // Default to 5% when training just started
  }

  const displayPercent = Math.min(phaseProgress * 100, 100);

  return (
    <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-lg font-semibold">{status}</p>
        
        {/* Overall Progress Bar - ALWAYS visible */}
        <div className="w-full">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span className="font-semibold">
              {phase === 'parsing' ? t.parsing :
               phase === 'generating' ? t.generating :
               workerCount > 1 ? `${workerCount} ${t.workers}` : t.trainingLabel}
            </span>
            <span className="font-semibold">
              {displayPercent.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-4 overflow-hidden border border-gray-400">
            <div
              className="bg-blue-500 h-4 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${displayPercent}%`, minWidth: phase === 'parsing' ? '2%' : '0%' }}
            ></div>
          </div>
        </div>

        {/* Individual Worker Progress */}
        {workerProgresses && workerProgresses.length > 1 && phase === 'training' && (
          <div className="w-full space-y-3 mt-4">
            <div className="text-sm font-semibold text-gray-700 border-b pb-2">
              {t.workerDetails}:
            </div>
            {workerProgresses.map((wp) => (
              <div key={wp.workerId} className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{t.worker} {wp.workerId + 1}</span>
                  <span>{(wp.progress * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${wp.progress * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">
                  {t.episode} {wp.episode}, {t.reward}: {wp.reward.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Single Worker Progress Detail */}
        {phase === 'training' && progress && (!workerProgresses || workerProgresses.length <= 1) && (
          <div className="w-full text-center text-sm text-gray-600">
            <div>{t.episode}: {progress.episode}</div>
            <div>{t.reward}: {progress.reward.toFixed(2)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
