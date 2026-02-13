import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { CalendarEvent, EventType } from '../types';

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

interface CalendarProps {
  currentUser: 'OPERATOR' | 'DOCTOR';
  isBackendOnline: boolean;
}

const API_BASE = '/api';

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  [EventType.NORMAL]: 'bg-slate-500',
  [EventType.OPERATION]: 'bg-red-500',
  [EventType.VISIT]: 'bg-blue-500',
  [EventType.HOSPITAL_RELATED]: 'bg-purple-500',
  [EventType.SOCIAL]: 'bg-green-500',
};

const Calendar: React.FC<CalendarProps> = ({ currentUser, isBackendOnline }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'monthly' | 'daily'>('monthly');
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    eventDate: '',
    eventTime: '',
    description: '',
    eventType: EventType.NORMAL,
    remindMe: false,
  });

  const fetchEvents = useCallback(async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const res = await authFetch(`${API_BASE}/events?year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    if (isBackendOnline) {
      fetchEvents();
    } else {
      setLoading(false);
    }
  }, [isBackendOnline, fetchEvents]);

  useEffect(() => {
    const socket = io({ path: '/socket.io' });
    socketRef.current = socket;

    socket.on('event:add', (event: CalendarEvent) => {
      console.log('Socket: event added, refreshing...');
      setEvents(prev => {
        if (prev.some(e => e.id === event.id)) return prev;
        return [...prev, event];
      });
    });

    socket.on('event:update', (event: CalendarEvent) => {
      console.log('Socket: event updated, refreshing...');
      setEvents(prev => prev.map(e => e.id === event.id ? event : e));
    });

    socket.on('event:delete', ({ eventId }: { eventId: number }) => {
      console.log('Socket: event deleted, refreshing...');
      setEvents(prev => prev.filter(e => e.id !== eventId));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = formatLocalDate(date);
    return events.filter(e => e.eventDate === dateStr);
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(clickedDate);
    setViewMode('daily');
  };

  const handleAddEvent = (date?: Date) => {
    const targetDate = date || selectedDate || new Date();
    setFormData({
      title: '',
      eventDate: formatLocalDate(targetDate),
      eventTime: '',
      description: '',
      eventType: EventType.NORMAL,
      remindMe: false,
    });
    setEditingEvent(null);
    setShowEventModal(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setFormData({
      title: event.title,
      eventDate: event.eventDate,
      eventTime: event.eventTime || '',
      description: event.description || '',
      eventType: event.eventType,
      remindMe: event.remindMe,
    });
    setEditingEvent(event);
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      const res = await authFetch(`${API_BASE}/events/${eventId}`, { method: 'DELETE' });
      if (res.ok) {
        setEvents(events.filter(e => e.id !== eventId));
      }
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const eventData = {
      ...formData,
      createdBy: currentUser,
    };

    try {
      if (editingEvent) {
        const res = await authFetch(`${API_BASE}/events/${editingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });
        if (res.ok) {
          const updated = await res.json();
          setEvents(events.map(e => e.id === editingEvent.id ? updated : e));
        }
      } else {
        const res = await authFetch(`${API_BASE}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });
        if (res.ok) {
          const newEvent = await res.json();
          setEvents([...events, newEvent]);
        }
      }
      setShowEventModal(false);
    } catch (err) {
      console.error('Failed to save event:', err);
    }
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const isToday = (day: number) => 
    today.getDate() === day && 
    today.getMonth() === currentDate.getMonth() && 
    today.getFullYear() === currentDate.getFullYear();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-500">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="p-4 w-full max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden w-full">
        <div className="bg-indigo-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={handlePrevMonth}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-bold">{monthNames[month]} {year}</h2>
            <button 
              onClick={handleNextMonth}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${viewMode === 'monthly' ? 'bg-white text-indigo-600' : 'hover:bg-white/20'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => { setSelectedDate(new Date()); setViewMode('daily'); }}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${viewMode === 'daily' ? 'bg-white text-indigo-600' : 'hover:bg-white/20'}`}
            >
              Daily
            </button>
            <button
              onClick={() => handleAddEvent()}
              className="ml-4 px-4 py-1.5 bg-white text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Event
            </button>
          </div>
        </div>

        {viewMode === 'monthly' ? (
          <div className="p-4 w-full">
            <div className="grid grid-cols-7 gap-1 mb-2 w-full">
              {dayNames.map(day => (
                <div key={day} className="text-center text-sm font-semibold text-slate-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 w-full">
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-24 bg-slate-50 rounded-lg min-w-0"></div>
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayDate = new Date(year, month, day);
                const dayEvents = getEventsForDate(dayDate);
                return (
                  <div
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`h-24 p-1 rounded-lg border cursor-pointer transition-all hover:border-indigo-300 hover:shadow-md min-w-0 ${
                      isToday(day) ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className={`text-sm font-semibold mb-1 ${isToday(day) ? 'text-indigo-600' : 'text-slate-700'}`}>
                      {day}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          className={`text-[10px] text-white px-1 py-0.5 rounded truncate ${EVENT_TYPE_COLORS[event.eventType]}`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-slate-500 px-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDate(new Date(selectedDate!.getTime() - 86400000))}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h3 className="text-lg font-bold text-slate-800">
                  {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
                <button
                  onClick={() => setSelectedDate(new Date(selectedDate!.getTime() + 86400000))}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <button
                onClick={() => handleAddEvent(selectedDate!)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Event
              </button>
            </div>
            
            <div className="space-y-3">
              {selectedDate && getEventsForDate(selectedDate).length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg font-medium">No events for this day</p>
                  <p className="text-sm mt-1">Click "Add Event" to create one</p>
                </div>
              ) : (
                selectedDate && getEventsForDate(selectedDate).map(event => (
                  <div
                    key={event.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${EVENT_TYPE_COLORS[event.eventType]}`}>
                            {event.eventType}
                          </span>
                          {event.remindMe && (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                              </svg>
                              Reminder
                            </span>
                          )}
                          {event.eventTime && (
                            <span className="text-sm text-slate-500">
                              {formatTime(event.eventTime)}
                            </span>
                          )}
                        </div>
                        <h4 className="text-lg font-bold text-slate-800">{event.title}</h4>
                        {event.description && (
                          <p className="text-sm text-slate-600 mt-1">{event.description}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-2">Created by {event.createdBy}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-indigo-600 text-white p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{editingEvent ? 'Edit Event' : 'Add New Event'}</h3>
              <button onClick={() => setShowEventModal(false)} className="p-1 hover:bg-white/20 rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Event title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.eventDate}
                    onChange={e => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={formData.eventTime}
                    onChange={e => setFormData({ ...formData, eventTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Event Type</label>
                <select
                  value={formData.eventType}
                  onChange={e => setFormData({ ...formData, eventType: e.target.value as EventType })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value={EventType.NORMAL}>NORMAL</option>
                  <option value={EventType.OPERATION}>OPERATION</option>
                  <option value={EventType.VISIT}>VISIT</option>
                  <option value={EventType.HOSPITAL_RELATED}>HOSPITAL RELATED</option>
                  <option value={EventType.SOCIAL}>SOCIAL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  placeholder="Event description (optional)"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remindMe"
                  checked={formData.remindMe}
                  onChange={e => setFormData({ ...formData, remindMe: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="remindMe" className="text-sm font-semibold text-slate-700">
                  Remind Me
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  {editingEvent ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
