import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface RxDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  className?: string;
}

const RxDropdown: React.FC<RxDropdownProps> = ({ value, onChange, options, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const openDropdown = () => {
    const idx = options.indexOf(value);
    setHighlightedIdx(idx >= 0 ? idx : 0);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 110) });
    }
    setIsOpen(true);
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setDropdownPos(null);
  };

  const selectOption = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setDropdownPos(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    const close = () => closeDropdown();
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [isOpen]);

  const handleFocus = () => openDropdown();
  const handleBlur = () => setTimeout(() => closeDropdown(), 120);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        openDropdown();
      } else {
        setHighlightedIdx(i => (i + 1) % options.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        openDropdown();
      } else {
        setHighlightedIdx(i => (i - 1 + options.length) % options.length);
      }
    } else if (e.key === 'Enter') {
      if (isOpen) {
        selectOption(options[highlightedIdx]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown();
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      data-ef=""
      className={`relative outline-none cursor-pointer ${className}`}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between gap-1 py-1.5 px-0.5 text-xs font-medium text-slate-800 select-none">
        <span className="truncate">{value}</span>
        <svg
          className={`w-2.5 h-2.5 flex-shrink-0 text-slate-400 transition-transform duration-100 ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && dropdownPos && createPortal(
        <div
          className="bg-white border-2 border-indigo-200 rounded-lg shadow-xl overflow-hidden"
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, minWidth: dropdownPos.width, zIndex: 9999 }}
        >
          {options.map((opt, i) => (
            <div
              key={opt}
              className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                i === highlightedIdx
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'text-slate-700 hover:bg-indigo-50'
              }`}
              onMouseDown={() => selectOption(opt)}
              onMouseEnter={() => setHighlightedIdx(i)}
            >
              {opt}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

export default RxDropdown;
