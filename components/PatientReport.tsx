import React, { useState, useEffect } from 'react';
import { Patient, PatientCategory } from '../types';
import { Icons } from '../constants';
import PatientHistoryModal from './PatientHistoryModal';

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

interface PatientReportProps {
  apiBase: string;
}

const PatientReport: React.FC<PatientReportProps> = ({ apiBase }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchMobile, setSearchMobile] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchName) params.append('name', searchName);
      if (searchCity) params.append('city', searchCity);
      if (searchMobile) params.append('mobile', searchMobile);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const res = await authFetch(`${apiBase}/patients/report?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReport();
  };

  const handleClear = () => {
    setSearchName('');
    setSearchCity('');
    setSearchMobile('');
    setStartDate('');
    setEndDate('');
    setTimeout(() => fetchReport(), 0);
  };

  const formatDate = (dateStr: string | number | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return '-';
    }
  };

  const formatTime = (dateStr: string | number | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return '-';
    }
  };

  const getCategoryBadge = (category: PatientCategory) => {
    return category === PatientCategory.PATIENT 
      ? <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full uppercase">Patient</span>
      : <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700 rounded-full uppercase">Visitor</span>;
  };

  const exportToCSV = () => {
    if (patients.length === 0) return;
    
    const headers = ['Queue#', 'Name', 'Age', 'Gender', 'City', 'Mobile', 'Category', 'Date', 'In Time', 'BP', 'Temp', 'Pulse', 'Weight', 'SpO2', 'Complaints', 'Diagnosis', 'Prescription', 'Advice', 'Follow-up'];
    const rows = patients.map(p => [
      p.queueId || '',
      p.name || '',
      p.age || '',
      p.gender || '',
      p.city || '',
      p.mobile || '',
      p.category || '',
      formatDate(p.createdAt),
      formatTime(p.inTime),
      p.bp || '',
      p.temperature || '',
      p.pulse || '',
      p.weight || '',
      p.spo2 || '',
      (p.complaints || []).join('; '),
      (p.diagnosis || []).join('; '),
      (p.prescription || []).map((rx: any) => `${rx.type} ${rx.name} ${rx.dose} ${rx.days}d ${rx.instructions}`).join('; '),
      p.advice || '',
      p.followUpDate || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patient_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-md overflow-hidden">
      {/* Search Filters */}
      <div className="bg-slate-50 border-b border-slate-200 p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Name</label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Search by name..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">City</label>
            <input
              type="text"
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              placeholder="Search by city..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Mobile</label>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={searchMobile}
              onChange={(e) => setSearchMobile(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Search by mobile..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Icons.Search className="w-4 h-4" /> Search
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-300 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={exportToCSV}
              disabled={patients.length === 0}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icons.Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </form>
      </div>

      {/* Stats Badges Row */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[12px] font-bold text-slate-800">Total Patient : {patients.length}</span>
        </div>
        <div className="flex items-center gap-3 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">{patients.filter(p => p.category === PatientCategory.PATIENT).length} PATIENTS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">{patients.filter(p => p.category === PatientCategory.VISITOR).length} VISITORS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">{patients.filter(p => p.gender === 'Male').length} MALE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">{patients.filter(p => p.gender === 'Female').length} FEMALE</span>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Icons.Users className="w-12 h-12 mb-2" />
            <p className="text-sm font-medium">No patients found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-100 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wide">#</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wide">Age</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wide">Gender</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wide">City</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wide">Mobile</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wide">Category</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wide">In Time</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wide">History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((patient, index) => (
                <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-bold text-slate-800">#{patient.queueId}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800">{patient.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{patient.age} yrs</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{patient.gender}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{patient.city}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{patient.mobile || '-'}</td>
                  <td className="px-4 py-3">{getCategoryBadge(patient.category)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDate(patient.createdAt)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatTime(patient.inTime)}</td>
                  <td className="px-4 py-3 text-center">
                    {patient.patientId ? (
                      <button
                        onClick={() => setSelectedPatientId(patient.patientId!)}
                        className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                        title="View Patient History"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      </button>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer with count */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-slate-500">Showing {patients.length} records</span>
      </div>

      {/* Patient History Modal */}
      {selectedPatientId && (
        <PatientHistoryModal
          patientId={selectedPatientId}
          apiBase={apiBase}
          onClose={() => setSelectedPatientId(null)}
        />
      )}
    </div>
  );
};

export default PatientReport;
