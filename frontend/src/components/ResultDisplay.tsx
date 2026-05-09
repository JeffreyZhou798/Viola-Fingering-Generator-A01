'use client';

interface ResultDisplayProps {
  onDownload: () => void;
  noteCount: number;
  downloadText: string;
  notesText: string;
  successText: string;
}

export default function ResultDisplay({ onDownload, noteCount, downloadText, notesText, successText }: ResultDisplayProps) {
  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="text-6xl">✅</div>
        <h2 className="text-2xl font-bold text-green-600">{successText}</h2>
        <p className="text-gray-600">
          {noteCount} {notesText}
        </p>
        <button
          onClick={onDownload}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
        >
          📥 {downloadText}
        </button>
      </div>
    </div>
  );
}
