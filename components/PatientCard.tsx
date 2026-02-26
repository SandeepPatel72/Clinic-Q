
import React, { useState, useRef, useCallback } from 'react';
import { Patient, PatientStatus, PatientCategory, PatientType, AppView } from '../types';
import { Icons, TYPE_THEMES } from '../constants';

interface PatientCardProps {
  patient: Patient;
  onUpdateStatus: (id: string, newStatus: PatientStatus) => void;
  onDelete?: (id: string) => void;
  onEdit?: (patient: Patient) => void;
  onMove?: (id: string, direction: 'up' | 'down') => void;
  onClick?: (id: string) => void;
  onOpenChat?: (id: string) => void;
  isActive?: boolean;
  isLarge?: boolean;
  activeView?: AppView;
  isTablet?: boolean;
}

const PatientCard: React.FC<PatientCardProps> = ({ 
  patient, 
  onUpdateStatus, 
  onDelete, 
  onEdit,
  onMove,
  onClick,
  onOpenChat,
  isActive,
  isLarge,
  activeView,
  isTablet
}) => {
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const dragCloneRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (onClick) return;
    e.dataTransfer.setData('patientId', patient.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const canTouchDrag = isTablet && !onClick && activeView === 'OPERATOR';

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!canTouchDrag) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    isDraggingRef.current = false;
  }, [canTouchDrag]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!canTouchDrag || !touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!isDraggingRef.current && dist > 10) {
      isDraggingRef.current = true;
      const card = (e.currentTarget as HTMLElement);
      const rect = card.getBoundingClientRect();
      const clone = document.createElement('div');
      clone.style.position = 'fixed';
      clone.style.width = rect.width + 'px';
      clone.style.height = rect.height + 'px';
      clone.style.left = touch.clientX - rect.width / 2 + 'px';
      clone.style.top = touch.clientY - rect.height / 2 + 'px';
      clone.style.zIndex = '9999';
      clone.style.opacity = '0.85';
      clone.style.pointerEvents = 'none';
      clone.style.borderRadius = '1rem';
      clone.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
      clone.style.transform = 'scale(0.95)';
      clone.style.transition = 'transform 0.1s';
      clone.innerHTML = card.innerHTML;
      clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      clone.querySelectorAll('[data-patient-id]').forEach(el => el.removeAttribute('data-patient-id'));
      document.body.appendChild(clone);
      dragCloneRef.current = clone;
      card.style.opacity = '0.3';
    }

    if (isDraggingRef.current && dragCloneRef.current) {
      e.preventDefault();
      const clone = dragCloneRef.current;
      const w = parseFloat(clone.style.width);
      const h = parseFloat(clone.style.height);
      clone.style.left = touch.clientX - w / 2 + 'px';
      clone.style.top = touch.clientY - h / 2 + 'px';
    }
  }, [canTouchDrag]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!canTouchDrag) return;
    const card = e.currentTarget as HTMLElement;
    card.style.opacity = '';

    if (dragCloneRef.current) {
      dragCloneRef.current.remove();
      dragCloneRef.current = null;
    }

    if (isDraggingRef.current) {
      const touch = e.changedTouches[0];
      const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
      if (dropTarget) {
        const queueEl = dropTarget.closest('[data-queue-status]') as HTMLElement | null;
        const cardEl = dropTarget.closest('[data-patient-id]') as HTMLElement | null;

        if (cardEl) {
          const targetId = cardEl.getAttribute('data-patient-id');
          if (targetId && targetId !== patient.id && onMove) {
            const targetQueueEl = cardEl.closest('[data-queue-status]') as HTMLElement | null;
            const targetStatus = targetQueueEl?.getAttribute('data-queue-status');
            if (targetStatus === patient.status) {
              const event = new CustomEvent('touch-reorder', {
                detail: { sourceId: patient.id, targetId }
              });
              window.dispatchEvent(event);
            }
          }
        } else if (queueEl) {
          const targetStatus = queueEl.getAttribute('data-queue-status') as PatientStatus;
          if (targetStatus && targetStatus !== patient.status) {
            onUpdateStatus(patient.id, targetStatus);
          }
        }
      }
    }

    touchStartRef.current = null;
    isDraggingRef.current = false;
  }, [canTouchDrag, patient.id, patient.status, onUpdateStatus, onMove]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete?.(patient.id);
  };

  const AvatarIcon = patient.gender === 'Male' ? Icons.MaleAvatar : Icons.FemaleAvatar;

  const isOPD = patient.status === PatientStatus.OPD;
  const isDoctorOPD = activeView === 'DOCTOR' && isOPD;
  const activeClasses = isActive ? 'animate-active-glow z-30' : 'hover:shadow-md';
  
  const isVisitorCategory = patient.category === PatientCategory.VISITOR;
  const themeClasses = TYPE_THEMES[patient.type] || 'bg-slate-50 border-slate-200';
  const animationClasses = isVisitorCategory ? 'animate-radium-glow' : '';
  
  const finalThemeClasses = `${themeClasses} ${animationClasses}`;

  const formatTime = (ts?: number | string | null) => {
    if (!ts) return null;
    const date = typeof ts === 'string' ? new Date(ts) : new Date(ts);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenChat?.(patient.id);
  };

  if (isDoctorOPD) {
    return (
      <div 
        onClick={() => onClick?.(patient.id)}
        className={`${finalThemeClasses} border-2 rounded-2xl transition-all duration-300 ${activeClasses} ${onClick ? 'cursor-pointer' : ''} group relative overflow-hidden flex flex-col`}
      >
        {isVisitorCategory && (
          <div className="absolute top-0 right-0 bg-red-600 text-white font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest z-10 text-[8px] shadow-sm">
            Visitor
          </div>
        )}

        <div className="flex items-start gap-3 p-3">
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className="rounded-full overflow-hidden shadow-sm w-20 h-20">
              <AvatarIcon className="w-full h-full" />
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-widest min-w-[80px] text-center shadow-sm">
              {patient.type}
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1.5">
              <h4 className="truncate uppercase tracking-tight leading-tight flex-1 text-4xl font-extrabold">
                {!isVisitorCategory ? (
                  <><span className="text-[maroon]">[{patient.queueId}]</span> <span className="text-slate-900">{patient.name}</span></>
                ) : (
                  <span className="text-slate-900">{patient.name}</span>
                )}
              </h4>
              {patient.inTime && (
                <div className="bg-gray-200 text-gray-900 rounded-xl font-black whitespace-nowrap shadow-sm text-center flex-shrink-0 px-4 py-2 text-sm uppercase tracking-wide border border-gray-300 flex items-center gap-2">
                  <Icons.Clock />
                  <span>{formatTime(patient.inTime)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-slate-600 truncate text-3xl">
                {patient.city && (
                  <><span className="font-black text-slate-900">{patient.city}</span><span className="mx-1.5 text-slate-300">|</span></>
                )}
                {patient.age} Years ({patient.gender})
                {patient.mobile && (
                  <><span className="mx-1.5 text-slate-300">|</span>{patient.mobile}</>
                )}
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onUpdateStatus(patient.id, PatientStatus.COMPLETED); }} 
                className="bg-slate-800 text-white hover:bg-slate-900 transition-all px-4 py-2 rounded-xl flex-shrink-0 flex items-center gap-2 text-sm font-black uppercase tracking-wide shadow-md border-2 border-slate-700 hover:shadow-lg"
                title="Mark Done"
              >
                <Icons.CheckCircle />
                <span>&nbsp; DONE &raquo;</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      draggable={!onClick && activeView === 'OPERATOR' && !isTablet}
      onDragStart={handleDragStart}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={() => onClick?.(patient.id)}
      className={`${finalThemeClasses} border-2 rounded-2xl transition-all duration-300 ${activeClasses} ${onClick ? 'cursor-pointer' : (activeView === 'OPERATOR' ? 'cursor-grab active:cursor-grabbing' : '')} group relative overflow-hidden flex flex-col`}
      style={canTouchDrag ? { touchAction: 'none' } : undefined}
    >
      {isVisitorCategory && (
        <div className="absolute top-0 right-0 bg-red-600 text-white font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest z-10 text-[8px] shadow-sm">
          Visitor
        </div>
      )}

      <div className={`flex items-start ${isOPD ? 'gap-2 p-2' : isLarge ? 'gap-4 p-8' : (patient.status === PatientStatus.WAITING || patient.status === PatientStatus.COMPLETED) ? `gap-2 ${isTablet ? 'p-2' : 'p-3'}` : 'gap-3 p-4'}`}>
        
        <div className={`flex flex-col items-center flex-shrink-0 ${isOPD ? 'gap-1' : (patient.status === PatientStatus.WAITING || patient.status === PatientStatus.COMPLETED) ? '' : 'gap-3'}`}>
          <div className={`rounded-full overflow-hidden shadow-sm transition-all ${isOPD ? (isTablet ? 'w-10 h-10' : 'w-14 h-14') : isLarge ? 'w-28 h-28' : patient.status === PatientStatus.COMPLETED ? (isTablet ? 'w-9 h-9' : 'w-12 h-12') : patient.status === PatientStatus.WAITING ? (isTablet ? 'w-10 h-10' : 'w-14 h-14') : 'w-16 h-16'}`} title={patient.status === PatientStatus.WAITING && patient.mobile ? `Mobile: ${patient.mobile}` : undefined}>
            <AvatarIcon className="w-full h-full" />
          </div>
          <div className={`bg-white border border-slate-200 rounded-lg font-bold text-slate-500 uppercase tracking-widest text-center shadow-sm ${isTablet ? 'px-1.5 py-0.5 text-[7px] min-w-[60px]' : isOPD ? 'px-2 py-0.5 text-[9px] min-w-[75px]' : 'px-2 py-1 text-[9px] min-w-[75px]'}`}>
            {patient.type}
          </div>
        </div>

        <div className={`flex-1 min-w-0 flex flex-col ${isOPD ? 'justify-center' : 'pt-0.5'}`}>
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`truncate uppercase tracking-tight leading-tight flex-1 ${isOPD ? (isTablet ? 'text-xl font-bold' : 'text-3xl font-bold') : isLarge ? 'text-5xl font-extrabold' : (isTablet ? 'text-base font-bold' : 'text-[1.5rem] font-bold')}`} title={patient.status === PatientStatus.WAITING && patient.mobile ? `Mobile: ${patient.mobile}` : undefined}>
              {!isVisitorCategory ? (
                <><span className="text-[maroon]">[{patient.queueId}]</span> <span className="text-slate-900">{patient.name}</span></>
              ) : (
                <span className="text-slate-900">{patient.name}</span>
              )}
            </h4>
            {isOPD && patient.inTime && (
              <div className="bg-gray-200 text-gray-900 rounded-lg font-black whitespace-nowrap shadow-sm text-center flex-shrink-0 px-3 py-1 text-xs uppercase tracking-wide border border-gray-300 flex items-center gap-1.5">
                <Icons.Clock />
                <span>{formatTime(patient.inTime)}</span>
              </div>
            )}
          </div>
          
          {patient.status === PatientStatus.WAITING ? (
            <div className={`font-semibold text-slate-600 truncate ${isLarge ? 'text-2xl' : (isTablet ? 'text-sm' : 'text-xl')}`}>
              {patient.city && (
                <><span className="font-black text-slate-900">{patient.city}</span><span className="mx-1.5 text-slate-300">|</span></>
              )}
              {patient.age} Years ({patient.gender})
            </div>
          ) : patient.status === PatientStatus.COMPLETED ? (
            <div className={`font-semibold text-slate-600 truncate ${isLarge ? 'text-2xl' : (isTablet ? 'text-sm' : 'text-xl')}`}>
              {patient.city && (
                <><span className="font-black text-slate-900">{patient.city}</span><span className="mx-1.5 text-slate-300">|</span></>
              )}
              {patient.age} Years ({patient.gender})
            </div>
          ) : (
            <div className={`font-semibold text-slate-600 truncate ${isTablet ? 'text-base' : 'text-2xl'}`}>
              {patient.city && (
                <><span className="font-black text-slate-900">{patient.city}</span><span className="mx-1.5 text-slate-300">|</span></>
              )}
              {patient.age} Years ({patient.gender})
              {patient.mobile && (
                <><span className="mx-1.5 text-slate-300">|</span>{patient.mobile}</>
              )}
            </div>
          )}
        </div>
      </div>

      {patient.status === PatientStatus.COMPLETED ? (
        <div className={`border-t border-slate-100 bg-slate-50/50 flex items-center transition-all group-hover:bg-white ${isTablet ? 'px-2 py-1 min-h-[34px]' : 'px-4 py-2 min-h-[48px]'}`}>
          <div className="flex items-center justify-center" style={{ width: '15%' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdateStatus(patient.id, PatientStatus.OPD); }} 
              className={`text-amber-600 hover:text-amber-700 transition-colors hover:bg-amber-50 rounded-lg flex items-center gap-1 ${isTablet ? 'p-0.5' : 'p-1.5'}`}
              title="Send to OPD"
            >
              <Icons.Stethoscope />
            </button>
          </div>
          <div className={`w-[1px] bg-slate-200 ${isTablet ? 'h-3' : 'h-5'}`}></div>
          <div className="flex items-center justify-center flex-1">
            {isTablet ? (
              (patient.inTime || patient.outTime) && (
                <div className="flex items-center gap-1 bg-gray-100 rounded px-1.5 py-0.5">
                  <svg className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {patient.inTime && <span className="text-[9px] font-semibold text-gray-700 whitespace-nowrap">{formatTime(patient.inTime)}</span>}
                  {patient.inTime && patient.outTime && <span className="text-[9px] text-gray-400">·</span>}
                  {patient.outTime && <span className="text-[9px] font-semibold text-gray-700 whitespace-nowrap">{formatTime(patient.outTime)}</span>}
                </div>
              )
            ) : (
              <>
                <div className="flex items-center justify-center" style={{ width: '50%' }}>
                  {patient.inTime && (
                    <div className="bg-gray-200 text-gray-900 px-3 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap shadow-sm min-w-[100px] text-center">
                      IN &nbsp;: {formatTime(patient.inTime)}
                    </div>
                  )}
                </div>
                <div className="w-[1px] h-5 bg-slate-200"></div>
                <div className="flex items-center justify-center" style={{ width: '50%' }}>
                  {patient.outTime && (
                    <div className="bg-gray-200 text-gray-900 px-3 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap shadow-sm min-w-[100px] text-center">
                      OUT: {formatTime(patient.outTime)}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className={`w-[1px] bg-slate-200 ${isTablet ? 'h-3' : 'h-5'}`}></div>
          <div className="flex items-center justify-center" style={{ width: '15%' }}>
            <button 
              onClick={handleChatClick} 
              className={`transition-all relative rounded-lg hover:bg-indigo-50 ${isTablet ? 'p-0.5' : 'p-1.5'} ${patient.hasUnreadAlert ? 'text-rose-600' : 'text-indigo-600'}`}
              title="Discussion"
            >
              <Icons.Message />
              {patient.hasUnreadAlert && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                </span>
              )}
            </button>
          </div>
        </div>
      ) : patient.status === PatientStatus.WAITING ? (
        <div className={`border-t border-slate-100 bg-slate-50/50 flex items-center transition-all group-hover:bg-white ${isTablet ? 'px-1 py-1 min-h-[34px]' : 'px-4 py-2 min-h-[48px]'}`}>
          <div className={`flex items-center ${isTablet ? 'gap-0' : 'gap-1'}`}>
            {onMove && (() => {
              const isPinned = patient.type === PatientType.FAMILY || patient.type === PatientType.RELATIVE;
              const btnClass = isPinned 
                ? `text-slate-200 cursor-not-allowed rounded-md ${isTablet ? 'p-0.5' : 'p-1.5'}`
                : `text-slate-400 hover:text-indigo-600 transition-colors rounded-md hover:bg-slate-100 ${isTablet ? 'p-0.5' : 'p-1.5'}`;
              return (
                <>
                  <button 
                    onClick={(e) => { e.stopPropagation(); if (!isPinned) onMove(patient.id, 'up'); }} 
                    className={btnClass} 
                    title={isPinned ? "Cannot move pinned type" : "Move Up"}
                    disabled={isPinned}
                  >
                    <Icons.ChevronUp />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); if (!isPinned) onMove(patient.id, 'down'); }} 
                    className={btnClass} 
                    title={isPinned ? "Cannot move pinned type" : "Move Down"}
                    disabled={isPinned}
                  >
                    <Icons.ChevronDown />
                  </button>
                </>
              );
            })()}
          </div>

          <div className={`w-[1px] bg-slate-200 ${isTablet ? 'h-3' : 'h-5'}`}></div>

          <div className={`flex items-center gap-0.5 ${isTablet ? 'px-0.5' : 'px-2 gap-1'}`}>
            {onEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(patient); }} className={`text-slate-400 hover:text-slate-700 transition-colors rounded-md hover:bg-slate-100 ${isTablet ? 'p-0.5' : 'p-1.5'}`} title="Edit"><Icons.Edit /></button>}
            {onDelete && <button onClick={handleDeleteClick} className={`text-slate-300 hover:text-rose-600 transition-colors rounded-md hover:bg-rose-50 ${isTablet ? 'p-0.5' : 'p-1.5'}`} title="Delete"><Icons.Trash /></button>}
          </div>

          <div className={`w-[1px] bg-slate-200 ${isTablet ? 'h-3' : 'h-5'}`}></div>

          <div className={`flex items-center justify-center flex-1 ${isTablet ? 'px-0.5' : 'px-2'}`}>
            {patient.inTime && (
              isTablet ? (
                <div className="flex items-center gap-0.5 bg-gray-100 rounded px-1.5 py-0.5">
                  <svg className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span className="text-[9px] font-semibold text-gray-700 whitespace-nowrap">{formatTime(patient.inTime)}</span>
                </div>
              ) : (
                <div className="bg-gray-200 text-gray-900 px-3 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap shadow-sm min-w-[100px] text-center">
                  IN &nbsp;: {formatTime(patient.inTime)}
                </div>
              )
            )}
          </div>

          <div className={`flex items-center justify-center ${isTablet ? 'px-0' : 'px-1'}`}>
            <button 
              onClick={handleChatClick} 
              className={`transition-all relative rounded-lg hover:bg-indigo-50 ${isTablet ? 'p-0.5' : 'p-1.5'} ${patient.hasUnreadAlert ? 'text-rose-600' : 'text-indigo-600'}`}
              title="Discussion"
            >
              <Icons.Message />
              {patient.hasUnreadAlert && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                </span>
              )}
            </button>
          </div>

          <div className={`w-[1px] bg-slate-200 ${isTablet ? 'h-3' : 'h-5'}`}></div>

          <div className={`flex items-center ${isTablet ? 'gap-0.5 pl-0.5' : 'gap-2 pl-2'}`}>
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdateStatus(patient.id, PatientStatus.OPD); }} 
              className={`text-amber-600 hover:text-amber-700 transition-colors hover:bg-amber-50 rounded-lg flex items-center gap-1 ${isTablet ? 'p-0.5' : 'p-1.5'}`}
              title="Send to OPD"
            >
              <Icons.Stethoscope />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onUpdateStatus(patient.id, PatientStatus.COMPLETED); }} 
              className={`text-emerald-600 hover:text-emerald-700 transition-colors hover:bg-emerald-50 rounded-lg ${isTablet ? 'p-0.5' : 'p-1.5'}`}
              title="Mark Done"
            >
              <Icons.CheckCircle />
            </button>
          </div>
        </div>
        ) : (
        <div className="border-t border-slate-100 bg-slate-50/50 flex items-center justify-between px-4 py-2 transition-all group-hover:bg-white min-h-[48px]">
          <div className="flex items-center gap-1"></div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {patient.status !== PatientStatus.OPD && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onUpdateStatus(patient.id, PatientStatus.OPD); }} 
                  className="text-amber-600 hover:text-amber-700 transition-colors p-1.5 hover:bg-amber-50 rounded-lg flex items-center gap-1" 
                  title="Send to OPD"
                >
                  <Icons.Stethoscope />
                </button>
              )}
              {patient.status !== PatientStatus.COMPLETED && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onUpdateStatus(patient.id, PatientStatus.COMPLETED); }} 
                  className="text-emerald-600 hover:text-emerald-700 transition-colors p-1.5 hover:bg-emerald-50 rounded-lg" 
                  title="Mark Done"
                >
                  <Icons.CheckCircle />
                </button>
              )}
            </div>

            <div className="w-[1px] h-5 bg-slate-200"></div>

            <button 
              onClick={handleChatClick} 
              className={`transition-all relative p-1.5 rounded-lg hover:bg-indigo-50 ${patient.hasUnreadAlert ? 'text-rose-600' : 'text-indigo-600'}`} 
              title="Discussion"
            >
              <Icons.Message />
              {patient.hasUnreadAlert && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                </span>
              )}
            </button>

            <div className="w-[1px] h-5 bg-slate-200"></div>

            <div className="flex items-center gap-1">
              {onEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(patient); }} className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-md hover:bg-slate-100" title="Edit"><Icons.Edit /></button>}
              {onDelete && <button onClick={handleDeleteClick} className="text-slate-300 hover:text-rose-600 transition-colors p-1.5 rounded-md hover:bg-rose-50" title="Delete"><Icons.Trash /></button>}
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4 animate-[scaleIn_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Patient Record</h3>
                <p className="text-sm text-slate-500">{patient.name}</p>
              </div>
            </div>
            <p className="text-slate-700 text-sm mb-6 leading-relaxed">
              Are you sure you want to delete this patient record? This action cannot be undone and the record will be <span className="font-bold text-rose-600">permanently removed</span> from the database.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleConfirmDelete(); }}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-md"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientCard;
