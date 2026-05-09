'use client';

import { Language } from '@/lib/i18n';

interface LanguageSwitcherProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

export default function LanguageSwitcher({ currentLang, onLanguageChange }: LanguageSwitcherProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onLanguageChange('en')}
        className={`px-3 py-1 rounded ${
          currentLang === 'en' 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        English
      </button>
      <button
        onClick={() => onLanguageChange('zh')}
        className={`px-3 py-1 rounded ${
          currentLang === 'zh' 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        中文
      </button>
      <button
        onClick={() => onLanguageChange('ja')}
        className={`px-3 py-1 rounded ${
          currentLang === 'ja' 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        日本語
      </button>
    </div>
  );
}
