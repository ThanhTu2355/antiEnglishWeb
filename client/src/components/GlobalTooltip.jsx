import React, { useState, useEffect, useRef } from 'react';

export default function GlobalTooltip() {
  const [tooltip, setTooltip] = useState({
    visible: false,
    text: '',
    x: 0,
    y: 0,
    position: 'top', // 'top' | 'bottom'
  });

  const activeElementRef = useRef(null);

  useEffect(() => {
    function handleMouseOver(e) {
      const target = e.target.closest('[data-tooltip], [title]');
      if (!target) return;

      const rawText = target.getAttribute('data-tooltip') || target.getAttribute('title');
      if (!rawText || !rawText.trim()) return;

      const text = rawText.trim();

      // Suppress native browser title popup
      if (target.hasAttribute('title')) {
        target.setAttribute('data-original-title', text);
        target.removeAttribute('title');
      }

      activeElementRef.current = target;

      const rect = target.getBoundingClientRect();
      const placeTop = rect.top >= 48; // if enough space on top, show on top

      setTooltip({
        visible: true,
        text,
        x: rect.left + rect.width / 2,
        y: placeTop ? rect.top - 8 : rect.bottom + 8,
        position: placeTop ? 'top' : 'bottom',
      });
    }

    function handleMouseOut(e) {
      const target = activeElementRef.current;
      if (target) {
        // Restore title if needed
        if (target.hasAttribute('data-original-title')) {
          target.setAttribute('title', target.getAttribute('data-original-title'));
          target.removeAttribute('data-original-title');
        }
      }
      activeElementRef.current = null;
      setTooltip(prev => ({ ...prev, visible: false }));
    }

    function handleScrollOrClick() {
      if (activeElementRef.current) {
        handleMouseOut();
      }
    }

    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    window.addEventListener('scroll', handleScrollOrClick, true);
    window.addEventListener('click', handleScrollOrClick, true);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      window.removeEventListener('scroll', handleScrollOrClick, true);
      window.removeEventListener('click', handleScrollOrClick, true);
    };
  }, []);

  if (!tooltip.visible || !tooltip.text) return null;

  return (
    <div
      className={`fixed z-[9999] pointer-events-none transition-opacity duration-150 transform -translate-x-1/2 ${
        tooltip.position === 'top' ? '-translate-y-full' : ''
      }`}
      style={{
        left: `${Math.max(16, Math.min(window.innerWidth - 16, tooltip.x))}px`,
        top: `${tooltip.y}px`,
      }}
    >
      <div className="relative px-3 py-1.5 text-xs font-semibold text-slate-100 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md rounded-xl border border-slate-700/60 dark:border-slate-600/60 shadow-xl shadow-black/30 max-w-xs text-center leading-snug animate-fade-in select-none">
        {tooltip.text}

        {/* Small Triangle Indicator */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 dark:bg-slate-800 border-slate-700/60 dark:border-slate-600/60 rotate-45 ${
            tooltip.position === 'top'
              ? '-bottom-1 border-b border-r'
              : '-top-1 border-t border-l'
          }`}
        />
      </div>
    </div>
  );
}
