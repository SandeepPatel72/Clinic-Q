
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Patient, PatientStatus, PatientCategory, AppView } from '../types';
import PatientCard from './PatientCard';

interface OpdStatusState {
  isPaused: boolean;
  pauseReason: string;
}

interface QueueColumnProps {
  title: string;
  patients: Patient[];
  onUpdateStatus: (id: string, newStatus: PatientStatus) => void;
  onDelete?: (id: string) => void;
  onEdit?: (patient: Patient) => void;
  onMove?: (id: string, direction: 'up' | 'down') => void;
  onReorder?: (sourceId: string, targetId: string) => void;
  onCardClick?: (id: string) => void;
  onOpenChat?: (id: string) => void;
  activeCardId?: string;
  status: PatientStatus;
  colorClass: string;
  headerColor: string;
  isSortable?: boolean;
  isLarge?: boolean;
  activeView?: AppView;
  isOpdColumn?: boolean;
  opdStatus?: OpdStatusState;
  opdStatusOptions?: string[];
  onOpdStatusChange?: (isPaused: boolean, pauseReason: string) => void;
  isTablet?: boolean;
}

const cardVariants = {
  initial: { opacity: 0, y: 50, scale: 0.85 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 22,
      delay: i * 0.07,
    }
  }),
  exit: {
    opacity: 0,
    scale: 0.6,
    y: -20,
    transition: { duration: 0.3, ease: "easeIn" }
  }
};

const opdCardVariants = {
  initial: { opacity: 0, scale: 1.4, boxShadow: "0 0 0px 0px rgba(99, 102, 241, 0)" },
  animate: (i: number) => ({
    opacity: 1,
    scale: 1,
    boxShadow: [
      "0 0 0px 0px rgba(99, 102, 241, 0)",
      "0 0 40px 15px rgba(99, 102, 241, 0.5)",
      "0 0 0px 0px rgba(99, 102, 241, 0)"
    ],
    transition: {
      scale: { type: "spring", stiffness: 300, damping: 20, delay: i * 0.07 },
      opacity: { duration: 0.3, delay: i * 0.07 },
      boxShadow: { duration: 1.2, delay: i * 0.07, ease: "easeOut" },
    }
  }),
  exit: {
    opacity: 0,
    scale: 0.5,
    transition: { duration: 0.25, ease: "easeIn" }
  }
};

const QueueColumn: React.FC<QueueColumnProps> = ({ 
  title, 
  patients, 
  onUpdateStatus, 
  onDelete, 
  onEdit,
  onMove,
  onReorder,
  onCardClick,
  onOpenChat,
  activeCardId,
  status,
  colorClass,
  headerColor,
  isSortable,
  isLarge,
  activeView,
  isOpdColumn,
  opdStatus,
  opdStatusOptions,
  onOpdStatusChange,
  isTablet
}) => {
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [localOptions, setLocalOptions] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const pausedButtonRef = useRef<HTMLButtonElement>(null);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: React.DragEvent) => {
    setDragOverCardId(null);
    const patientId = e.dataTransfer.getData('patientId');
    if (patientId) {
      if (isOpdColumn && opdStatus?.isPaused) {
        return;
      }
      onUpdateStatus(patientId, status);
    }
  };

  const handleCardDrop = (e: React.DragEvent, targetId: string) => {
    e.stopPropagation();
    setDragOverCardId(null);
    const sourceId = e.dataTransfer.getData('patientId');
    if (sourceId && sourceId !== targetId && onReorder) {
      onReorder(sourceId, targetId);
    } else if (sourceId === targetId) {
       // do nothing
    } else if (sourceId) {
       if (isOpdColumn && opdStatus?.isPaused) {
         return;
       }
       onUpdateStatus(sourceId, status);
    }
  };

  const patientCount = useMemo(() => {
    return patients.filter(p => p.category === PatientCategory.PATIENT).length;
  }, [patients]);

  const handleRunningClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onOpdStatusChange) return;
    onOpdStatusChange(false, '');
    setShowDropdown(false);
  };

  const handlePausedClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onOpdStatusChange) return;
    
    if (!showDropdown && pausedButtonRef.current) {
      const rect = pausedButtonRef.current.getBoundingClientRect();
      const dropdownWidth = 288;
      const viewportWidth = window.innerWidth;
      
      let left = rect.left;
      if (left + dropdownWidth > viewportWidth - 16) {
        left = viewportWidth - dropdownWidth - 16;
      }
      if (left < 8) {
        left = 8;
      }
      
      setDropdownPosition({
        top: rect.bottom + 8,
        left: left
      });
      
      setLoadingOptions(true);
      try {
        const response = await fetch('/api/opd-status-options');
        if (response.ok) {
          const { options } = await response.json();
          setLocalOptions(options || opdStatusOptions || []);
        } else {
          console.error('Non-OK response fetching OPD status options:', response.status);
          setLocalOptions(opdStatusOptions || []);
        }
      } catch (err) {
        console.error('Error fetching OPD status options:', err);
        setLocalOptions(opdStatusOptions || []);
      } finally {
        setLoadingOptions(false);
      }
    }
    setShowDropdown(!showDropdown);
  };
  
  useEffect(() => {
    if (showDropdown) {
      const handleScrollOrResize = () => setShowDropdown(false);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [showDropdown]);

  useEffect(() => {
    if (!onReorder) return;
    const handler = (e: Event) => {
      const { sourceId, targetId } = (e as CustomEvent).detail;
      onReorder(sourceId, targetId);
    };
    window.addEventListener('touch-reorder', handler);
    return () => window.removeEventListener('touch-reorder', handler);
  }, [onReorder]);

  const handleSelectPauseReason = (e: React.MouseEvent, reason: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOpdStatusChange) {
      onOpdStatusChange(true, reason);
      setShowDropdown(false);
    }
  };

  const variants = status === PatientStatus.OPD ? opdCardVariants : cardVariants;

  return (
    <div 
      className={`flex flex-col h-full rounded-2xl border-2 shadow-inner transition-colors ${colorClass}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-queue-status={status}
    >
      <div className={`${headerColor} text-white rounded-t-[14px] font-black flex items-center justify-between shadow-sm z-10 ${isTablet ? 'px-2 py-1' : 'px-5 py-2'}`}>
        <div className={`flex items-center ${isTablet ? 'gap-2' : 'gap-3'}`}>
          <span className={`uppercase tracking-wider ${isTablet ? 'text-xs' : 'text-sm'}`}>{title}</span>
          {isOpdColumn && onOpdStatusChange && (
            <div className="relative flex items-center gap-2">
              <div className="flex rounded-lg overflow-hidden shadow-md border border-white/30">
                <button
                  onClick={handleRunningClick}
                  className={`
                    ${isTablet ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'} font-bold uppercase tracking-wide
                    transition-all duration-200 flex items-center gap-1.5
                    ${!opdStatus?.isPaused 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-white/80 text-gray-600 hover:bg-emerald-100'
                    }
                  `}
                >
                  <span className={`w-2 h-2 rounded-full ${!opdStatus?.isPaused ? 'bg-white' : 'bg-gray-400'}`}></span>
                  Running
                </button>
                <button
                  ref={pausedButtonRef}
                  onClick={handlePausedClick}
                  className={`
                    ${isTablet ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'} font-bold uppercase tracking-wide
                    transition-all duration-200 flex items-center gap-1.5
                    ${opdStatus?.isPaused 
                      ? 'bg-red-500 text-white' 
                      : showDropdown
                        ? 'bg-red-400 text-white'
                        : 'bg-white/80 text-gray-600 hover:bg-red-100'
                    }
                  `}
                >
                  <span className={`w-2 h-2 rounded-full ${opdStatus?.isPaused || showDropdown ? 'bg-white' : 'bg-gray-400'}`}></span>
                  Paused
                </button>
              </div>
              
            </div>
          )}
        </div>
        <span className={`bg-white/20 rounded-full font-bold font-mono border border-white/30 flex items-center justify-center ${isTablet ? 'min-w-[22px] h-[22px] text-xs' : 'min-w-[36px] h-[36px] text-xl'}`}>
          {patientCount}
        </span>
      </div>
      
      <div className={`flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 ${isTablet ? 'p-1 space-y-2' : 'p-3 space-y-4'}`}>
        {isOpdColumn && opdStatus?.isPaused ? (
          <div className="h-full flex flex-col items-center justify-center py-8">
            <div className="bg-red-100 border-2 border-red-300 rounded-xl p-6 text-center max-w-md">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-700 font-bold text-lg mb-2">OPD PAUSED</p>
              <p className="text-red-600 text-base font-medium">{opdStatus.pauseReason}</p>
            </div>
          </div>
        ) : patients.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 italic text-sm py-12 border-2 border-dashed border-slate-300 rounded-xl">
            {isOpdColumn ? (
              <div className="text-center px-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-bold text-emerald-600 text-base not-italic">DOCTOR IS AVAILABLE</p>
                <p className="text-slate-500 mt-1 not-italic">WAIT FOR YOUR TURN</p>
              </div>
            ) : (
              <p className="font-medium text-center px-4">Empty</p>
            )}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {patients.map((p, index) => (
              <motion.div
                key={p.id}
                layout
                custom={index}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                layoutTransition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`w-full rounded-xl ${dragOverCardId === p.id ? 'bg-indigo-100 ring-2 ring-indigo-400 ring-offset-2' : ''}`}
                data-patient-id={p.id}
                onDragOver={(e: any) => {
                  onDragOver(e);
                  setDragOverCardId(p.id);
                }}
                onDragLeave={() => setDragOverCardId(null)}
                onDrop={(e: any) => handleCardDrop(e, p.id)}
              >
                <PatientCard 
                  patient={p} 
                  onUpdateStatus={onUpdateStatus} 
                  onDelete={onDelete} 
                  onEdit={onEdit}
                  onMove={onMove}
                  onClick={onCardClick}
                  onOpenChat={onOpenChat}
                  isActive={activeCardId === p.id}
                  isLarge={isLarge}
                  activeView={activeView}
                  isTablet={isTablet}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
      
      {showDropdown && !opdStatus?.isPaused && createPortal(
        <>
          <div 
            className="fixed inset-0" 
            style={{ zIndex: 9998 }}
            onMouseDown={() => setShowDropdown(false)}
          />
          <div 
            className="fixed w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
            style={{ 
              zIndex: 9999, 
              top: dropdownPosition.top,
              left: Math.max(8, dropdownPosition.left)
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-100 px-3 py-2 text-xs text-gray-600 font-semibold uppercase tracking-wide border-b">
              Select Pause Reason
            </div>
            {loadingOptions ? (
              <div className="px-3 py-4 text-center text-gray-500 text-sm">Loading...</div>
            ) : localOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-500 text-sm">No reasons available</div>
            ) : localOptions.map((option, index) => (
              <div
                key={index}
                role="button"
                tabIndex={0}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (onOpdStatusChange) {
                    onOpdStatusChange(true, option);
                    setShowDropdown(false);
                  }
                }}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors border-b last:border-b-0 cursor-pointer select-none"
              >
                {option}
              </div>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default QueueColumn;
