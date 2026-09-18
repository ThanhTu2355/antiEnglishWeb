import React, { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { playWordAudio } from '../utils/audio';

export default function TTSButton({ text, lang = 'en-US', className = '', size = 18 }) {
  const [speaking, setSpeaking] = useState(false);

  const speak = async (e) => {
    e.stopPropagation();
    if (!text || speaking) return;

    setSpeaking(true);
    try {
      await playWordAudio(text, lang);
    } finally {
      setSpeaking(false);
    }
  };

  return (
    <button
      type="button"
      onClick={speak}
      title="Nghe phát âm chuẩn"
      className={`inline-flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
        speaking
          ? 'bg-indigo-500 text-white scale-110 shadow-lg shadow-indigo-500/50 animate-pulse'
          : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-700 dark:hover:text-indigo-300'
      } ${className}`}
    >
      <Volume2 size={size} />
    </button>
  );
}
