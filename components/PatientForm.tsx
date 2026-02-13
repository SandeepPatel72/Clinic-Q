
import React, { useState, useEffect, useRef } from 'react';
import { PatientFormData, PatientCategory, Patient, PatientType } from '../types';
import { CITIES, CATEGORY_OPTIONS, PATIENT_TYPE_OPTIONS, VISITOR_TYPE_OPTIONS, Icons } from '../constants';

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

interface PatientFormProps {
  onSubmit: (data: PatientFormData) => void;
  initialData?: Patient;
  isEditing?: boolean;
}

interface LookupPatient {
  id: number;
  name: string;
  age: number;
  gender: string;
  city: string;
  mobile: string;
}

const PatientForm: React.FC<PatientFormProps> = ({ onSubmit, initialData, isEditing }) => {
  const defaultData: PatientFormData = {
    name: '',
    age: 0,
    gender: 'Male',
    category: PatientCategory.PATIENT,
    type: PatientType.GEN_PATIENT,
    city: '',
    mobile: '',
  };

  const [formData, setFormData] = useState<PatientFormData>(defaultData);
  const [lookupResults, setLookupResults] = useState<LookupPatient[]>([]);
  const [showLookup, setShowLookup] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [cityHighlightedIndex, setCityHighlightedIndex] = useState(-1);
  const lookupRef = useRef<HTMLDivElement>(null);
  const lookupListRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

  const filteredCities = CITIES.filter(c => c !== '--' && c.toLowerCase().includes(formData.city.toLowerCase()));

  useEffect(() => {
    const handleCtrlEnter = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter' && formRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        formRef.current.requestSubmit();
      }
    };
    window.addEventListener('keydown', handleCtrlEnter);
    return () => window.removeEventListener('keydown', handleCtrlEnter);
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        age: initialData.age,
        gender: initialData.gender,
        category: initialData.category,
        type: initialData.type,
        city: initialData.city,
        mobile: initialData.mobile || '',
      });
    } else {
      setFormData(defaultData);
    }
  }, [initialData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (lookupRef.current && !lookupRef.current.contains(event.target as Node)) {
        setShowLookup(false);
      }
      if (cityRef.current && !cityRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showLookup && lookupResults.length > 0 && lookupListRef.current) {
      lookupListRef.current.focus();
    }
  }, [showLookup, lookupResults]);

  useEffect(() => {
    const handleF2 = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        mobileInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleF2);
    return () => window.removeEventListener('keydown', handleF2);
  }, []);

  const handleMobileLookup = async () => {
    const mobile = formData.mobile.trim();
    if (mobile.length < 3) {
      alert('Please enter at least 3 digits to search');
      return;
    }
    setIsSearching(true);
    try {
      const response = await authFetch(`/api/patients/lookup/${encodeURIComponent(mobile)}`);
      if (!response.ok) {
        throw new Error('Server error');
      }
      const patients = await response.json();
      setLookupResults(patients);
      setShowLookup(true);
      setHighlightedIndex(patients.length > 0 ? 0 : -1);
    } catch (err) {
      console.error('Lookup error:', err);
      setLookupResults([]);
      setShowLookup(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLookupKeyDown = (e: React.KeyboardEvent) => {
    if (!showLookup || lookupResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        const next = prev < lookupResults.length - 1 ? prev + 1 : 0;
        const el = lookupListRef.current?.children[next + 1] as HTMLElement;
        if (el) el.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        const next = prev > 0 ? prev - 1 : lookupResults.length - 1;
        const el = lookupListRef.current?.children[next + 1] as HTMLElement;
        if (el) el.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectPatient(lookupResults[highlightedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowLookup(false);
      setHighlightedIndex(-1);
      mobileInputRef.current?.focus();
    }
  };

  const handleSelectPatient = (patient: LookupPatient) => {
    setFormData(prev => ({
      ...prev,
      name: patient.name,
      age: patient.age,
      gender: patient.gender as 'Male' | 'Female',
      city: patient.city,
      mobile: patient.mobile,
    }));
    setShowLookup(false);
    setLookupResults([]);
  };

  const handleCategoryChange = (cat: PatientCategory) => {
    const defaultType = cat === PatientCategory.PATIENT 
      ? PatientType.GEN_PATIENT 
      : PatientType.VISITOR;
    
    setFormData(prev => ({ 
      ...prev, 
      category: cat, 
      type: defaultType 
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a name.');
      return;
    }
    
    onSubmit({
      ...formData,
      age: formData.age || 0,
    });
    
    if (!isEditing) setFormData(defaultData);
  };

  const currentTypeOptions = formData.category === PatientCategory.PATIENT 
    ? PATIENT_TYPE_OPTIONS 
    : VISITOR_TYPE_OPTIONS;

  const inputClasses = "w-full bg-white text-slate-900 border-2 border-slate-200 rounded-xl p-3 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium";
  const labelClasses = "text-[12px] font-bold text-slate-500 uppercase tracking-widest ml-1";
  const radioGroupClasses = "flex flex-wrap gap-2 p-1.5 bg-slate-100/50 border border-slate-200 rounded-xl";
  const radioLabelClasses = "flex-1 min-w-[90px] flex items-center justify-center gap-2 cursor-pointer p-2 rounded-lg transition-all border-2 border-transparent has-[:checked]:border-indigo-600 has-[:checked]:bg-white has-[:checked]:shadow-sm";
  const radioTextClasses = "text-slate-700 font-bold text-[11px] uppercase tracking-wider";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        
        {/* Row 1: Mobile | Full Name */}
        <div className="flex flex-col gap-2 relative" ref={lookupRef}>
          <label className={labelClasses}>Mobile (Optional)</label>
          <div className="flex gap-2">
            <input
              ref={mobileInputRef}
              tabIndex={1}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              className={`${inputClasses} flex-1`}
              placeholder="Contact number"
              value={formData.mobile}
              onChange={e => setFormData({ ...formData, mobile: e.target.value.replace(/[^0-9]/g, '') })}
              onKeyDown={e => { if (e.key === 'Enter' && !showLookup) { e.preventDefault(); handleMobileLookup(); } }}
            />
            <button
              tabIndex={2}
              type="button"
              onClick={handleMobileLookup}
              disabled={isSearching}
              className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-1"
              title="Search patient by mobile"
            >
              {isSearching ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Icons.Search />
              )}
            </button>
          </div>
          {showLookup && (
            <div ref={lookupListRef} tabIndex={-1} onKeyDown={handleLookupKeyDown} className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-indigo-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto outline-none">
              {lookupResults.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No patients found with this mobile number
                </div>
              ) : (
                <>
                  <div className="p-2 bg-indigo-50 text-xs font-bold text-indigo-700 uppercase tracking-wider border-b">
                    Select Patient ({lookupResults.length} found) — Use ↑↓ keys, Enter to select
                  </div>
                  {lookupResults.map((patient, index) => (
                    <div
                      key={patient.id}
                      onClick={() => handleSelectPatient(patient)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`p-3 cursor-pointer border-b last:border-b-0 transition-colors ${
                        index === highlightedIndex ? 'bg-indigo-100 ring-2 ring-inset ring-indigo-400' : 'hover:bg-indigo-50'
                      }`}
                    >
                      <div className="font-bold text-slate-800">{patient.name}</div>
                      <div className="text-xs text-slate-500 flex gap-3 mt-1">
                        <span>{patient.age} yrs</span>
                        <span>{patient.gender}</span>
                        <span>{patient.city}</span>
                        <span className="text-indigo-600">{patient.mobile}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:col-span-1">
          <label className={labelClasses}>Full Name</label>
          <input
            tabIndex={3}
            type="text"
            className={inputClasses}
            placeholder="e.g. John Doe"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        {/* Row 2: Age | Gender */}
        <div className="flex flex-col gap-2">
          <label className={labelClasses}>Age</label>
          <input
            tabIndex={4}
            type="number"
            className={inputClasses}
            value={formData.age || ''}
            placeholder="25"
            onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelClasses}>Gender</label>
          <div className={radioGroupClasses}>
            <label className={radioLabelClasses}>
              <input
                tabIndex={5}
                type="radio"
                name="gender"
                value="Male"
                checked={formData.gender === 'Male'}
                onChange={() => setFormData({ ...formData, gender: 'Male' })}
                className="sr-only"
              />
              <span className={radioTextClasses}>Male</span>
            </label>
            <label className={radioLabelClasses}>
              <input
                tabIndex={6}
                type="radio"
                name="gender"
                value="Female"
                checked={formData.gender === 'Female'}
                onChange={() => setFormData({ ...formData, gender: 'Female' })}
                className="sr-only"
              />
              <span className={radioTextClasses}>Female</span>
            </label>
          </div>
        </div>

        {/* Row 3: City (full width) - Custom Combo Box */}
        <div className="flex flex-col gap-2 sm:col-span-2 relative" ref={cityRef}>
          <label className={labelClasses}>City / Location</label>
          <div className="relative">
            <input
              tabIndex={7}
              type="text"
              autoComplete="off"
              className={inputClasses}
              placeholder="Type or select a city"
              value={formData.city}
              onChange={e => {
                setFormData({ ...formData, city: e.target.value });
                setShowCityDropdown(true);
                setCityHighlightedIndex(-1);
              }}
              onFocus={() => setShowCityDropdown(true)}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (!showCityDropdown) { setShowCityDropdown(true); setCityHighlightedIndex(0); return; }
                  setCityHighlightedIndex(prev => {
                    const next = prev < filteredCities.length - 1 ? prev + 1 : 0;
                    document.getElementById(`city-opt-${next}`)?.scrollIntoView({ block: 'nearest' });
                    return next;
                  });
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (!showCityDropdown) { setShowCityDropdown(true); setCityHighlightedIndex(filteredCities.length - 1); return; }
                  setCityHighlightedIndex(prev => {
                    const next = prev > 0 ? prev - 1 : filteredCities.length - 1;
                    document.getElementById(`city-opt-${next}`)?.scrollIntoView({ block: 'nearest' });
                    return next;
                  });
                } else if (e.key === 'Enter' && showCityDropdown && cityHighlightedIndex >= 0) {
                  e.preventDefault();
                  setFormData({ ...formData, city: filteredCities[cityHighlightedIndex] });
                  setShowCityDropdown(false);
                  setCityHighlightedIndex(-1);
                } else if (e.key === 'Escape') {
                  setShowCityDropdown(false);
                }
              }}
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              onClick={() => setShowCityDropdown(!showCityDropdown)}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
            </button>
          </div>
          {showCityDropdown && filteredCities.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-indigo-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
              {filteredCities.map((city, index) => (
                <div
                  key={city}
                  id={`city-opt-${index}`}
                  className={`px-4 py-2.5 cursor-pointer text-sm font-medium transition-colors ${
                    index === cityHighlightedIndex
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'text-slate-700 hover:bg-indigo-50'
                  }`}
                  onMouseEnter={() => setCityHighlightedIndex(index)}
                  onClick={() => {
                    setFormData({ ...formData, city });
                    setShowCityDropdown(false);
                    setCityHighlightedIndex(-1);
                  }}
                >
                  {city}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Row 4: Primary Category (full width) */}
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className={labelClasses}>Primary Category</label>
          <div className={radioGroupClasses}>
            {CATEGORY_OPTIONS.map((cat, i) => (
              <label key={cat} className={radioLabelClasses}>
                <input
                  tabIndex={8 + i}
                  type="radio"
                  name="category"
                  value={cat}
                  checked={formData.category === cat}
                  onChange={() => handleCategoryChange(cat)}
                  className="sr-only"
                />
                <span className={radioTextClasses}>{cat}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Row 5: Entry Type (full width) */}
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className={labelClasses}>Entry Type</label>
          <div className={radioGroupClasses}>
            {currentTypeOptions.map((type, i) => (
              <label key={type} className={radioLabelClasses}>
                <input
                  tabIndex={10 + i}
                  type="radio"
                  name="type"
                  value={type}
                  checked={formData.type === type}
                  onChange={() => setFormData({ ...formData, type: type })}
                  className="sr-only"
                />
                <span className={radioTextClasses}>{type}</span>
              </label>
            ))}
          </div>
        </div>

      </div>

      <div className="flex gap-3">
        <button
          tabIndex={13}
          type="button"
          onClick={() => setFormData(defaultData)}
          className="flex-1 bg-slate-500 hover:bg-slate-600 text-white font-extrabold py-4 rounded-2xl shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 text-base uppercase tracking-widest"
        >
          <Icons.X />
          Clear
        </button>
        <button
          tabIndex={14}
          type="submit"
          className={`flex-[2] ${isEditing ? 'bg-amber-600' : 'bg-indigo-700'} text-white font-extrabold py-4 rounded-2xl shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 text-base uppercase tracking-widest`}
        >
          {isEditing ? <Icons.Edit /> : <Icons.CheckCircle />} 
          {isEditing ? 'Update Profile' : 'SAVE (Ctrl+Ent)'}
        </button>
      </div>
    </form>
  );
};

export default PatientForm;
