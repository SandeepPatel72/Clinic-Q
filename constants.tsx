
import React from 'react';
import { PatientCategory, PatientType } from './types';

export const CITIES = [
  '--', 'New York', 'London', 'Mumbai', 'Tokyo', 'Nakhatrana - નખત્રાણા','Berlin', 
  'Paris', 'Sydney', 'Toronto', 'Dhavda - ધાવડા', 'Singapore', 'Dubai'
];

export const CATEGORY_OPTIONS = [
  PatientCategory.PATIENT,
  PatientCategory.VISITOR
];

export const PATIENT_TYPE_OPTIONS = [
  PatientType.GEN_PATIENT,
  PatientType.REF_PATIENT,
  PatientType.REL_PATIENT
];

export const VISITOR_TYPE_OPTIONS = [
  PatientType.VISITOR,
  PatientType.RELATIVE,
  PatientType.FAMILY,
  PatientType.MR,
  PatientType.DOCTOR,
  PatientType.SOCIAL
];

export const TYPE_THEMES: Record<PatientType, string> = {
  // Category: PATIENT -> Light Green (Emerald)
  [PatientType.GEN_PATIENT]: 'bg-emerald-50 border-emerald-300',
  [PatientType.REF_PATIENT]: 'bg-emerald-50 border-emerald-300',
  [PatientType.REL_PATIENT]: 'bg-emerald-50 border-emerald-300',
  
  // Category: VISITOR -> Specific colors
  [PatientType.VISITOR]: 'bg-emerald-50 border-emerald-300', // Light Green
  
  [PatientType.RELATIVE]: 'bg-rose-50 border-rose-400',       // Light Red (Rose)
  [PatientType.FAMILY]: 'bg-rose-50 border-rose-400',         // Light Red (Rose)
  
  [PatientType.MR]: 'bg-violet-50 border-violet-400',         // Light Purple (Violet)
  [PatientType.DOCTOR]: 'bg-violet-50 border-violet-400',     // Light Purple (Violet)
  [PatientType.SOCIAL]: 'bg-violet-50 border-violet-400',     // Light Purple (Violet)
};

export const Icons = {
  QueueLogo: ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 20" fill="currentColor">
      {/* Q letter - circle with tail */}
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.5" fill="none"/>
      <line x1="14" y1="14" x2="20" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Plus symbol inside Q */}
      <line x1="10" y1="6" x2="10" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="6" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Three decreasing dots */}
      <circle cx="26" cy="14" r="3.5" fill="currentColor"/>
      <circle cx="34" cy="14" r="2.5" fill="currentColor"/>
      <circle cx="40" cy="14" r="1.8" fill="currentColor"/>
    </svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
  ),
  Stethoscope: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2h0a2 2 0 0 0-2 2v12a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h0a.3.3 0 1 0 .2.3"/><path d="M9 16V2"/><path d="M9 6H5"/><path d="M9 10h6"/><path d="M22 10V6a2 2 0 0 0-2-2h-3"/><rect x="15" y="10" width="7" height="4" rx="2"/></svg>
  ),
  CheckCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  ),
  Clock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
  ),
  ChevronUp: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
  ),
  ChevronDown: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
  ),
  Message: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  ),
  Phone: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
  ),
  Search: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  ),
  Users: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  Download: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
  MaleAvatar: ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="30" fill="#3b82f6"/>
      <circle cx="32" cy="22" r="10" fill="#dbeafe"/>
      <path d="M16 52c0-8.837 7.163-16 16-16s16 7.163 16 16" fill="#dbeafe"/>
    </svg>
  ),
  FemaleAvatar: ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="30" fill="#ec4899"/>
      <circle cx="32" cy="22" r="10" fill="#fce7f3"/>
      <path d="M16 52c0-8.837 7.163-16 16-16s16 7.163 16 16" fill="#fce7f3"/>
      <ellipse cx="32" cy="14" rx="12" ry="6" fill="#fce7f3"/>
    </svg>
  )
};
