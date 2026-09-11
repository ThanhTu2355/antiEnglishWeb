import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function TTSButton({ text, lang = 'en-US', className = '', size = 18 }) {
  const [speaking, setSpeaking] = useState(false);

  const speak = (e) => {
    e.stopPropagation();
    if (!('speechSynthesis' in window)) {
      console.warn('Trình duyệt không hỗ trợ Web Speech API');
      return;
    }

    window.speechSynthesis.cancel(); // Stop ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9; // Slightly slower for clear English pronunciation

    // Prefer high quality English voices if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
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
