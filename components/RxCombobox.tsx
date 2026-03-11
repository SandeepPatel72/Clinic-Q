import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface RxComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

const RxCombobox: React.FC<RxComboboxProps> = ({ value, onChange, options, placeholder = '', className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter(o => o.toLowerCase().includes(value.toLowerCase()));
  const listToShow = filtered.length > 0 ? filtered : options;

  const openDropdown = (el: HTMLInputElement) => {
    const rect = el.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 100) });
    setHighlightedIdx(-1);
    setIsOpen(true);
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setDropdownPos(null);
  };

  const selectOption = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
    setDropdownPos(null);
    setHighlightedIdx(-1);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen && inputRef.current) openDropdown(inputRef.current);
      setHighlightedIdx(i => (i + 1) % listToShow.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen && inputRef.current) openDropdown(inputRef.current);
      setHighlightedIdx(i => (i - 1 + listToShow.length) % listToShow.length);
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIdx >= 0) {
        e.preventDefault();
        selectOption(listToShow[highlightedIdx]);
      }
      // highlightedIdx === -1: typed custom value — don't preventDefault, global nav moves to next field
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        data-ef=""
        className={`bg-transparent text-xs font-medium text-slate-800 outline-none py-1.5 placeholder:text-slate-300 ${className}`}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={e => {
          onChange(e.target.value);
          if (inputRef.current) openDropdown(inputRef.current);
        }}
        onFocus={e => openDropdown(e.currentTarget)}
        onBlur={() => setTimeout(() => closeDropdown(), 150)}
        onKeyDown={handleKeyDown}
      />
      {isOpen && dropdownPos && createPortal(
        <div
          className="bg-white border-2 border-indigo-200 rounded-lg shadow-xl overflow-y-auto"
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, minWidth: dropdownPos.width, maxHeight: 180, zIndex: 9999 }}
        >
          {listToShow.map((opt, i) => (
            <div
              key={opt}
              className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                i === highlightedIdx
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'text-slate-700 hover:bg-indigo-50'
              }`}
              onMouseEnter={() => setHighlightedIdx(i)}
              onMouseDown={() => selectOption(opt)}
            >
              {opt}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};

export default RxCombobox;
