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
        className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-theme bg-surface hover:bg-surface-hover text-theme-main transition-all cursor-pointer shadow-xs text-xs font-semibold"
        title="Đổi tông màu giao diện"
      >
        <CurrentIcon className={`w-4 h-4 ${currentThemeObj.iconColor}`} />
        <span className="hidden xl:inline">{currentThemeObj.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-theme-subtle" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-surface border border-theme rounded-2xl shadow-xl p-1.5 z-50 animate-scale-up">
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                  isSelected 
                    ? 'bg-indigo-600/15 text-indigo-400 font-bold' 
                    : 'text-theme-muted hover:bg-surface-hover hover:text-theme-main'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${t.iconColor}`} />
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
