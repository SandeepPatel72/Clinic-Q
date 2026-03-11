import React, { useState, useRef } from 'react';

interface RxDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  className?: string;
}

const RxDropdown: React.FC<RxDropdownProps> = ({ value, onChange, options, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const openDropdown = () => {
    const idx = options.indexOf(value);
    setHighlightedIdx(idx >= 0 ? idx : 0);
    setIsOpen(true);
  };

  const closeDropdown = () => setIsOpen(false);

  const selectOption = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

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

      {isOpen && (
        <div className="absolute top-full left-0 min-w-[110px] mt-0.5 bg-white border-2 border-indigo-200 rounded-lg shadow-xl z-50 overflow-hidden">
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
        </div>
      )}
    </div>
  );
};

export default RxDropdown;
