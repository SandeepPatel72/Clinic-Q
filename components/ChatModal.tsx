
import React, { useState, useEffect, useRef } from 'react';
import { Patient, ChatMessage } from '../types';
import { Icons } from '../constants';

interface ChatModalProps {
  patient: Patient;
  currentView: 'OPERATOR' | 'DOCTOR';
  onSendMessage: (patientId: string, text: string) => void;
  onClose: () => void;
}

const ChatModal: React.FC<ChatModalProps> = ({ patient, currentView, onSendMessage, onClose }) => {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [patient.messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(patient.id, inputText);
    setInputText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col h-[500px] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-indigo-700 text-white p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <Icons.Message />
            </div>
            <div>
              <h3 className="font-black text-lg uppercase tracking-tight">{patient.name}</h3>
              <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest">Case Discussion</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
          {patient.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm italic py-8 text-center px-6">
              <div className="bg-slate-200/50 p-4 rounded-full mb-3">
                <Icons.Message />
              </div>
              No discussion history yet.<br/>Start the conversation between Operator and Doctor.
            </div>
          ) : (
            patient.messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.sender === currentView ? 'items-end' : 'items-start'}`}
              >
                <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm text-sm font-medium ${
                  msg.sender === currentView 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                }`}>
                  <p>{msg.text}</p>
                </div>
                <div className="mt-1 flex items-center gap-2 px-1">
                  <span className="text-[9px] font-black uppercase text-slate-400">{msg.sender}</span>
                  <span className="text-[9px] text-slate-300">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Footer Input */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-2">
          <input 
            type="text" 
            className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
            placeholder="Type your message..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            autoFocus
          />
          <button 
            type="submit"
            className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatModal;
