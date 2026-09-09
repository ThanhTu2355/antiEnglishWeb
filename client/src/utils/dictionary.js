import { api } from '../api/client';

const PREPOSITIONS = new Set([
  'about', 'above', 'across', 'after', 'against', 'along', 'amid', 'among', 'around', 'at',
  'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond', 'by',
  'concerning', 'despite', 'down', 'during', 'except', 'for', 'from', 'in',
  'inside', 'into', 'like', 'near', 'of', 'off', 'on', 'onto', 'opposite',
  'out', 'outside', 'over', 'past', 'regarding', 'round', 'since', 'through',
  'throughout', 'till', 'to', 'toward', 'towards', 'under', 'underneath',
  'until', 'unto', 'up', 'upon', 'with', 'within', 'without', 'via', 'per'
]);

const CEFR_OVERRIDES = {
  // A1
  'hello': 'A1', 'goodbye': 'A1', 'yes': 'A1', 'no': 'A1', 'thank': 'A1', 'please': 'A1',
  'book': 'A1', 'school': 'A1', 'student': 'A1', 'teacher': 'A1', 'family': 'A1', 'friend': 'A1',
  'house': 'A1', 'home': 'A1', 'car': 'A1', 'water': 'A1', 'food': 'A1', 'day': 'A1', 'night': 'A1',
  'time': 'A1', 'man': 'A1', 'woman': 'A1', 'child': 'A1', 'eat': 'A1', 'drink': 'A1', 'go': 'A1',
  // A2
  'travel': 'A2', 'weather': 'A2', 'music': 'A2', 'movie': 'A2', 'hobby': 'A2', 'shopping': 'A2',
  'holiday': 'A2', 'invitation': 'A2', 'decision': 'A2', 'message': 'A2', 'kitchen': 'A2', 'airport': 'A2',
  // B1
  'essential': 'B1', 'culture': 'B1', 'situation': 'B1', 'community': 'B1', 'curiosity': 'B1',
  'environment': 'B1', 'opportunity': 'B1', 'traditional': 'B1', 'experience': 'B1', 'benefit': 'B1',
  // B2
  'comprehend': 'B2', 'lucid': 'B2', 'perspective': 'B2', 'phenomenon': 'B2', 'priority': 'B2',
  'sustainable': 'B2', 'transform': 'B2', 'consequence': 'B2', 'dimension': 'B2', 'evaluate': 'B2',
  // C1
  'alleviate': 'C1', 'meticulous': 'C1', 'resilience': 'C1', 'feasible': 'C1', 'scrutinize': 'C1',
  'volatile': 'C1', 'ambiguous': 'C1', 'coherent': 'C1', 'profound': 'C1', 'mitigate': 'C1',
  // C2
  'ubiquitous': 'C2', 'obfuscate': 'C2', 'ephemeral': 'C2', 'serendipity': 'C2', 'quintessential': 'C2',
  'cacophony': 'C2', 'pernicious': 'C2', 'surreptitious': 'C2', 'superfluous': 'C2'
};

const cache = new Map();

function estimateCEFR(freq) {
  if (freq >= 120) return 'A1';
  if (freq >= 40) return 'A2';
  if (freq >= 12) return 'B1';
  if (freq >= 3.5) return 'B2';
  if (freq >= 0.8) return 'C1';
  return 'C2';
}

function formatIPA(raw) {
  if (!raw) return '';
  let ipa = raw.trim().replace(/ɫ/g, 'l');
  if (ipa.startsWith('/')) ipa = ipa.slice(1);
  if (ipa.endsWith('/')) ipa = ipa.slice(0, -1);
  return `/${ipa}/`;
}

export async function lookupEnglishWord(rawWord) {
  if (!rawWord || typeof rawWord !== 'string') return null;
  const word = rawWord.trim().toLowerCase();
  if (word.length < 2) return null;

  if (cache.has(word)) {
    return cache.get(word);
  }

  // 1. Try server endpoint first
  try {
    const data = await api.cards.lookup(word);
    if (data && (data.phonetic || data.level)) {
      const result = {
        word: data.word || word,
        phonetic: data.phonetic || '',
        level: CEFR_OVERRIDES[word] || data.level || 'B1',
        partOfSpeech: PREPOSITIONS.has(word) ? 'preposition' : (data.part_of_speech || 'noun'),
        definition: data.definition || ''
      };
      cache.set(word, result);
      return result;
    }
  } catch {
    // Fall back to direct Datamuse
  }

  // 2. Direct fallback to Datamuse API
  try {
    const res = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&max=1&md=dfrp&ipa=1`);
    const list = await res.json().catch(() => []);
    if (Array.isArray(list) && list.length > 0) {
      const item = list[0];
      const tags = item.tags || [];

      let rawIPA = '';
      let freq = 0;
      let pos = 'noun';

      for (const tag of tags) {
        if (tag.startsWith('ipa_pron:')) {
          rawIPA = tag.replace('ipa_pron:', '');
        } else if (tag.startsWith('f:')) {
          freq = parseFloat(tag.replace('f:', '')) || 0;
        }
      }

      if (PREPOSITIONS.has(word)) {
        pos = 'preposition';
      } else if (word.includes(' ')) {
        pos = 'phrase';
      } else if (item.defs && item.defs.length > 0) {
        const firstDef = item.defs[0];
        if (firstDef.startsWith('adj')) pos = 'adjective';
        else if (firstDef.startsWith('v')) pos = 'verb';
        else if (firstDef.startsWith('adv')) pos = 'adverb';
        else if (firstDef.startsWith('n')) pos = 'noun';
      } else {
        if (tags.includes('adj')) pos = 'adjective';
        else if (tags.includes('v')) pos = 'verb';
        else if (tags.includes('adv')) pos = 'adverb';
        else if (tags.includes('n')) pos = 'noun';
      }

      const result = {
        word: item.word || word,
        phonetic: formatIPA(rawIPA),
        level: CEFR_OVERRIDES[word] || estimateCEFR(freq),
        partOfSpeech: pos,
        definition: item.defs?.[0]?.split('\t')[1] || ''
      };

      cache.set(word, result);
      return result;
    }
  } catch {
    // Ignore
  }

  const fallback = {
    word,
    phonetic: '',
    level: CEFR_OVERRIDES[word] || 'B1',
    partOfSpeech: PREPOSITIONS.has(word) ? 'preposition' : (word.includes(' ') ? 'phrase' : 'noun'),
    definition: ''
  };
  cache.set(word, fallback);
  return fallback;
}
