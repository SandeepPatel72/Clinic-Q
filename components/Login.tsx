
import React, { useState, useEffect } from 'react';
import { AppView } from '../types';

interface LoginProps {
  onLogin: (role: AppView) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mobile, setMobile] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hospitalName, setHospitalName] = useState('');
  const [appName, setAppName] = useState('Clinic-Q');
  const [numberOfDays, setNumberOfDays] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/metadata')
      .then(res => res.json())
      .then(data => {
        if (data.hospitalName) {
          setHospitalName(data.hospitalName);
        }
        if (data.appName) {
          setAppName(data.appName);
        }
      })
      .catch(() => {});

    fetch('/api/app-settings')
      .then(res => res.json())
      .then(data => {
        if (data.end_date) {
          const endDate = new Date(data.end_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
          const diffTime = endDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setNumberOfDays(diffDays);
        }
      })
      .catch(() => {});
  }, []);

  const isExpired = numberOfDays !== null && numberOfDays < 1;
  const showWarning = numberOfDays !== null && numberOfDays >= 1 && numberOfDays <= 30;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) return;
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, mobile })
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (data.token) {
          localStorage.setItem('clinicflow_authToken', data.token);
        }
        onLogin(data.role as AppView);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-700 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 space-y-8">
        <div className="text-center">
          <h2 className="text-4xl font-black text-indigo-900 tracking-widest">{appName}</h2>
          {hospitalName && (
            <p className="mt-1 text-indigo-600 font-bold uppercase tracking-wider text-lg">{hospitalName}</p>
          )}
         
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-rose-50 border-2 border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wide text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              autoFocus
              disabled={isExpired}
              className={`w-full border-2 rounded-2xl p-4 outline-none transition-all font-bold ${isExpired ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-700'}`}
              placeholder="Enter Mobile Number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
            <input
              type="text"
              required
              disabled={isExpired}
              className={`w-full border-2 rounded-2xl p-4 outline-none transition-all font-bold ${isExpired ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-700'}`}
              placeholder="Enter Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <input
              type="password"
              required
              disabled={isExpired}
              className={`w-full border-2 rounded-2xl p-4 outline-none transition-all font-bold ${isExpired ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-700'}`}
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || isExpired}
            className={`w-full text-white font-black py-4 rounded-2xl shadow-xl transition-all uppercase tracking-[0.2em] text-sm ${isExpired ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 transform active:scale-[0.98]'}`}
          >
            {loading ? 'Authenticating...' : 'Authenticate'}
          </button>

          {isExpired && (
            <div className="text-center mt-4 bg-rose-50 border-2 border-rose-300 rounded-2xl py-3 px-4">
              <p className="text-rose-700 font-black text-xs uppercase tracking-wide leading-relaxed">
                YOUR APP HAS STOPPED WORKING. CONTACT 9033338800 TO RECHARGE.
              </p>
            </div>
          )}

          {showWarning && (
            <div className="text-center mt-4 bg-amber-50 border-2 border-amber-200 rounded-2xl py-3 px-4">
              <p className="text-amber-800 font-black text-xs uppercase tracking-wide leading-relaxed">
                YOUR APP WILL STOP WORKING AFTER <span className="text-rose-600 text-base">{numberOfDays}</span> DAYS. CONTACT 9033338800 TO RECHARGE.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
