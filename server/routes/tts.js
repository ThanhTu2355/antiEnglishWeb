const express = require('express');
const router = express.Router();

// In-memory LRU-like audio cache for instant playback
const audioCache = new Map();
const MAX_CACHE_ITEMS = 1000;

router.get('/', async (req, res) => {
  try {
    const text = req.query.text;
    const lang = req.query.lang || 'en';

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text parameter is required' });
    }

    const cleanText = text.trim().slice(0, 200);
    const cleanLang = lang.trim().slice(0, 5) || 'en';
    const cacheKey = `${cleanLang}:${cleanText.toLowerCase()}`;

    // Return from cache if available
    if (audioCache.has(cacheKey)) {
      const cachedBuffer = audioCache.get(cacheKey);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      res.setHeader('X-TTS-Cache', 'HIT');
      return res.send(cachedBuffer);
    }

    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(cleanLang)}&client=tw-ob&q=${encodeURIComponent(cleanText)}`;

    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch audio from TTS service' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to cache
    if (audioCache.size >= MAX_CACHE_ITEMS) {
      const oldestKey = audioCache.keys().next().value;
      audioCache.delete(oldestKey);
    }
    audioCache.set(cacheKey, buffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.setHeader('X-TTS-Cache', 'MISS');
    return res.send(buffer);
  } catch (err) {
    console.error('Server TTS error:', err);
    return res.status(500).json({ error: 'Internal TTS error' });
  }
});

module.exports = router;
