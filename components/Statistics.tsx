import React, { useState, useEffect } from 'react';

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

interface StatisticsData {
  today: {
    count: number;
    trend: number;
    trendPercent: number;
  };
  month: {
    count: number;
    avgPerDay: number;
  };
  weekly: {
    thisWeek: number;
    lastWeek: number;
    change: number;
  };
  last7Days: Array<{
    date: string;
    count: number;
    dayName: string;
  }>;
  gender: {
    male: number;
    female: number;
  };
  category: {
    patient: number;
    visitor: number;
  };
  topCities: Array<{
    city: string;
    count: number;
  }>;
  busiestDay: {
    day: string;
    count: number;
    date: string;
  } | null;
  newReturning: {
    newPatients: number;
    returningPatients: number;
  };
  monthlyComparison: {
    thisMonth: number;
    lastMonth: number;
    change: number;
  };
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const Statistics: React.FC = () => {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/statistics');
      if (!response.ok) throw new Error('Failed to fetch statistics');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError('Failed to load statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500 text-lg">Loading statistics...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-rose-500 text-lg">{error || 'No data available'}</div>
      </div>
    );
  }

  const maxCount = Math.max(...data.last7Days.map(d => d.count), 1);

  const TrendArrow = ({ value }: { value: number }) => (
    <span className={`ml-2 text-sm font-bold ${value >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
      {value >= 0 ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  );

  const PieChart = ({ data: pieData, colors, labels }: { 
    data: number[]; 
    colors: string[]; 
    labels: string[];
  }) => {
    const total = pieData.reduce((a, b) => a + b, 0);
    if (total === 0) {
      return (
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
          No data available
        </div>
      );
    }

    const percentage1 = (pieData[0] / total) * 100;
    const percentage2 = (pieData[1] / total) * 100;

    return (
      <div className="flex items-center gap-3">
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
            <circle
              cx="18" cy="18" r="15.915"
              fill="transparent"
              stroke={colors[1]}
              strokeWidth="3.5"
              strokeDasharray="100 0"
            />
            <circle
              cx="18" cy="18" r="15.915"
              fill="transparent"
              stroke={colors[0]}
              strokeWidth="3.5"
              strokeDasharray={`${percentage1} ${100 - percentage1}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-base font-bold text-slate-700">{total}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[0] }}></div>
            <span className="text-xs text-slate-600">{labels[0]}: <strong>{pieData[0]}</strong> ({percentage1.toFixed(0)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[1] }}></div>
            <span className="text-xs text-slate-600">{labels[1]}: <strong>{pieData[1]}</strong> ({percentage2.toFixed(0)}%)</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 h-full overflow-auto bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Clinic Statistics</h1>
          <button 
            onClick={fetchStatistics}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Today</div>
            <div className="flex items-baseline">
              <span className="text-3xl font-black text-indigo-600">{data.today.count}</span>
              {data.today.trendPercent !== 0 && <TrendArrow value={data.today.trendPercent} />}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {data.today.trend >= 0 ? '+' : ''}{data.today.trend} vs yesterday
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">This Month</div>
            <div className="flex items-baseline">
              <span className="text-3xl font-black text-emerald-600">{data.month.count}</span>
              {data.monthlyComparison?.change !== 0 && data.monthlyComparison && <TrendArrow value={data.monthlyComparison.change} />}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              vs last month ({data.monthlyComparison?.lastMonth ?? 0})
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Avg / Day</div>
            <div className="text-3xl font-black text-amber-600">{data.month.avgPerDay}</div>
            <div className="text-xs text-slate-500 mt-1">This month average</div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Weekly Change</div>
            <div className="flex items-baseline">
              <span className={`text-3xl font-black ${data.weekly.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {data.weekly.change >= 0 ? '+' : ''}{data.weekly.change}%
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">vs last week ({data.weekly.lastWeek} → {data.weekly.thisWeek})</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-700 mb-4">Last 7 Days</h2>
          <div className="flex items-end justify-between gap-2 h-48">
            {data.last7Days.map((day, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center justify-end h-36">
                  <span className="text-xs font-bold text-indigo-600 mb-1">{day.count}</span>
                  <div 
                    className="w-full max-w-12 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg transition-all duration-300"
                    style={{ height: `${(day.count / maxCount) * 100}%`, minHeight: day.count > 0 ? '8px' : '2px' }}
                  ></div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-slate-600">{day.dayName}</div>
                  <div className="text-[10px] text-slate-400">{day.date.split('-').slice(1).join('/')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-base font-bold text-slate-700 mb-3">New vs Returning</h2>
            <PieChart 
              data={[data.newReturning?.newPatients ?? 0, data.newReturning?.returningPatients ?? 0]}
              colors={['#8b5cf6', '#06b6d4']}
              labels={['New', 'Returning']}
            />
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-base font-bold text-slate-700 mb-3">Gender Ratio</h2>
            <PieChart 
              data={[data.gender.male, data.gender.female]}
              colors={['#3b82f6', '#ec4899']}
              labels={['Male', 'Female']}
            />
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-base font-bold text-slate-700 mb-3">Patient vs Visitor</h2>
            <PieChart 
              data={[data.category.patient, data.category.visitor]}
              colors={['#10b981', '#f59e0b']}
              labels={['Patient', 'Visitor']}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-700 mb-4">Top 3 Cities</h2>
            {data.topCities.length > 0 ? (
              <div className="space-y-3">
                {data.topCities.map((city, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm
                      ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : 'bg-amber-700'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-700">{city.city}</div>
                      <div className="text-xs text-slate-500">{city.count} patients</div>
                    </div>
                    <div className="text-lg font-bold text-indigo-600">{city.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-400 text-sm">No city data available</div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-700 mb-4">Busiest Day</h2>
            {data.busiestDay ? (
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">{data.busiestDay.day}</div>
                  <div className="text-sm text-slate-600">on {formatDate(data.busiestDay.date)}</div>
                  <div className="text-xs text-slate-500 mt-1">{data.busiestDay.count} patients</div>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-sm">No data available this month</div>
            )}

            {data.monthlyComparison && (
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Monthly Comparison</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-600">Last Month</div>
                    <div className="text-xl font-bold text-slate-700">{data.monthlyComparison.lastMonth}</div>
                  </div>
                  <div className="text-2xl text-slate-300">→</div>
                  <div>
                    <div className="text-sm text-slate-600">This Month</div>
                    <div className="text-xl font-bold text-emerald-600">{data.monthlyComparison.thisMonth}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                    data.monthlyComparison.change >= 0 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    {data.monthlyComparison.change >= 0 ? '+' : ''}{data.monthlyComparison.change}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
