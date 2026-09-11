import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Sparkles, Check, ChevronDown } from 'lucide-react';
import { useTheme } from '../context/useTheme';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themes = [
    {
      id: 'neutral',
      label: 'Trung tính',
      desc: 'Giữa trắng & đen, dịu mắt',
      icon: Sparkles,
      iconColor: 'text-indigo-400',
    },
    {
      id: 'light',
      label: 'Sáng',
      desc: 'Tươi sáng, rõ nét',
      icon: Sun,
      iconColor: 'text-amber-500',
    },
    {
      id: 'dark',
      label: 'Tối',
      desc: 'Nền đen sâu ban đêm',
      icon: Moon,
      iconColor: 'text-purple-400',
    },
  ];

  const currentThemeObj = themes.find(t => t.id === theme) || themes[0];
  const CurrentIcon = currentThemeObj.icon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition-all duration-150 cursor-pointer shadow-xs text-xs font-semibold ${
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-surface shadow-md'
            : 'border-theme hover:border-indigo-500 dark:hover:border-indigo-400 hover:ring-2 hover:ring-indigo-500/20 hover:bg-surface-hover hover:shadow-sm text-theme-main'
        }`}
        title="Đổi tông màu giao diện"
      >
        <CurrentIcon className={`w-4 h-4 ${currentThemeObj.iconColor} group-hover:scale-110 transition-transform`} />
        <span className="hidden xl:inline group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{currentThemeObj.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-theme-subtle transition-all duration-200 ${isOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-y-0.5'}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-56 bg-surface border border-theme rounded-2xl shadow-2xl p-1.5 z-50 animate-scale-up"
          style={{ backgroundColor: 'var(--color-bg-surface)' }}
        >
          <div className="px-3 py-2 text-[11px] font-bold text-theme-subtle uppercase tracking-wider border-b border-theme mb-1">
            Tông màu giao diện
          </div>
          {themes.map((t) => {
            const Icon = t.icon;
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setIsOpen(false);
                }}
                className={`group/item w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                  isSelected 
                    ? 'bg-indigo-600/15 text-indigo-400 font-bold hover:bg-indigo-600/25' 
                    : 'text-theme-muted hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-300 hover:translate-x-1'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${t.iconColor} group-hover/item:scale-110 transition-transform`} />
                  <div>
                    <div className="text-xs font-semibold">{t.label}</div>
                    <div className="text-[10px] text-theme-subtle font-normal">{t.desc}</div>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
