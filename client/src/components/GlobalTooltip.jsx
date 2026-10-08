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
    function convertTitle(el) {
      if (el && el.hasAttribute && el.hasAttribute('title')) {
        const val = el.getAttribute('title');
        if (val && val.trim()) {
          el.setAttribute('data-tooltip', val.trim());
        }
        el.removeAttribute('title');
      }
    }

    // Convert any existing title attributes to data-tooltip on mount
    document.querySelectorAll('[title]').forEach(convertTitle);

    // Watch for dynamically added or re-rendered title attributes to prevent browser native tooltips
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'title') {
          convertTitle(m.target);
        } else if (m.type === 'childList') {
          m.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
              convertTitle(node);
              node.querySelectorAll?.('[title]')?.forEach(convertTitle);
            }
          });
        }
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['title'],
      childList: true,
      subtree: true,
    });

    function showTooltipFor(target) {
      if (!target) return;
      convertTitle(target);

      const rawText = target.getAttribute('data-tooltip');
      if (!rawText || !rawText.trim()) return;

      const text = rawText.trim();
      activeElementRef.current = target;

      const rect = target.getBoundingClientRect();
      const placeTop = rect.top >= 48;

      setTooltip({
        visible: true,
        text,
        x: rect.left + rect.width / 2,
        y: placeTop ? rect.top - 8 : rect.bottom + 8,
        position: placeTop ? 'top' : 'bottom',
      });
    }

    function handleMouseOver(e) {
      const target = e.target.closest?.('[data-tooltip], [title]');
      if (!target) return;
      showTooltipFor(target);
    }

    function handleMouseOut(e) {
      const current = activeElementRef.current;
      if (!current) return;

      // If cursor is still within the current target or its children, don't dismiss
      if (e && e.relatedTarget && current.contains(e.relatedTarget)) {
        return;
      }

      activeElementRef.current = null;
      setTooltip(prev => ({ ...prev, visible: false }));
    }

    function handleClick(e) {
      // If clicking inside the active element (e.g. clicking the TTS button while hovering),
      // keep the beautiful tooltip visible and adjust anchor position if needed
      if (activeElementRef.current && activeElementRef.current.contains(e.target)) {
        showTooltipFor(activeElementRef.current);
        return;
      }
      // If clicking elsewhere, hide tooltip
      activeElementRef.current = null;
      setTooltip(prev => ({ ...prev, visible: false }));
    }

    function handleScroll() {
      activeElementRef.current = null;
      setTooltip(prev => ({ ...prev, visible: false }));
    }

    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    window.addEventListener('click', handleClick, true);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('scroll', handleScroll, true);
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
