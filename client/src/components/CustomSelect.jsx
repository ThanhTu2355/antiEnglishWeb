import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Chọn...',
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  disabled = false,
  align = 'left', // 'left' | 'right'
  size = 'md', // 'sm' | 'md' | 'lg'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedOption = options.find(opt => String(opt.value) === String(value) || String(opt.value).toLowerCase() === String(value).toLowerCase());

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs rounded-xl',
    md: 'px-3.5 py-2.5 text-sm rounded-2xl',
    lg: 'px-4 py-3 text-base rounded-2xl'
  }[size] || 'px-3.5 py-2.5 text-sm rounded-2xl';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2.5 bg-surface border transition-all cursor-pointer shadow-xs select-none font-semibold ${sizeClasses} ${
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
            : 'border-theme hover:border-indigo-500/50 hover:bg-surface-hover'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {selectedOption?.icon && (
            <span className={`shrink-0 ${selectedOption.iconColor || 'text-indigo-400'}`}>
              {React.createElement(selectedOption.icon, { className: size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4' })}
            </span>
          )}
          {selectedOption?.badge && (
            <span className={`shrink-0 text-[10px] sm:text-xs font-extrabold px-1.5 py-0.5 rounded-md border ${selectedOption.badgeClass || 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'}`}>
              {selectedOption.badge}
            </span>
          )}
          <span className="truncate text-theme-main font-bold">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {typeof selectedOption?.count === 'number' && (
            <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-tag-theme text-theme-muted font-bold border border-theme-subtle">
              {selectedOption.count}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-theme-subtle shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-1.5 z-50 min-w-full sm:min-w-[220px] max-h-64 overflow-y-auto bg-surface/95 backdrop-blur-md border border-theme rounded-2xl shadow-2xl p-1.5 animate-scale-up ${dropdownClassName}`}
        >
          <div className="space-y-0.5">
            {options.map((option) => {
              const isSelected = String(option.value) === String(value) || String(option.value).toLowerCase() === String(value).toLowerCase();
              const Icon = option.icon;

              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-left text-xs sm:text-sm transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-indigo-500/15 text-indigo-400 font-bold border border-indigo-500/20 shadow-xs'
                      : 'text-theme-main hover:bg-surface-hover hover:text-indigo-400'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    {Icon && (
                      <Icon className={`w-4 h-4 shrink-0 ${option.iconColor || (isSelected ? 'text-indigo-400' : 'text-theme-subtle')}`} />
                    )}
                    {option.badge && (
                      <span className={`shrink-0 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border ${option.badgeClass || 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'}`}>
                        {option.badge}
                      </span>
                    )}
                    <span className="truncate">{option.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {typeof option.count === 'number' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                        isSelected 
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                          : 'bg-tag-theme text-theme-muted border-theme-subtle'
                      }`}>
                        {option.count}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
