import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Patient, PatientStatus, PatientFormData, AppView, ChatMessage, PatientCategory, PatientType } from './types';
import QueueColumn from './components/QueueColumn';
import PatientForm from './components/PatientForm';
import DoctorConsultationForm from './components/DoctorConsultationForm';
import ChatModal from './components/ChatModal';
import Login from './components/Login';
import PatientReport from './components/PatientReport';
import Calendar from './components/Calendar';
import Statistics from './components/Statistics';
import { Icons } from './constants';

const API_BASE = '/api';
const LOCAL_STORAGE_KEY = 'clinicflow_patients_fallback';
const AUTH_TOKEN_KEY = 'clinicflow_authToken';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('clinicflow_isLoggedIn');
    localStorage.removeItem('clinicflow_activeView');
    localStorage.removeItem(AUTH_TOKEN_KEY);
    window.dispatchEvent(new Event('auth:logout'));
  }
  return res;
}

type PageView = 'DASHBOARD' | 'REPORT' | 'CALENDAR' | 'INFO';

const App: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [nextQueueId, setNextQueueId] = useState(1);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [activeView, setActiveView] = useState<AppView>(() => {
    const saved = localStorage.getItem('clinicflow_activeView');
    return (saved === 'OPERATOR' || saved === 'DOCTOR') ? saved : 'LOGIN';
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('clinicflow_isLoggedIn') === 'true';
  });
  const [activeConsultationId, setActiveConsultationId] = useState<string | null>(null);
  const [activeChatPatientId, setActiveChatPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageView>('DASHBOARD');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDoctorCallAlert, setShowDoctorCallAlert] = useState(false);
  const [showResetModal, setShowResetModal] = useState<'confirm' | 'success' | 'error' | null>(null);
  const [resetError, setResetError] = useState('');
  const [isCallingOperator, setIsCallingOperator] = useState(false);
  const [callOperatorSuccess, setCallOperatorSuccess] = useState(false);
  const [hasEventsToday, setHasEventsToday] = useState(false);
  const [opdStatus, setOpdStatus] = useState<{isPaused: boolean; pauseReason: string}>({ isPaused: false, pauseReason: '' });
  const [opdStatusOptions, setOpdStatusOptions] = useState<string[]>([]);
  const [appName, setAppName] = useState('Clinic-Q');
  const [dataResetEnabled, setDataResetEnabled] = useState(false);
  
  // Resizable column widths (percentages)
  const defaultWidths = { left: 25, center: 50, right: 25 };
  const [columnWidths, setColumnWidths] = useState<{left: number; center: number; right: number}>(() => {
    const saved = localStorage.getItem('clinicflow_columnWidths');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate: must have all fields as numbers, sum to ~100, within limits
        if (typeof parsed.left === 'number' && typeof parsed.center === 'number' && typeof parsed.right === 'number' &&
            !isNaN(parsed.left) && !isNaN(parsed.center) && !isNaN(parsed.right) &&
            parsed.left >= 15 && parsed.left <= 60 &&
            parsed.center >= 15 && parsed.center <= 60 &&
            parsed.right >= 15 && parsed.right <= 60 &&
            Math.abs(parsed.left + parsed.center + parsed.right - 100) < 1) {
          return { left: parsed.left, center: parsed.center, right: parsed.right };
        }
      } catch {
        // Invalid JSON, fall through to default
      }
    }
    return defaultWidths;
  });
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const alertSoundRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play alert sound using Web Audio API
  const playAlertSound = useCallback(() => {
    try {
      // Create AudioContext if not exists
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      // Resume context if suspended (required by browsers)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      
      // Create oscillator for a pleasant two-tone alert
      const playTone = (freq: number, startTime: number, duration: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        // Smooth envelope
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + duration - 0.05);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      // Play a pleasant chime pattern (3 ascending tones)
      playTone(523.25, now, 0.15);        // C5
      playTone(659.25, now + 0.15, 0.15); // E5
      playTone(783.99, now + 0.30, 0.25); // G5
      
      // Repeat the pattern after a short pause
      playTone(523.25, now + 0.7, 0.15);  // C5
      playTone(659.25, now + 0.85, 0.15); // E5
      playTone(783.99, now + 1.0, 0.25);  // G5

    } catch (e) {
      console.log('Web Audio API not supported, trying fallback audio');
      // Fallback to HTML audio element
      if (alertSoundRef.current) {
        alertSoundRef.current.currentTime = 0;
        alertSoundRef.current.play().catch(err => console.log('Audio play failed:', err));
      }
    }
  }, []);

  // Persistence Helper
  const saveToLocalStorage = (data: Patient[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  };

  // Fetch next queue ID from server (for today)
  const fetchNextQueueId = async () => {
    try {
      const res = await authFetch(`${API_BASE}/next-queue-id`);
      if (res.ok) {
        const data = await res.json();
        setNextQueueId(data.nextQueueId);
      }
    } catch (err) {
      console.warn("Could not fetch next queue ID", err);
    }
  };

  // Check if there are any events for today
  const checkTodayEvents = async () => {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const res = await authFetch(`${API_BASE}/events?year=${year}&month=${month}`);
      if (res.ok) {
        const events = await res.json();
        const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const todayEvents = events.filter((e: any) => e.eventDate === todayStr);
        setHasEventsToday(todayEvents.length > 0);
      }
    } catch (err) {
      console.warn("Could not check today's events", err);
    }
  };

  // Initial Fetch: Try Backend -> Fallback to LocalStorage
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await authFetch(`${API_BASE}/patients?t=${Date.now()}`);
        if (res.status === 401) {
          localStorage.removeItem('clinicflow_isLoggedIn');
          localStorage.removeItem('clinicflow_activeView');
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setIsLoggedIn(false);
          setActiveView('LOGIN');
          setActiveConsultationId(null);
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error('Backend responded with error');
        
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid data format');
        
        setPatients(data);
        setIsBackendOnline(true);
        
        // Fetch next queue ID for today from server
        await fetchNextQueueId();
        
        // Fetch OPD status options and current status
        try {
          const [optionsRes, statusRes] = await Promise.all([
            fetch(`${API_BASE}/opd-status-options`),
            fetch(`${API_BASE}/opd-status`)
          ]);
          if (optionsRes.ok) {
            const { options } = await optionsRes.json();
            setOpdStatusOptions(options || []);
          }
          if (statusRes.ok) {
            const status = await statusRes.json();
            setOpdStatus(status);
          }
        } catch (opdErr) {
          console.warn('Could not fetch OPD status:', opdErr);
        }
        
        // Fetch app metadata (appName)
        try {
          const metaRes = await fetch('/api/metadata');
          if (metaRes.ok) {
            const meta = await metaRes.json();
            if (meta.appName) setAppName(meta.appName);
            if (meta.data_reset) setDataResetEnabled(meta.data_reset === 'enable');
          }
        } catch (metaErr) {
          console.warn('Could not fetch metadata:', metaErr);
        }
      } catch (err) {
        console.warn("Backend unreachable. Falling back to local storage.", err);
        setIsBackendOnline(false);
        
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) {
          const parsed = JSON.parse(localData);
          // Filter to today's patients only for local storage fallback
          const today = new Date().toDateString();
          const todayPatients = parsed.filter((p: Patient) => 
            new Date(p.createdAt).toDateString() === today
          );
          setPatients(todayPatients);
          const patientEntries = todayPatients.filter((p: Patient) => p.category === PatientCategory.PATIENT);
          const maxId = patientEntries.length > 0 ? Math.max(...patientEntries.map((p: Patient) => p.queueId)) : 0;
          setNextQueueId(maxId + 1);
        }
      } finally {
        setLoading(false);
      }
    };
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn]);

  // Socket.IO connection for real-time sync
  useEffect(() => {
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('patient:add', () => {
      console.log('Socket: patient added, refreshing...');
      refreshPatients();
    });

    socket.on('patient:update', () => {
      console.log('Socket: patient updated, refreshing...');
      refreshPatients();
    });

    socket.on('patient:delete', () => {
      console.log('Socket: patient deleted, refreshing...');
      refreshPatients();
    });

    socket.on('patient:reorder', () => {
      console.log('Socket: patient reordered, refreshing...');
      refreshPatients();
    });

    socket.on('message:new', ({ patientId, message }) => {
      console.log('Socket: new message for patient', patientId);
      setPatients(prev => prev.map(p => {
        if (p.id !== patientId) return p;
        const messageExists = p.messages.some(m => m.id === message.id);
        if (messageExists) return p;
        return { 
          ...p, 
          messages: [...p.messages, message],
          hasUnreadAlert: true 
        };
      }));
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Doctor calls operator - show alert only for OPERATOR users
    socket.on('doctor:call-operator', () => {
      console.log('Socket: Doctor is calling operator!');
      // Only show alert if user is logged in as OPERATOR
      setShowDoctorCallAlert(true);
      // Play notification sound using Web Audio API
      playAlertSound();
    });

    // Event calendar updates - refresh today's events indicator
    socket.on('event:add', () => {
      console.log('Socket: event added, checking today events...');
      checkTodayEvents();
    });
    socket.on('event:update', () => {
      console.log('Socket: event updated, checking today events...');
      checkTodayEvents();
    });
    // OPD status change - sync across all clients
    socket.on('opd:status-change', (status: {isPaused: boolean; pauseReason: string}) => {
      console.log('Socket: OPD status changed:', status);
      setOpdStatus(status);
    });

    socket.on('event:delete', () => {
      console.log('Socket: event deleted, checking today events...');
      checkTodayEvents();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Save column widths to localStorage
  useEffect(() => {
    localStorage.setItem('clinicflow_columnWidths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Handle column resize
  const handleResizeStart = useCallback((divider: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(divider);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;
      const percentage = (mouseX / containerWidth) * 100;
      
      setColumnWidths(prev => {
        const minWidth = 15; // Minimum 15% for any column
        const maxWidth = 60; // Maximum 60% for any column
        
        if (isResizing === 'left') {
          // Moving left divider: adjusts left and center columns
          let newLeft = Math.max(minWidth, Math.min(maxWidth, percentage));
          let newCenter = 100 - newLeft - prev.right;
          
          // Ensure center column has minimum width
          if (newCenter < minWidth) {
            newCenter = minWidth;
            newLeft = 100 - newCenter - prev.right;
          }
          
          return { left: newLeft, center: newCenter, right: prev.right };
        } else {
          // Moving right divider: adjusts center and right columns
          let newRight = Math.max(minWidth, Math.min(maxWidth, 100 - percentage));
          let newCenter = 100 - prev.left - newRight;
          
          // Ensure center column has minimum width
          if (newCenter < minWidth) {
            newCenter = minWidth;
            newRight = 100 - prev.left - newCenter;
          }
          
          return { left: prev.left, center: newCenter, right: newRight };
        }
      });
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Reset column widths to default
  const resetColumnWidths = useCallback(() => {
    setColumnWidths({ left: 25, center: 50, right: 25 });
  }, []);

  // Refresh patients from server
  const refreshPatients = async () => {
    try {
      const res = await authFetch(`${API_BASE}/patients?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (err) {
      console.warn('Failed to refresh patients:', err);
    }
  };

  const addPatient = useCallback(async (formData: PatientFormData) => {
    const isVisitor = formData.category === PatientCategory.VISITOR;
    const now = Date.now();
    const newPatient: Patient = {
      ...formData,
      id: crypto.randomUUID(),
      queueId: isVisitor ? 0 : nextQueueId,
      status: PatientStatus.WAITING,
      createdAt: now,
      inTime: now,
      messages: [],
      hasUnreadAlert: false,
    };

    try {
      if (isBackendOnline) {
        const res = await authFetch(`${API_BASE}/patients`, {
          method: 'POST',
          body: JSON.stringify(newPatient)
        });
        const responseData = await res.json();
        if (!res.ok) {
          throw new Error(responseData.error || 'Failed to save to database');
        }
        // Get the server-assigned queue ID
        if (responseData.queueId) {
          newPatient.queueId = responseData.queueId;
        }
      }
    } catch (err) {
      console.error("API call failed, saving locally only.", err);
    } finally {
      const updated = [...patients, newPatient];
      setPatients(updated);
      saveToLocalStorage(updated);
      // Fetch updated next queue ID from server
      if (isBackendOnline && !isVisitor) {
        fetchNextQueueId();
      } else if (!isVisitor) {
        setNextQueueId(prev => prev + 1);
      }
    }
  }, [nextQueueId, patients, isBackendOnline]);

  const updatePatient = useCallback(async (id: string, formData: Partial<Patient>) => {
    try {
      if (isBackendOnline) {
        await authFetch(`${API_BASE}/patients/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData)
        });
      }
    } catch (err) {
      console.error("API update failed, updating locally.");
    } finally {
      const updated = patients.map(p => p.id === id ? { ...p, ...formData } : p);
      setPatients(updated);
      saveToLocalStorage(updated);
      setEditingPatient(null);
    }
  }, [patients, isBackendOnline]);

  const addMessage = useCallback(async (patientId: string, text: string) => {
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      text,
      sender: activeView,
      timestamp: Date.now(),
    };

    try {
      if (isBackendOnline) {
        await authFetch(`${API_BASE}/patients/${patientId}/messages`, {
          method: 'POST',
          body: JSON.stringify(newMessage)
        });
      }
    } catch (err) {
      console.error("API message failed, saving locally.");
    } finally {
      const updated = patients.map(p => 
        p.id === patientId ? { 
          ...p, 
          messages: [...p.messages, newMessage],
          hasUnreadAlert: true 
        } : p
      );
      setPatients(updated);
      saveToLocalStorage(updated);
    }
  }, [activeView, patients, isBackendOnline]);

  const markChatRead = useCallback(async (patientId: string) => {
    try {
      if (isBackendOnline) {
        await authFetch(`${API_BASE}/patients/${patientId}`, {
          method: 'PATCH',
          body: JSON.stringify({ hasUnreadAlert: false })
        });
      }
    } catch (err) {
    } finally {
      const updated = patients.map(p => p.id === patientId ? { ...p, hasUnreadAlert: false } : p);
      setPatients(updated);
      saveToLocalStorage(updated);
    }
  }, [patients, isBackendOnline]);

  const updatePatientStatus = useCallback(async (id: string, newStatus: PatientStatus) => {
    const patient = patients.find(p => p.id === id);
    if (!patient || patient.status === newStatus) return;
    
    if (newStatus === PatientStatus.OPD && opdStatus.isPaused) {
      console.log('Cannot move patient to OPD - OPD is paused');
      return;
    }

    const updates: any = { status: newStatus };
    if (newStatus === PatientStatus.COMPLETED) updates.outTime = Date.now();
    if (newStatus === PatientStatus.WAITING || newStatus === PatientStatus.OPD) updates.outTime = null;

    try {
      if (isBackendOnline) {
        // Use dedicated status endpoint for proper sort_order handling
        await authFetch(`${API_BASE}/patients/${id}/status`, {
          method: 'POST',
          body: JSON.stringify({ status: newStatus, outTime: updates.outTime })
        });
      }
    } catch (err) {
      console.error("API status update failed, saving locally.");
    } finally {
      const updated = patients.map(p => p.id === id ? { ...p, ...updates } : p);
      setPatients(updated);
      saveToLocalStorage(updated);
      if (activeConsultationId === id && newStatus !== PatientStatus.OPD) {
        setActiveConsultationId(null);
      }
    }
  }, [patients, activeConsultationId, isBackendOnline, opdStatus.isPaused]);

  const reorderPatient = useCallback(async (id: string, direction: 'up' | 'down') => {
    const patient = patients.find(p => p.id === id);
    if (!patient) return;
    
    // Cannot reorder FAMILY/RELATIVE types
    if (patient.type === PatientType.FAMILY || patient.type === PatientType.RELATIVE) return;
    
    try {
      if (isBackendOnline) {
        await authFetch(`${API_BASE}/patients/${id}/reorder`, {
          method: 'POST',
          body: JSON.stringify({ direction })
        });
      }
    } catch (err) {
      console.error("Reorder failed:", err);
    }
  }, [patients, isBackendOnline]);

  const deletePatient = useCallback(async (id: string) => {
    try {
      if (isBackendOnline) {
        await authFetch(`${API_BASE}/patients/${id}`, { method: 'DELETE' });
      }
    } catch (err) {
      console.error("API delete failed, removing locally.");
    } finally {
      const updated = patients.filter(p => p.id !== id);
      setPatients(updated);
      saveToLocalStorage(updated);
      if (activeConsultationId === id) setActiveConsultationId(null);
      if (activeChatPatientId === id) setActiveChatPatientId(null);
    }
  }, [patients, activeConsultationId, activeChatPatientId, isBackendOnline]);

  const handleSaveConsultation = useCallback(async (id: string, consultationData: Record<string, any>) => {
    const updates = { ...consultationData, status: PatientStatus.COMPLETED, outTime: Date.now() };
    try {
      if (isBackendOnline) {
        await authFetch(`${API_BASE}/patients/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(updates)
        });
      }
    } catch (err) {
      console.error("API finalize failed, saving locally.");
    } finally {
      const updated = patients.map(p => p.id === id ? { ...p, ...updates } : p);
      setPatients(updated);
      saveToLocalStorage(updated);
      setActiveConsultationId(null);
    }
  }, [patients, isBackendOnline]);

  // Doctor calls operator - sends alert via socket
  const callOperator = useCallback(async () => {
    if (isCallingOperator) return; // Prevent double-press during cooldown
    
    setIsCallingOperator(true);
    try {
      await authFetch(`${API_BASE}/call-operator`, { method: 'POST' });
      console.log('Called operator successfully');
      
      // Show success flash
      setCallOperatorSuccess(true);
      setTimeout(() => setCallOperatorSuccess(false), 500);
    } catch (err) {
      console.error('Failed to call operator:', err);
    }
    
    // 2-second cooldown
    setTimeout(() => setIsCallingOperator(false), 2000);
  }, [isCallingOperator]);

  // Update OPD status (pause/resume)
  const updateOpdStatus = useCallback(async (isPaused: boolean, pauseReason: string) => {
    try {
      const res = await authFetch(`${API_BASE}/opd-status`, {
        method: 'POST',
        body: JSON.stringify({ isPaused, pauseReason })
      });
      if (res.ok) {
        const status = await res.json();
        setOpdStatus({ isPaused: status.isPaused, pauseReason: status.pauseReason });
        console.log('OPD status updated:', status);
      }
    } catch (err) {
      console.error('Failed to update OPD status:', err);
    }
  }, []);

  const movePatient = useCallback((id: string, direction: 'up' | 'down') => {
    if (isBackendOnline) {
      // Call backend to update sort_order
      reorderPatient(id, direction);
    } else {
      // Local fallback when backend is offline
      setPatients(prev => {
        const patient = prev.find(p => p.id === id);
        if (!patient || patient.status !== PatientStatus.WAITING) return prev;
        // Skip FAMILY/RELATIVE types
        if (patient.type === PatientType.FAMILY || patient.type === PatientType.RELATIVE) return prev;
        
        const reorderablePatients = prev
          .filter(p => p.status === PatientStatus.WAITING && p.type !== PatientType.FAMILY && p.type !== PatientType.RELATIVE)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        
        const index = reorderablePatients.findIndex(p => p.id === id);
        if (index === -1) return prev;
        if (direction === 'up' && index === 0) return prev;
        if (direction === 'down' && index === reorderablePatients.length - 1) return prev;
        
        // Swap sort orders
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const targetPatient = reorderablePatients[targetIndex];
        
        const newPatients = prev.map(p => {
          if (p.id === id) return { ...p, sortOrder: targetPatient.sortOrder };
          if (p.id === targetPatient.id) return { ...p, sortOrder: patient.sortOrder };
          return p;
        });
        
        saveToLocalStorage(newPatients);
        return newPatients;
      });
    }
  }, [reorderPatient, isBackendOnline]);

  const handleReorder = useCallback(async (sourceId: string, targetId: string) => {
    if (isBackendOnline) {
      try {
        const res = await authFetch(`${API_BASE}/patients/${sourceId}/move-to`, {
          method: 'POST',
          body: JSON.stringify({ targetId })
        });
        if (res.ok) {
          await refreshPatients();
        }
      } catch (err) {
        console.error('Drag-and-drop reorder failed:', err);
      }
    } else {
      // Local fallback
      setPatients(prev => {
        const sourceIdx = prev.findIndex(p => p.id === sourceId);
        const targetIdx = prev.findIndex(p => p.id === targetId);
        if (sourceIdx === -1 || targetIdx === -1) return prev;
        const sourcePatient = prev[sourceIdx];
        const targetPatient = prev[targetIdx];
        
        if (sourcePatient.status !== PatientStatus.WAITING) return prev;
        // Skip if source or target is FAMILY/RELATIVE
        if (sourcePatient.type === PatientType.FAMILY || sourcePatient.type === PatientType.RELATIVE) return prev;
        if (targetPatient.type === PatientType.FAMILY || targetPatient.type === PatientType.RELATIVE) return prev;
        
        // Swap sort orders for local reordering
        const newPatients = prev.map(p => {
          if (p.id === sourceId) return { ...p, sortOrder: targetPatient.sortOrder };
          if (p.id === targetId) return { ...p, sortOrder: sourcePatient.sortOrder };
          return p;
        });
        saveToLocalStorage(newPatients);
        return newPatients;
      });
    }
  }, [isBackendOnline, refreshPatients]);

  // Helper function to check if patient matches search term
  const matchesSearch = useCallback((p: Patient, term: string) => {
    if (!term.trim()) return true;
    const search = term.toLowerCase();
    return (
      p.name.toLowerCase().includes(search) ||
      (p.mobile && p.mobile.toLowerCase().includes(search)) ||
      (p.city && p.city.toLowerCase().includes(search))
    );
  }, []);

  const waitingPatients = useMemo(() => {
    const filtered = patients.filter(p => p.status === PatientStatus.WAITING && matchesSearch(p, searchTerm));
    return [...filtered].sort((a, b) => {
      const aPinned = a.type === PatientType.FAMILY || a.type === PatientType.RELATIVE;
      const bPinned = b.type === PatientType.FAMILY || b.type === PatientType.RELATIVE;
      // Pinned types (FAMILY/RELATIVE) always at top, sorted by creation time
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (aPinned && bPinned) return (a.createdAt || 0) - (b.createdAt || 0);
      // Non-pinned types sorted by sortOrder (lower = higher priority)
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  }, [patients, searchTerm, matchesSearch]);

  // OPD queue: latest moved to OPD at top (by inTime or createdAt DESC)
  const opdPatients = useMemo(() => 
    patients
      .filter(p => p.status === PatientStatus.OPD && matchesSearch(p, searchTerm))
      .sort((a, b) => (b.inTime || b.createdAt || 0) - (a.inTime || a.createdAt || 0)), 
    [patients, searchTerm, matchesSearch]
  );
  const completedPatients = useMemo(() => {
    const toTimestamp = (val: any): number => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return new Date(val).getTime() || 0;
      return 0;
    };
    return patients
      .filter(p => p.status === PatientStatus.COMPLETED && matchesSearch(p, searchTerm))
      .sort((a, b) => {
        const aTime = toTimestamp(a.outTime) || toTimestamp(a.createdAt);
        const bTime = toTimestamp(b.outTime) || toTimestamp(b.createdAt);
        return bTime - aTime;
      });
  }, [patients, searchTerm, matchesSearch]);

  const handleEditPatient = (p: Patient) => setEditingPatient(p);
  const handleDoctorClick = (id: string) => setActiveConsultationId(id);

  useEffect(() => {
    if (activeView !== 'DOCTOR' || currentPage !== 'DASHBOARD') return;
    const handleF2 = (e: KeyboardEvent) => {
      if (e.key === 'F2' && opdPatients.length > 0) {
        e.preventDefault();
        setActiveConsultationId(opdPatients[0].id);
      }
    };
    window.addEventListener('keydown', handleF2);
    return () => window.removeEventListener('keydown', handleF2);
  }, [activeView, currentPage, opdPatients]);

  const openChat = useCallback((id: string) => {
    setActiveChatPatientId(id);
    markChatRead(id);
  }, [markChatRead]);

  const handleLogin = (role: AppView) => {
    setActiveView(role);
    setIsLoggedIn(true);
    
    // Persist login state to localStorage
    localStorage.setItem('clinicflow_isLoggedIn', 'true');
    localStorage.setItem('clinicflow_activeView', role);
    
    // Check for today's events to show notification dot on Calendar menu
    checkTodayEvents();
    
    // Unlock AudioContext on user gesture (login click)
    // This ensures alert sounds can play later
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    } catch (e) {
      console.log('AudioContext initialization failed:', e);
    }
  };

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setActiveView('LOGIN');
    setActiveConsultationId(null);
    setIsBackendOnline(false);
    
    localStorage.removeItem('clinicflow_isLoggedIn');
    localStorage.removeItem('clinicflow_activeView');
    localStorage.removeItem('clinicflow_authToken');
  }, []);

  useEffect(() => {
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [handleLogout]);

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-indigo-700 text-white flex-col gap-4">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
        <p className="font-black uppercase tracking-widest text-sm">Synchronizing Clinic Data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] font-sans overflow-hidden">
      <header className="bg-[#4338ca] text-white p-3 px-4 shadow-md flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">
            {appName}
          </h1>
          <div className="text-[10px] font-black bg-[#1e1b4b]/50 px-2.5 py-1 rounded-lg border border-indigo-400/30 uppercase tracking-widest text-indigo-100">
            {activeView} PANEL
          </div>
          {/* Navigation Menu */}
          <nav className="flex items-center gap-1 bg-[#1e1b4b]/30 rounded-lg p-1 border border-indigo-400/20">
            <button
              onClick={() => setCurrentPage('DASHBOARD')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                currentPage === 'DASHBOARD' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-indigo-100 hover:bg-white/10'
              }`}
              title="Home"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span className="text-[13px] font-bold uppercase tracking-wide">Home</span>
            </button>
            <button
              onClick={() => setCurrentPage('REPORT')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                currentPage === 'REPORT' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-indigo-100 hover:bg-white/10'
              }`}
              title="Report"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              <span className="text-[13px] font-bold uppercase tracking-wide">Report</span>
            </button>
            <button
              onClick={() => setCurrentPage('CALENDAR')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 relative ${
                currentPage === 'CALENDAR' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-indigo-100 hover:bg-white/10'
              }`}
              title="Event"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span className="text-[13px] font-bold uppercase tracking-wide">Event</span>
              {hasEventsToday && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentPage('INFO')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                currentPage === 'INFO' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-indigo-100 hover:bg-white/10'
              }`}
              title="Info"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span className="text-[13px] font-bold uppercase tracking-wide">Info</span>
            </button>
            <button
              onClick={() => window.open('/display', '_blank')}
              className="px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 text-indigo-100 hover:bg-white/10"
              title="Open Queue Display for waiting room TV"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              <span className="text-[13px] font-bold uppercase tracking-wide">Display</span>
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {/* Global Search - Only on Dashboard */}
          {currentPage === 'DASHBOARD' && (
            <div className="relative flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-200/70 pointer-events-none"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                type="text"
                placeholder="Search name, mobile, city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/10 border border-indigo-400/30 rounded-lg px-3 py-1.5 pl-8 text-[11px] text-white placeholder-indigo-200/70 focus:outline-none focus:ring-2 focus:ring-white/30 w-52"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-200/70 hover:text-white"
                >
                  <Icons.X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          {/* Reset Columns Button - Only on Dashboard when columns are modified */}
          {currentPage === 'DASHBOARD' && (columnWidths.left !== 25 || columnWidths.center !== 50 || columnWidths.right !== 25) && (
            <button
              onClick={resetColumnWidths}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide text-indigo-200 hover:text-white hover:bg-white/10 transition-all border border-indigo-400/30"
              title="Reset column widths to default"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Reset
            </button>
          )}
          {/* Compact Stats Badge */}
          <div className="flex items-center gap-3 bg-[#1e1b4b]/40 px-3 py-1.5 rounded-full border border-indigo-400/20">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-[11px] font-bold text-white uppercase tracking-wide">{patients.filter(p => p.category === PatientCategory.PATIENT).length} PATIENTS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
              <span className="text-[11px] font-bold text-white uppercase tracking-wide">{patients.filter(p => p.category === PatientCategory.VISITOR).length} VISITOR</span>
            </div>
          </div>
          {/* Call Operator Button - Only for DOCTOR */}
          {activeView === 'DOCTOR' && (
            <div className="relative group">
              <button
                onClick={callOperator}
                disabled={isCallingOperator}
                className={`
                  w-9 h-9 rounded-lg flex items-center justify-center
                  transition-all duration-200 shadow-lg
                  ${callOperatorSuccess 
                    ? 'bg-emerald-500 scale-110' 
                    : isCallingOperator 
                      ? 'bg-amber-400 cursor-not-allowed opacity-70' 
                      : 'bg-amber-500 hover:bg-amber-400 hover:scale-105 active:scale-95'
                  }
                `}
                style={{ animation: callOperatorSuccess ? 'pulse 0.3s ease-out' : 'none' }}
              >
                <Icons.Phone className="w-5 h-5 text-white" />
              </button>
              {/* Success notification - positioned below button */}
              {callOperatorSuccess && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-emerald-600 text-white text-xs rounded whitespace-nowrap z-50 animate-pulse">
                  Sent!
                </div>
              )}
              {/* Tooltip - positioned below button to avoid getting cut off at page top */}
              {!callOperatorSuccess && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  {isCallingOperator ? 'Calling...' : 'Call Operator'}
                </div>
              )}
            </div>
          )}
          <button 
            onClick={handleLogout}
            className="bg-[#e11d48] hover:bg-[#be123c] text-white px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex flex-1 p-3 overflow-hidden">
        {currentPage === 'DASHBOARD' ? (
          <div ref={containerRef} className="flex w-full h-full relative" style={{ userSelect: isResizing ? 'none' : 'auto' }}>
            {/* LEFT COLUMN: WAITING QUEUE */}
            <section className="h-full overflow-hidden flex-shrink-0" style={{ flexBasis: `${columnWidths.left}%`, width: `${columnWidths.left}%` }}>
              <QueueColumn 
                title="WAITING QUEUE" 
                patients={waitingPatients}
                onUpdateStatus={updatePatientStatus}
                onDelete={activeView === 'OPERATOR' ? deletePatient : undefined}
                onEdit={activeView === 'OPERATOR' ? handleEditPatient : undefined}
                onMove={movePatient}
                onReorder={handleReorder}
                onOpenChat={openChat}
                status={PatientStatus.WAITING}
                colorClass="bg-[#f0f9ff] border-[#bae6fd]"
                headerColor="bg-[#2563eb]"
                isSortable
                activeView={activeView}
              />
            </section>

            {/* LEFT RESIZE DIVIDER */}
            <div 
              className="w-2 flex-shrink-0 cursor-col-resize group relative z-10 flex items-center justify-center"
              onMouseDown={handleResizeStart('left')}
            >
              <div className={`w-1 h-full transition-colors ${isResizing === 'left' ? 'bg-indigo-500' : 'bg-gray-200 group-hover:bg-indigo-400'}`}></div>
              <div className="absolute top-1/2 -translate-y-1/2 w-4 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex flex-col gap-0.5">
                  <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
                  <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
                  <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
                </div>
              </div>
            </div>

            {/* CENTER COLUMN: OPD QUEUE + FORM */}
            <section className="flex flex-col gap-3 h-full overflow-hidden flex-shrink-0" style={{ flexBasis: `${columnWidths.center}%`, width: `${columnWidths.center}%` }}>
              {/* TOP: OPD QUEUE */}
              <div className="h-1/3 min-h-[180px]">
                <QueueColumn 
                  title="OPD (CONSULTATION)" 
                  patients={opdPatients}
                  onUpdateStatus={updatePatientStatus}
                  onDelete={activeView === 'OPERATOR' ? deletePatient : undefined}
                  onEdit={activeView === 'OPERATOR' ? handleEditPatient : undefined}
                  onReorder={handleReorder}
                  onOpenChat={openChat}
                  status={PatientStatus.OPD}
                  colorClass="bg-[#fffbeb] border-[#fde68a]"
                  headerColor="bg-[#d97706]"
                  onCardClick={activeView === 'DOCTOR' ? handleDoctorClick : undefined}
                  activeCardId={activeConsultationId || undefined}
                  isLarge={activeView === 'DOCTOR'}
                  activeView={activeView}
                  isOpdColumn={true}
                  opdStatus={opdStatus}
                  opdStatusOptions={opdStatusOptions}
                  onOpdStatusChange={updateOpdStatus}
                />
              </div>
              
              {/* BOTTOM: FORM */}
              <div className="flex-1 bg-white rounded-lg shadow-sm border border-[#e2e8f0] overflow-hidden flex flex-col">
                <div className="bg-[#334155] text-white p-2.5 px-4 font-bold flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 uppercase tracking-wide text-[11px]">
                    {activeView === 'OPERATOR' ? (
                      <><Icons.Plus className="w-4 h-4" /> {editingPatient ? 'Edit Entry' : 'NEW REGISTRATION FORM'}</>
                    ) : (
                      <><Icons.Stethoscope className="w-4 h-4" /> OPD (CONSULTATION) FORM</>
                    )}
                  </div>
                  {activeView === 'OPERATOR' && editingPatient && (
                    <button 
                      onClick={() => setEditingPatient(null)} 
                      className="text-[9px] bg-[#475569] hover:bg-[#64748b] px-2 py-0.5 rounded uppercase font-bold"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                <div className="p-4 flex-1 overflow-y-auto">
                  {activeView === 'OPERATOR' ? (
                    <PatientForm 
                      onSubmit={editingPatient ? (data) => updatePatient(editingPatient.id, data) : addPatient} 
                      initialData={editingPatient || undefined}
                      isEditing={!!editingPatient}
                    />
                  ) : (
                    <DoctorConsultationForm 
                      patient={patients.find(p => p.id === activeConsultationId)}
                      onSave={handleSaveConsultation}
                      onOpenChat={openChat}
                      onCancel={() => setActiveConsultationId(null)}
                    />
                  )}
                </div>
              </div>
            </section>

            {/* RIGHT RESIZE DIVIDER */}
            <div 
              className="w-2 flex-shrink-0 cursor-col-resize group relative z-10 flex items-center justify-center"
              onMouseDown={handleResizeStart('right')}
            >
              <div className={`w-1 h-full transition-colors ${isResizing === 'right' ? 'bg-indigo-500' : 'bg-gray-200 group-hover:bg-indigo-400'}`}></div>
              <div className="absolute top-1/2 -translate-y-1/2 w-4 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex flex-col gap-0.5">
                  <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
                  <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
                  <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: COMPLETED OPD */}
            <section className="h-full overflow-hidden flex-shrink-0" style={{ flexBasis: `${columnWidths.right}%`, width: `${columnWidths.right}%` }}>
              <QueueColumn 
                title="COMPLETED OPD" 
                patients={completedPatients}
                onUpdateStatus={updatePatientStatus}
                onDelete={activeView === 'OPERATOR' ? deletePatient : undefined}
                onOpenChat={openChat}
                status={PatientStatus.COMPLETED}
                colorClass="bg-[#f0fdf4] border-[#bbf7d0]"
                headerColor="bg-[#059669]"
                activeView={activeView}
              />
            </section>
          </div>
        ) : currentPage === 'REPORT' ? (
          <PatientReport apiBase={API_BASE} />
        ) : currentPage === 'INFO' ? (
          <Statistics />
        ) : (
          <Calendar currentUser={activeView as 'OPERATOR' | 'DOCTOR'} isBackendOnline={isBackendOnline} />
        )}
      </main>

      {activeChatPatientId && (
        <ChatModal 
          patient={patients.find(p => p.id === activeChatPatientId)!}
          currentView={activeView}
          onSendMessage={addMessage}
          onClose={() => setActiveChatPatientId(null)}
        />
      )}

      {/* Doctor Call Operator Alert - Only shows for OPERATOR */}
      {showDoctorCallAlert && activeView === 'OPERATOR' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-pulse">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md mx-4 text-center border-4 border-amber-400">
            <div className="bg-amber-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-amber-600 uppercase tracking-widest mb-3">Doctor Calling</h2>
            <p className="text-slate-600 mb-6">Doctor needs your assistance. Please go to the consultation room.</p>
            <button
              onClick={() => setShowDoctorCallAlert(false)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-black px-8 py-3 rounded-xl uppercase tracking-widest transition-all shadow-lg"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* Notification sound for doctor call */}
      <audio ref={alertSoundRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAACBhYqFbF1NQDI1MDQwNDY4Oj9ETFRbYWpzfYaOlp2lrbW9xc3V3ePq8fj/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACBhYqFbF1NQDI1MDQwNDY4Oj9ETFRbYWpzfYaOlp2lrbW9xc3V3ePq8fj/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACBhYqFbF1NQDI1MDQwNDY4Oj9ETFRbYWpzfYaOlp2lrbW9xc3V3ePq8fj/" type="audio/wav" />
      </audio>

      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setShowResetModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-[420px] overflow-hidden" onClick={e => e.stopPropagation()}>
            {showResetModal === 'confirm' && (
              <>
                <div className="bg-red-500 px-6 py-4">
                  <h3 className="text-white text-lg font-bold flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                    Delete All Data
                  </h3>
                </div>
                <div className="px-6 py-5">
                  <p className="text-gray-700 text-sm font-semibold mb-3">Are you sure you want to delete all data?</p>
                  <p className="text-gray-600 text-xs mb-2">This will permanently remove:</p>
                  <ul className="text-xs text-gray-600 mb-4 space-y-1 pl-4">
                    <li className="flex items-center gap-2"><span className="text-red-500">✕</span> All Patients</li>
                    <li className="flex items-center gap-2"><span className="text-red-500">✕</span> All Visits</li>
                    <li className="flex items-center gap-2"><span className="text-red-500">✕</span> All Messages</li>
                    <li className="flex items-center gap-2"><span className="text-red-500">✕</span> All Events</li>
                    <li className="flex items-center gap-2"><span className="text-red-500">✕</span> Complaint & Diagnosis Tags</li>
                  </ul>
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
                    <p className="text-green-700 text-xs font-medium">Medicine tags, plan inquiries, and app settings will be preserved.</p>
                  </div>
                  <p className="text-red-600 text-xs font-bold">This action cannot be undone!</p>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t">
                  <button onClick={() => setShowResetModal(null)} className="px-5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
                  <button
                    onClick={() => {
                      const token = localStorage.getItem('clinicflow_authToken');
                      fetch(`${API_BASE}/reset-data`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                      })
                        .then(r => r.json())
                        .then(data => {
                          if (data.success) {
                            setShowResetModal('success');
                          } else {
                            setResetError(data.error || 'Unknown error');
                            setShowResetModal('error');
                          }
                        })
                        .catch(() => {
                          setResetError('Network error. Please try again.');
                          setShowResetModal('error');
                        });
                    }}
                    className="px-5 py-2 text-sm font-bold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Yes, Delete All
                  </button>
                </div>
              </>
            )}
            {showResetModal === 'success' && (
              <>
                <div className="bg-green-500 px-6 py-4">
                  <h3 className="text-white text-lg font-bold flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Data Reset Successful
                  </h3>
                </div>
                <div className="px-6 py-5">
                  <p className="text-gray-700 text-sm">All data has been cleared successfully. The page will reload now.</p>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end border-t">
                  <button onClick={() => window.location.reload()} className="px-5 py-2 text-sm font-bold text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors">OK</button>
                </div>
              </>
            )}
            {showResetModal === 'error' && (
              <>
                <div className="bg-orange-500 px-6 py-4">
                  <h3 className="text-white text-lg font-bold flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    Reset Failed
                  </h3>
                </div>
                <div className="px-6 py-5">
                  <p className="text-gray-700 text-sm">{resetError}</p>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end border-t">
                  <button onClick={() => setShowResetModal(null)} className="px-5 py-2 text-sm font-bold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors">Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <footer className="bg-[#f1f5f9] text-[#64748b] text-[9px] px-4 py-1 flex justify-between border-t border-[#e2e8f0] shrink-0">
        <div className="flex gap-4">
          <span>Database: <strong className={isBackendOnline ? "text-[#059669] uppercase" : "text-[#d97706] uppercase"}>
            {isBackendOnline ? 'POSTGRES CONNECTED' : 'OFFLINE (LOCAL STORAGE)'}
          </strong></span>
          <span>System Time: {new Date().toLocaleTimeString()}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-medium">{appName}</span>
          {activeView === 'DOCTOR' && currentPage === 'REPORT' && dataResetEnabled && (
            <button
              onClick={() => setShowResetModal('confirm')}
              className="px-2 py-0.5 bg-red-500 text-white text-[8px] font-bold uppercase rounded hover:bg-red-600 transition-colors"
            >
              Reset Data
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default App;
