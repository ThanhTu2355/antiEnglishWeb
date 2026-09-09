export const CEFR_LEVELS = [
  { id: 'A1', name: 'A1', label: 'A1 - Cơ bản (Beginner)', badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { id: 'A2', name: 'A2', label: 'A2 - Sơ cấp (Elementary)', badgeClass: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  { id: 'B1', name: 'B1', label: 'B1 - Trung cấp (Intermediate)', badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  { id: 'B2', name: 'B2', label: 'B2 - Trung cao (Upper-Intermediate)', badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
  { id: 'C1', name: 'C1', label: 'C1 - Nâng cao (Advanced)', badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  { id: 'C2', name: 'C2', label: 'C2 - Thành thạo (Proficiency)', badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
];

export function getLevelBadge(level) {
  const norm = (level || '').trim().toUpperCase();
  const found = CEFR_LEVELS.find(l => l.id === norm);
  return found || {
    id: norm || 'B1',
    name: norm || 'B1',
    label: `${norm || 'B1'} - Trung cấp`,
    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30'
  };
}
