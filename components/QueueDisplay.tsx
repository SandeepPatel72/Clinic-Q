import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Patient, PatientStatus, PatientCategory } from '../types';
import { Icons, TYPE_THEMES } from '../constants';

const API_BASE = '/api';

interface DisplayCardProps {
  patient: Patient;
  size: 'large' | 'medium';
  position?: number;
}

const formatTime = (timestamp: number | string | undefined): string => {
  if (!timestamp) return '--:--';
  const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp);
  if (isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const DisplayCard: React.FC<DisplayCardProps> = ({ patient, size, position }) => {
  const isLarge = size === 'large';
  const theme = TYPE_THEMES[patient.type] || 'bg-emerald-50 border-emerald-300';
  
  const getCategoryBadge = () => {
    const isPatient = patient.category === PatientCategory.PATIENT;
    const baseClasses = isLarge 
      ? "px-4 py-2 text-xl font-bold rounded-full uppercase whitespace-nowrap"
      : "px-3 py-1.5 text-base font-bold rounded-full uppercase whitespace-nowrap";
    return isPatient 
      ? <span className={`${baseClasses} bg-emerald-100 text-emerald-700`}>{patient.type}</span>
      : <span className={`${baseClasses} bg-orange-100 text-orange-700`}>{patient.type}</span>;
  };

  return (
    <div className="relative">
      {position && (
        <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-slate-700 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg z-10">
          {position}
        </div>
      )}
      <div className={`${theme} border-3 rounded-2xl ${isLarge ? 'p-8' : 'p-5 pt-8'} flex flex-col shadow-lg`}>
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0">
            {patient.gender === 'Male' 
              ? <Icons.MaleAvatar className={isLarge ? "w-28 h-28" : "w-20 h-20"} />
              : <Icons.FemaleAvatar className={isLarge ? "w-28 h-28" : "w-20 h-20"} />
            }
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className={`${isLarge ? 'text-4xl' : 'text-2xl'} font-bold text-slate-800 uppercase mb-3 leading-tight`}>
              {patient.name}
            </h2>
            
            <div className={`${isLarge ? 'text-2xl' : 'text-lg'} text-slate-600 mb-4`}>
              {patient.age} yrs  |  {patient.gender}  |  {patient.city}
            </div>
            
            <div className="flex items-center gap-4 flex-wrap">
              {getCategoryBadge()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface OpdStatusState {
  isPaused: boolean;
  pauseReason: string;
}

const QueueDisplay: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hospitalName, setHospitalName] = useState<string>('');
  const [appName, setAppName] = useState<string>('Clinic-Q');
  const [opdStatus, setOpdStatus] = useState<OpdStatusState>({ isPaused: false, pauseReason: '' });
  const [newOpdIds, setNewOpdIds] = useState<Set<string>>(new Set());
  const [exitingOpdCards, setExitingOpdCards] = useState<Patient[]>([]);
  const prevOpdIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  const fetchPatients = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/display/queue`);
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  }, []);

  const fetchOpdStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/opd-status`);
      if (response.ok) {
        const data = await response.json();
        setOpdStatus({ isPaused: data.isPaused, pauseReason: data.pauseReason });
      }
    } catch (error) {
      console.error('Error fetching OPD status:', error);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
    fetchOpdStatus();
    
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    newSocket.on('patient:add', fetchPatients);
    newSocket.on('patient:update', fetchPatients);
    newSocket.on('patient:delete', fetchPatients);
    newSocket.on('patient:reorder', fetchPatients);
    newSocket.on('opd:status-change', (data: OpdStatusState) => {
      setOpdStatus(data);
    });

    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      newSocket.disconnect();
      clearInterval(timeInterval);
    };
  }, [fetchPatients, fetchOpdStatus]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch('/api/metadata');
        if (response.ok) {
          const data = await response.json();
          setHospitalName(data.hospitalName || '');
          if (data.appName) setAppName(data.appName);
        }
      } catch (error) {
        console.error('Error fetching metadata:', error);
      }
    };
    fetchMetadata();
  }, []);

  // Set dynamic page title
  useEffect(() => {
    document.title = `${appName} - Queue Display`;
  }, [appName]);

  const opdPatients = patients
    .filter(p => p.status === PatientStatus.OPD)
    .sort((a, b) => (a.inTime || 0) - (b.inTime || 0))
    .slice(0, 2);

  useEffect(() => {
    const currentOpdIds = new Set(opdPatients.map(p => String(p.id)));
    const prevIds = prevOpdIdsRef.current;

    if (isFirstLoadRef.current && currentOpdIds.size > 0) {
      isFirstLoadRef.current = false;
      prevOpdIdsRef.current = currentOpdIds;
      return;
    }
    isFirstLoadRef.current = false;

    const added = new Set<string>();
    currentOpdIds.forEach(id => {
      if (!prevIds.has(id)) added.add(id);
    });

    const removedPatients: Patient[] = [];
    prevIds.forEach(id => {
      if (!currentOpdIds.has(id)) {
        const prev = patients.find(p => p.id === id);
        if (prev) removedPatients.push(prev);
      }
    });

    if (added.size > 0) {
      setNewOpdIds(added);
      setTimeout(() => setNewOpdIds(new Set()), 2000);
    }

    if (removedPatients.length > 0) {
      setExitingOpdCards(removedPatients);
      setTimeout(() => setExitingOpdCards([]), 800);
    }

    prevOpdIdsRef.current = currentOpdIds;
  }, [opdPatients]);

  const waitingPatients = patients
    .filter(p => p.status === PatientStatus.WAITING)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .slice(0, 3);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatClock = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex flex-col">
      <div className="bg-slate-800 text-white px-8 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Icons.Stethoscope />
          </div>
          <h1 className="text-3xl font-bold tracking-wide">{appName} Display | {hospitalName}</h1>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold font-mono">{formatClock(currentTime)}</div>
          <div className="text-lg text-slate-300">{formatDate(currentTime)}</div>
        </div>
      </div>

      <div className="flex-1 p-8 flex flex-col gap-8">
        <div className="bg-orange-500 rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-orange-600 px-8 py-2 flex items-center justify-between">
            <h2 className="text-3xl font-bold text-white uppercase tracking-wider">
              Currently in OPD
            </h2>
            <div className="bg-white text-orange-600 w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold">
              {opdPatients.length}
            </div>
          </div>
          
          <div className="p-6">
            {opdStatus.isPaused ? (
              <div className="bg-red-100 border-4 border-red-300 rounded-2xl p-12 text-center">
                <div className="relative w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                  <div className="radar-wave-red absolute w-24 h-24 rounded-full border-4 border-red-400"></div>
                  <div className="radar-wave-red absolute w-24 h-24 rounded-full border-4 border-red-400" style={{animationDelay: '0.5s'}}></div>
                  <div className="radar-wave-red absolute w-24 h-24 rounded-full border-4 border-red-400" style={{animationDelay: '1s'}}></div>
                  <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-4xl text-red-700 font-bold mb-4">OPD PAUSED</p>
                <p className="text-2xl text-red-600 font-medium">{opdStatus.pauseReason}</p>
              </div>
            ) : opdPatients.length === 0 ? (
              <div className="bg-emerald-100 border-4 border-emerald-300 rounded-2xl p-12 text-center">
                <div className="relative w-32 h-32 mx-auto mb-6 flex items-center justify-center">
                  <div className="radar-wave-green absolute w-24 h-24 rounded-full border-4 border-emerald-400"></div>
                  <div className="radar-wave-green absolute w-24 h-24 rounded-full border-4 border-emerald-400" style={{animationDelay: '0.5s'}}></div>
                  <div className="radar-wave-green absolute w-24 h-24 rounded-full border-4 border-emerald-400" style={{animationDelay: '1s'}}></div>
                  <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <p className="text-4xl text-emerald-700 font-bold mb-4">DOCTOR IS AVAILABLE</p>
                <p className="text-2xl text-emerald-600 font-medium">WAIT FOR YOUR TURN</p>
              </div>
            ) : (
              <div className={`grid gap-6 ${(opdPatients.length + exitingOpdCards.length) === 1 ? 'grid-cols-1 max-w-4xl mx-auto' : 'grid-cols-2'}`}>
                {exitingOpdCards.map((patient) => (
                  <div key={`exit-${patient.id}`} className="display-card-exit">
                    <DisplayCard patient={patient} size="large" />
                  </div>
                ))}
                {opdPatients.map((patient) => (
                  <div key={patient.id} className={newOpdIds.has(String(patient.id)) ? 'display-card-enter' : ''}>
                    <DisplayCard patient={patient} size="large" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {hospitalName && (
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 rounded-2xl shadow-lg overflow-hidden py-4">
            <div className="marquee-container flex">
              <div className="marquee-content flex shrink-0">
                <span className="text-3xl font-bold text-white tracking-wider mx-8">{hospitalName}</span>
                <span className="text-3xl text-white mx-4">★</span>
                <span className="text-3xl font-bold text-white tracking-wider mx-8">{hospitalName}</span>
                <span className="text-3xl text-white mx-4">★</span>
                <span className="text-3xl font-bold text-white tracking-wider mx-8">{hospitalName}</span>
                <span className="text-3xl text-white mx-4">★</span>
                <span className="text-3xl font-bold text-white tracking-wider mx-8">{hospitalName}</span>
                <span className="text-3xl text-white mx-4">★</span>
              </div>
              <div className="marquee-content flex shrink-0">
                <span className="text-3xl font-bold text-white tracking-wider mx-8">{hospitalName}</span>
                <span className="text-3xl text-white mx-4">★</span>
                <span className="text-3xl font-bold text-white tracking-wider mx-8">{hospitalName}</span>
                <span className="text-3xl text-white mx-4">★</span>
                <span className="text-3xl font-bold text-white tracking-wider mx-8">{hospitalName}</span>
                <span className="text-3xl text-white mx-4">★</span>
                <span className="text-3xl font-bold text-white tracking-wider mx-8">{hospitalName}</span>
                <span className="text-3xl text-white mx-4">★</span>
              </div>
            </div>
            <style>{`
              .marquee-container {
                animation: scroll 20s linear infinite;
              }
              @keyframes scroll {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              .radar-wave-red {
                animation: radarWaveRed 1.5s ease-out infinite;
              }
              .radar-wave-green {
                animation: radarWaveGreen 1.5s ease-out infinite;
              }
              @keyframes radarWaveRed {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(1.8); opacity: 0; }
              }
              @keyframes radarWaveGreen {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(1.8); opacity: 0; }
              }
              @keyframes displayPulseGlow {
                0% { transform: scale(0.85); opacity: 0; box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.6); }
                20% { transform: scale(1.04); opacity: 1; box-shadow: 0 0 30px 10px rgba(99, 102, 241, 0.5); }
                40% { transform: scale(0.98); box-shadow: 0 0 10px 4px rgba(99, 102, 241, 0.3); }
                60% { transform: scale(1.02); box-shadow: 0 0 25px 8px rgba(99, 102, 241, 0.4); }
                80% { transform: scale(0.99); box-shadow: 0 0 8px 2px rgba(99, 102, 241, 0.2); }
                100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 transparent; }
              }
              @keyframes displaySlideOut {
                0% { transform: scale(1) translateX(0); opacity: 1; }
                100% { transform: scale(0.8) translateX(-60px); opacity: 0; }
              }
              .display-card-enter {
                animation: displayPulseGlow 1.8s ease-out forwards;
                border-radius: 1rem;
              }
              .display-card-exit {
                animation: displaySlideOut 0.7s ease-in forwards;
              }
            `}</style>
          </div>
        )}

        <div className="flex-1 bg-teal-500 rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-teal-600 px-8 py-2 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="17 11 12 6 7 11"/>
                <polyline points="17 18 12 13 7 18"/>
              </svg>
              <svg className="w-10 h-10 text-white -ml-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="17 11 12 6 7 11"/>
                <polyline points="17 18 12 13 7 18"/>
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white uppercase tracking-wider">
              Next in Queue
            </h2>
          </div>
          
          <div className="p-6">
            {waitingPatients.length === 0 ? (
              <div className="bg-teal-100 rounded-2xl p-12 text-center">
                <p className="text-2xl text-teal-600 font-semibold">No patients waiting</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-6">
                {waitingPatients.map((patient, index) => (
                  <DisplayCard 
                    key={patient.id} 
                    patient={patient} 
                    size="medium" 
                    position={index + 1}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 text-slate-400 text-center py-3 text-lg">
        Please wait for your number to be called
      </div>
    </div>
  );
};

export default QueueDisplay;
