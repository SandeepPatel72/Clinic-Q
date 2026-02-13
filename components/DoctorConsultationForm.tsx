
import React, { useState, useEffect, useRef } from 'react';
import { Patient, PatientCategory, PrescriptionItem } from '../types';
import { Icons } from '../constants';
import PatientHistoryModal from './PatientHistoryModal';
import TagInput from './TagInput';

const API_BASE = '/api';

interface DoctorConsultationFormProps {
  patient?: Patient;
  onSave: (id: string, consultationData: Record<string, any>) => void;
  onOpenChat: (id: string) => void;
  onCancel?: () => void;
}

const EMPTY_RX: PrescriptionItem = { type: 'Tab', name: '', dose: '', days: '', instructions: 'After Food' };

const RX_TYPES = ['Tab', 'Cap', 'Syp', 'Inj', 'Drops', 'Cream', 'Gel', 'Powder', 'Inhaler', 'Other'];
const RX_INSTRUCTIONS = ['Before Food', 'After Food', 'With Food', 'Empty Stomach', 'At Bedtime', 'SOS', 'As Directed'];

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

const DoctorConsultationForm: React.FC<DoctorConsultationFormProps> = ({ patient, onSave, onOpenChat, onCancel }) => {
  const [bp, setBp] = useState('');
  const [temperature, setTemperature] = useState('');
  const [pulse, setPulse] = useState('');
  const [weight, setWeight] = useState('');
  const [spo2, setSpo2] = useState('');
  const [complaints, setComplaints] = useState<string[]>([]);
  const [diagnosis, setDiagnosis] = useState<string[]>([]);
  const [prescription, setPrescription] = useState<PrescriptionItem[]>([{ ...EMPTY_RX }]);
  const [advice, setAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [medicines, setMedicines] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [medicineSuggestions, setMedicineSuggestions] = useState<Record<number, string[]>>({});
  const [metadata, setMetadata] = useState<{ hospitalName?: string; appName?: string }>({});

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (patient) {
      setBp(patient.bp || '');
      setTemperature(patient.temperature ? String(patient.temperature) : '');
      setPulse(patient.pulse ? String(patient.pulse) : '');
      setWeight(patient.weight ? String(patient.weight) : '');
      setSpo2(patient.spo2 ? String(patient.spo2) : '');
      setComplaints(patient.complaints || []);
      setDiagnosis(patient.diagnosis || []);
      setPrescription(patient.prescription && patient.prescription.length > 0 ? patient.prescription : [{ ...EMPTY_RX }]);
      setAdvice(patient.advice || '');
      setFollowUpDate(patient.followUpDate || '');
      setNotes(patient.notes || '');
      setMedicines(patient.medicines || '');
    }
  }, [patient]);

  useEffect(() => {
    fetch('/metadata.json').then(r => r.json()).then(d => setMetadata(d)).catch(() => {});
  }, []);

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

  const escHtml = (str: string) => str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const formatIST = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

  const getFollowUpDateStr = () => {
    if (!followUpDate) return '';
    const days = parseInt(followUpDate, 10);
    if (!isNaN(days)) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return formatIST(d);
    }
    return formatIST(new Date(followUpDate));
  };

  const handlePrintPrescription = () => {
    if (!patient) return;
    const cleanRx = prescription.filter(rx => rx.name.trim() !== '');
    const todayStr = formatIST(new Date());
    const followUpStr = getFollowUpDateStr();
    const hospitalName = metadata.hospitalName || 'Hospital';

    const vitalsHtml = [
      bp && `<span><b>BP:</b> ${escHtml(bp)}</span>`,
      temperature && `<span><b>Temp:</b> ${escHtml(temperature)}°F</span>`,
      pulse && `<span><b>Pulse:</b> ${escHtml(pulse)}/min</span>`,
      weight && `<span><b>Weight:</b> ${escHtml(weight)} kg</span>`,
      spo2 && `<span><b>SpO2:</b> ${escHtml(spo2)}%</span>`,
    ].filter(Boolean).join(' &nbsp;|&nbsp; ');

    const rxRowsHtml = cleanRx.map((rx, i) => `
      <tr>
        <td style="border:1px solid #ccc;padding:5px 8px;text-align:center;">${i + 1}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;">${escHtml(rx.type)}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;font-weight:600;">${escHtml(rx.name)}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;text-align:center;">${escHtml(rx.dose)}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;text-align:center;">${escHtml(rx.days)}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;">${escHtml(rx.instructions)}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Prescription - ${escHtml(patient.name)}</title>
<style>
  @page { size: A5; margin: 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #222; padding: 8mm; max-width: 148mm; }
  .header { text-align: center; border-bottom: 2px solid #4338ca; padding-bottom: 8px; margin-bottom: 10px; }
  .header h1 { font-size: 18px; color: #4338ca; margin: 0; text-transform: uppercase; letter-spacing: 2px; }
  .header p { font-size: 10px; color: #666; margin-top: 2px; }
  .rx-symbol { font-size: 22px; font-weight: bold; color: #4338ca; font-family: serif; }
  .patient-info { display: flex; justify-content: space-between; border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px; background: #f9fafb; }
  .patient-info div { font-size: 11px; }
  .patient-info b { color: #333; }
  .section { margin-bottom: 8px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #4338ca; letter-spacing: 1px; margin-bottom: 4px; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px; }
  .vitals { font-size: 11px; color: #444; }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .tag { background: #eef2ff; color: #4338ca; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #4338ca; color: white; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { font-size: 11px; }
  .advice-box { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 6px; padding: 8px 12px; font-size: 11px; color: #92400e; }
  .follow-up { background: #eef2ff; border: 1px solid #818cf8; border-radius: 6px; padding: 6px 12px; font-size: 12px; color: #4338ca; font-weight: 700; display: inline-block; }
  .footer { margin-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  .signature { text-align: right; }
  .signature .line { border-top: 1px solid #333; width: 160px; margin-bottom: 4px; margin-left: auto; }
  .signature p { font-size: 10px; color: #666; }
  @media print { body { padding: 0; } }
</style></head><body>
  <div class="header">
    <h1>${escHtml(hospitalName)}</h1>
    <p>Prescription</p>
  </div>

  <div class="patient-info">
    <div><b>Patient:</b> ${escHtml(patient.name)}</div>
    <div><b>Age/Gender:</b> ${escHtml(String(patient.age || '-'))} / ${escHtml(patient.gender || '-')}</div>
    <div><b>Queue:</b> #${escHtml(String(patient.queueId || '-'))}</div>
    <div><b>Date:</b> ${todayStr}</div>
  </div>

  ${vitalsHtml ? `<div class="section"><div class="section-title">Vitals</div><div class="vitals">${vitalsHtml}</div></div>` : ''}

  ${complaints.length > 0 ? `<div class="section"><div class="section-title">Chief Complaints</div><div class="tags">${complaints.map(c => `<span class="tag">${escHtml(c)}</span>`).join('')}</div></div>` : ''}

  ${diagnosis.length > 0 ? `<div class="section"><div class="section-title">Diagnosis</div><div class="tags">${diagnosis.map(d => `<span class="tag">${escHtml(d)}</span>`).join('')}</div></div>` : ''}

  ${cleanRx.length > 0 ? `<div class="section">
    <div class="section-title"><span class="rx-symbol">&#8478;</span> Prescription</div>
    <table>
      <thead><tr><th>#</th><th>Type</th><th>Medicine</th><th>Dose</th><th>Days</th><th>Instructions</th></tr></thead>
      <tbody>${rxRowsHtml}</tbody>
    </table>
  </div>` : ''}

  ${advice ? `<div class="section"><div class="section-title">Advice / Instructions</div><div class="advice-box">${escHtml(advice)}</div></div>` : ''}

  ${followUpStr ? `<div class="section"><div class="section-title">Follow-up</div><div class="follow-up">Next Visit: ${followUpStr}</div></div>` : ''}

  <div class="footer">
    <div style="font-size:10px;color:#999;">Generated by Clinic-Q</div>
    <div class="signature">
      <div class="line"></div>
      <p>Doctor's Signature</p>
    </div>
  </div>
</body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 400);
    }
  };

  if (!patient) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
        <div className="bg-white p-6 rounded-full shadow-sm mb-6 opacity-30">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <p className="text-xl font-black text-slate-800 uppercase tracking-widest">Station Idle</p>
        <p className="text-center mt-3 max-w-xs text-sm font-medium text-slate-500 leading-relaxed">Select a patient from the <span className="text-amber-600 font-bold uppercase">OPD Queue</span> to begin clinical documentation.</p>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrescription = prescription.filter(rx => rx.name.trim() !== '');
    onSave(patient.id, {
      bp: bp || null,
      temperature: temperature ? parseFloat(temperature) : null,
      pulse: pulse ? parseInt(pulse) : null,
      weight: weight ? parseFloat(weight) : null,
      spo2: spo2 ? parseInt(spo2) : null,
      complaints,
      diagnosis,
      prescription: cleanPrescription,
      advice: advice || null,
      followUpDate: followUpDate || null,
      notes: notes || null,
      medicines: medicines || null
    });
    setBp(''); setTemperature(''); setPulse(''); setWeight(''); setSpo2('');
    setComplaints([]); setDiagnosis([]);
    setPrescription([{ ...EMPTY_RX }]);
    setAdvice(''); setFollowUpDate('');
    setNotes(''); setMedicines('');
  };

  const updatePrescription = (index: number, field: keyof PrescriptionItem, value: string) => {
    const updated = [...prescription];
    updated[index] = { ...updated[index], [field]: value };
    setPrescription(updated);
  };

  const addPrescriptionRow = () => {
    setPrescription([...prescription, { ...EMPTY_RX }]);
  };

  const removePrescriptionRow = (index: number) => {
    if (prescription.length <= 1) return;
    setPrescription(prescription.filter((_, i) => i !== index));
  };

  const fetchMedicineSuggestions = async (index: number, query: string) => {
    if (query.trim().length < 1) {
      setMedicineSuggestions(prev => ({ ...prev, [index]: [] }));
      return;
    }
    try {
      const res = await authFetch(`${API_BASE}/tags/medicines?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setMedicineSuggestions(prev => ({ ...prev, [index]: data }));
      }
    } catch {
      setMedicineSuggestions(prev => ({ ...prev, [index]: [] }));
    }
  };

  const vitalInput = (label: string, value: string, onChange: (v: string) => void, placeholder: string, unit: string, type: string = 'text') => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type={type}
          className="w-full bg-white border-2 border-slate-200 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{unit}</span>
      </div>
    </div>
  );

  return (
    <form ref={formRef} onSubmit={handleSave} className="space-y-4 h-full flex flex-col overflow-auto">
      {/* Patient Header - Compact single row */}
      <div className="bg-indigo-50/50 px-4 py-2.5 rounded-2xl border border-indigo-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {patient.category !== PatientCategory.VISITOR && (
            <span className="bg-indigo-900 text-white font-black px-2.5 py-1 rounded-lg text-[10px] shadow-sm tracking-widest flex items-center gap-0.5 flex-shrink-0">
              <span className="opacity-60">#</span>
              <span>{patient.queueId}</span>
            </span>
          )}
          <h2 className="text-xl font-black text-indigo-900 uppercase truncate tracking-tight">
            {patient.name}
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {patient.hasPreviousVisits && (
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white text-indigo-600 border-2 border-indigo-200 hover:bg-indigo-50 shadow-sm transition-all"
              title="View Patient History"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChat(patient.id)}
            className={`flex items-center justify-center w-9 h-9 rounded-xl shadow-sm transition-all border-2 ${
              patient.hasUnreadAlert
              ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
              : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
            }`}
            title={patient.hasUnreadAlert ? 'Urgent Alert' : 'Chat'}
          >
            <Icons.Message />
          </button>
        </div>
      </div>

      {/* Vitals Row */}
      <div className="bg-sky-50/60 p-3 rounded-xl border border-sky-100 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="text-[11px] font-black text-sky-700 uppercase tracking-[0.15em]">Vitals</span>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {vitalInput('BP', bp, setBp, '120/80', 'mmHg')}
          {vitalInput('Temp', temperature, setTemperature, '98.6', '°F', 'number')}
          {vitalInput('Pulse', pulse, setPulse, '72', 'bpm', 'number')}
          {vitalInput('Weight', weight, setWeight, '60', 'kg', 'number')}
          {vitalInput('SpO2', spo2, setSpo2, '98', '%', 'number')}
        </div>
      </div>

      {/* Complaints & Diagnosis */}
      <div className="grid grid-cols-2 gap-4 flex-shrink-0">
        <TagInput
          label="Chief Complaints"
          tags={complaints}
          onChange={setComplaints}
          apiEndpoint={`${API_BASE}/tags/complaints`}
          placeholder="Type complaint, press comma to add"
        />
        <TagInput
          label="Diagnosis"
          tags={diagnosis}
          onChange={setDiagnosis}
          apiEndpoint={`${API_BASE}/tags/diagnosis`}
          placeholder="Type diagnosis, press comma to add"
        />
      </div>

      {/* Prescription Table */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span className="text-[11px] font-black text-emerald-700 uppercase tracking-[0.15em]">Prescription (Rx)</span>
          </div>
          <button
            type="button"
            onClick={addPrescriptionRow}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold hover:bg-emerald-200 transition-colors border border-emerald-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Row
          </button>
        </div>
        <div className="border-2 border-emerald-100 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[70px_1fr_80px_60px_120px_36px] gap-0 bg-emerald-50 text-[10px] font-black text-emerald-700 uppercase tracking-wider">
            <div className="px-2 py-2 border-r border-emerald-100">Type</div>
            <div className="px-2 py-2 border-r border-emerald-100">Medicine Name</div>
            <div className="px-2 py-2 border-r border-emerald-100">Dose</div>
            <div className="px-2 py-2 border-r border-emerald-100">Days</div>
            <div className="px-2 py-2 border-r border-emerald-100">Instructions</div>
            <div className="px-2 py-2"></div>
          </div>
          {prescription.map((rx, index) => (
            <div key={index} className="grid grid-cols-[70px_1fr_80px_60px_120px_36px] gap-0 border-t border-emerald-100 bg-white">
              <div className="px-1 py-1 border-r border-emerald-50">
                <select
                  className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none py-1.5 cursor-pointer"
                  value={rx.type}
                  onChange={e => updatePrescription(index, 'type', e.target.value)}
                >
                  {RX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="px-1 py-1 border-r border-emerald-50 relative">
                <input
                  type="text"
                  className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none py-1.5 placeholder:text-slate-300"
                  placeholder="Medicine name"
                  value={rx.name}
                  autoComplete="off"
                  onChange={e => {
                    updatePrescription(index, 'name', e.target.value);
                    fetchMedicineSuggestions(index, e.target.value);
                  }}
                  onFocus={() => { if (rx.name.trim()) fetchMedicineSuggestions(index, rx.name); }}
                  onBlur={() => setTimeout(() => setMedicineSuggestions(prev => ({ ...prev, [index]: [] })), 200)}
                />
                {medicineSuggestions[index]?.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border-2 border-indigo-200 rounded-lg shadow-xl z-50 max-h-32 overflow-y-auto">
                    {medicineSuggestions[index].map(s => (
                      <div
                        key={s}
                        className="px-3 py-1.5 cursor-pointer text-xs font-medium text-slate-700 hover:bg-indigo-50 transition-colors"
                        onMouseDown={() => {
                          updatePrescription(index, 'name', s);
                          setMedicineSuggestions(prev => ({ ...prev, [index]: [] }));
                        }}
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-1 py-1 border-r border-emerald-50">
                <input
                  type="text"
                  className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none py-1.5 placeholder:text-slate-300"
                  placeholder="1-0-1"
                  value={rx.dose}
                  onChange={e => updatePrescription(index, 'dose', e.target.value)}
                />
              </div>
              <div className="px-1 py-1 border-r border-emerald-50">
                <input
                  type="text"
                  className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none py-1.5 placeholder:text-slate-300"
                  placeholder="5"
                  value={rx.days}
                  onChange={e => updatePrescription(index, 'days', e.target.value)}
                />
              </div>
              <div className="px-1 py-1 border-r border-emerald-50">
                <select
                  className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none py-1.5 cursor-pointer"
                  value={rx.instructions}
                  onChange={e => updatePrescription(index, 'instructions', e.target.value)}
                >
                  {RX_INSTRUCTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-center">
                {prescription.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePrescriptionRow(index)}
                    className="w-6 h-6 flex items-center justify-center rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advice & Follow-up */}
      <div className="grid grid-cols-[1fr_180px] gap-4 flex-shrink-0">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">Advice / Instructions</label>
          <textarea
            className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 resize-none"
            rows={2}
            placeholder="Rest, diet instructions, follow-up advice..."
            value={advice}
            onChange={e => setAdvice(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">Follow-up</label>
          <select
            className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
            value={followUpDate}
            onChange={e => setFollowUpDate(e.target.value)}
          >
            <option value="">-- Select --</option>
            <option value="5">5 Days</option>
            <option value="7">7 Days</option>
            <option value="8">8 Days</option>
            <option value="15">15 Days</option>
            <option value="30">1 Month</option>
          </select>
        </div>
      </div>

      {/* Legacy Notes & Medicines (collapsible) */}
      <details className="flex-shrink-0 bg-slate-50 rounded-xl border border-slate-200">
        <summary className="px-3 py-2 cursor-pointer text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] hover:text-slate-600 transition-colors">
          Additional Notes (Optional)
        </summary>
        <div className="grid grid-cols-2 gap-3 p-3 pt-1">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Clinical Notes</label>
            <textarea
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-400 resize-none placeholder:text-slate-300"
              rows={2}
              placeholder="Additional observations..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Free-text Medicines</label>
            <textarea
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium font-mono text-slate-900 outline-none focus:border-indigo-400 resize-none placeholder:text-slate-300"
              rows={2}
              placeholder="Additional Rx notes..."
              value={medicines}
              onChange={e => setMedicines(e.target.value)}
            />
          </div>
        </div>
      </details>

      {/* Action Buttons */}
      <div className="flex gap-3 flex-shrink-0 pt-1">
        <button
          type="button"
          onClick={handlePrintPrescription}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-2xl shadow-xl transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 text-sm uppercase tracking-[0.15em]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Prescription
        </button>
        <button
          type="submit"
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl shadow-xl transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 text-sm uppercase tracking-[0.15em]"
        >
          <Icons.CheckCircle />
          Finalize (Ctrl+Ent)
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-3.5 rounded-2xl shadow-sm transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 text-sm uppercase tracking-[0.15em] border-2 border-slate-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close
          </button>
        )}
      </div>

      {showHistoryModal && patient?.patientId && patient?.hasPreviousVisits && (
        <PatientHistoryModal
          patientId={patient.patientId}
          apiBase={API_BASE}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </form>
  );
};

export default DoctorConsultationForm;
