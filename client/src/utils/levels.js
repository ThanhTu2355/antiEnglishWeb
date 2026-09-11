export const CEFR_LEVELS = [
  { id: 'A1', name: 'A1', label: 'A1 - Cơ bản (Beginner)', badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  { id: 'A2', name: 'A2', label: 'A2 - Sơ cấp (Elementary)', badgeClass: 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30' },
  { id: 'B1', name: 'B1', label: 'B1 - Trung cấp (Intermediate)', badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30' },
  { id: 'B2', name: 'B2', label: 'B2 - Trung cao (Upper-Intermediate)', badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30' },
  { id: 'C1', name: 'C1', label: 'C1 - Nâng cao (Advanced)', badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30' },
  { id: 'C2', name: 'C2', label: 'C2 - Thành thạo (Proficiency)', badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  { id: 'Other', name: 'Other', label: 'Other - Khác / Chuyên ngành', badgeClass: 'bg-slate-200/90 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-400/80 dark:border-slate-600 font-black' },
];

export function getLevelBadge(level) {
  const norm = (level || '').trim().toUpperCase();
  const found = CEFR_LEVELS.find(l => l.id.toUpperCase() === norm);
  return found || {
    id: norm === 'OTHER' ? 'Other' : (norm || 'B1'),
    name: norm === 'OTHER' ? 'Other' : (norm || 'B1'),
    label: norm === 'OTHER' ? 'Other - Khác / Chuyên ngành' : `${norm || 'B1'} - Trung cấp`,
    badgeClass: norm === 'OTHER' 
      ? 'bg-slate-200/90 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-400/80 dark:border-slate-600 font-black' 
      : 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30'
  };
}
