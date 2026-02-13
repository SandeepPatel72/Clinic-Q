
import React, { useState, useRef, useEffect } from 'react';

function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('clinicflow_authToken');
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers }).then(res => {
    if (res.status === 401) {
      localStorage.removeItem('clinicflow_isLoggedIn');
      localStorage.removeItem('clinicflow_activeView');
      localStorage.removeItem('clinicflow_authToken');
      window.dispatchEvent(new Event('auth:logout'));
    }
    return res;
  });
}

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  apiEndpoint: string;
  placeholder?: string;
  label: string;
}

const TagInput: React.FC<TagInputProps> = ({ tags, onChange, apiEndpoint, placeholder, label }) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (input.trim().length < 1) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await authFetch(`${apiEndpoint}?q=${encodeURIComponent(input.trim())}`);
        if (res.ok) {
          const data = await res.json();
          const filtered = data.filter((s: string) => !tags.includes(s));
          setSuggestions(filtered);
          setShowSuggestions(filtered.length > 0);
          setHighlightedIndex(-1);
        }
      } catch {
        setSuggestions([]);
      }
    };

    const timer = setTimeout(fetchSuggestions, 150);
    return () => clearTimeout(timer);
  }, [input, apiEndpoint, tags]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      if (showSuggestions && highlightedIndex >= 0) {
        addTag(suggestions[highlightedIndex]);
      } else if (input.trim()) {
        addTag(input);
      }
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showSuggestions && suggestions.length > 0) {
        setShowSuggestions(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div className="flex flex-col gap-2" ref={containerRef}>
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">{label}</label>
      <div className="relative">
        <div
          className="w-full bg-white border-2 border-slate-200 rounded-xl p-2 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all min-h-[44px] flex flex-wrap items-center gap-1.5 cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded-full border border-indigo-200"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(index); }}
                className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-indigo-300 text-indigo-600 hover:text-white transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            className="flex-1 min-w-[120px] bg-transparent outline-none text-sm font-medium text-slate-900 placeholder:text-slate-300 py-1"
            placeholder={tags.length === 0 ? (placeholder || `Type and press comma to add`) : ''}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          />
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-indigo-200 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion}
                className={`px-4 py-2 cursor-pointer text-sm font-medium transition-colors ${
                  index === highlightedIndex
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'text-slate-700 hover:bg-indigo-50'
                }`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => addTag(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TagInput;
