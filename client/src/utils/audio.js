// Singleton audio instance to prevent overlapping audio plays
let currentAudio = null;

export function playWordAudio(text, lang = 'en') {
  return new Promise((resolve) => {
    if (!text || !text.trim()) {
      return resolve(false);
    }

    const cleanText = text.trim();
    const cleanLang = (lang || 'en').slice(0, 2);

    // Stop any ongoing audio immediately
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (e) {}
      currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    // 1. Primary: HTML5 Audio via /api/tts proxy (works 100% on iOS Safari & Android)
    const audioUrl = `/api/tts?text=${encodeURIComponent(cleanText)}&lang=${encodeURIComponent(cleanLang)}`;
    const audio = new Audio(audioUrl);
    currentAudio = audio;

    let isFinished = false;
    const finish = (result) => {
      if (!isFinished) {
        isFinished = true;
        if (currentAudio === audio) {
          currentAudio = null;
        }
        resolve(result);
      }
    };

    audio.onended = () => finish(true);
    audio.onerror = () => {
      // Fallback to Web Speech API if network or server error
      playViaWebSpeech(cleanText, cleanLang).then(finish);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Audio play error, falling back to Web Speech API:', err);
        playViaWebSpeech(cleanText, cleanLang).then(finish);
      });
    }
  });
}

function playViaWebSpeech(text, lang = 'en') {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return resolve(false);
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'en' ? 'en-US' : lang;
      utterance.rate = 0.9;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const preferredVoice = voices.find(v => 
          v.lang && v.lang.startsWith(lang) && 
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Siri'))
        ) || voices.find(v => v.lang && v.lang.startsWith(lang));
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis exception:', e);
      resolve(false);
    }
  });
}
