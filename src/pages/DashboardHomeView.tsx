import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { supabase, Candidate, mapCandidate } from '@/types';

interface Props {
  onNavigateToCampaigns: () => void;
}

export const DashboardHomeView: React.FC<Props> = ({ onNavigateToCampaigns }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('campaign_candidates')
        .select('screening_score, screening_status, position_applied, full_name, id')
        .order('screening_score', { ascending: false });

      if (data) {
        setCandidates(data.map(mapCandidate));
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
        <p className="font-medium">Loading dashboard...</p>
      </div>
    );
  }

  // Compute metrics
  const totalCount = candidates.length;
  const qualifiedCount = candidates.filter(c => c.status === 'Qualified').length;
  const unqualifiedCount = candidates.filter(c => c.status === 'Unqualified').length;
  const pendingCount = candidates.filter(c => c.status === 'Pending').length;
  const avgScore = totalCount > 0 ? Math.round(candidates.reduce((sum, c) => sum + c.total_score, 0) / totalCount) : 0;

  // Status data for pie chart
  const statusData = [
    { name: 'Qualified', value: qualifiedCount },
    { name: 'Unqualified', value: unqualifiedCount },
    { name: 'Pending', value: pendingCount }
  ].filter(d => d.value > 0);

  const STATUS_COLORS = { Qualified: '#10b981', Unqualified: '#f43f5e', Pending: '#f59e0b' };

  // Score histogram (5 ranges)
  const scoreBuckets = [
    { range: '0-20', count: candidates.filter(c => c.total_score <= 20).length },
    { range: '21-40', count: candidates.filter(c => c.total_score > 20 && c.total_score <= 40).length },
    { range: '41-60', count: candidates.filter(c => c.total_score > 40 && c.total_score <= 60).length },
    { range: '61-80', count: candidates.filter(c => c.total_score > 60 && c.total_score <= 80).length },
    { range: '81-100', count: candidates.filter(c => c.total_score > 80).length }
  ];

  // Candidates per role
  const roleMap = new Map<string, number>();
  candidates.forEach(c => {
    const role = c.position_applied || 'Unassigned';
    roleMap.set(role, (roleMap.get(role) || 0) + 1);
  });
  const roleData = Array.from(roleMap.entries())
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Top 5 candidates
  const topCandidates = candidates.slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Campaign overview and candidate analytics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <p className="text-sm font-medium text-slate-600 mb-2">Total Candidates</p>
          <p className="text-3xl font-bold text-slate-900">{totalCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <p className="text-sm font-medium text-slate-600 mb-2">Qualified</p>
          <p className="text-3xl font-bold text-emerald-600">{qualifiedCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <p className="text-sm font-medium text-slate-600 mb-2">Unqualified</p>
          <p className="text-3xl font-bold text-rose-600">{unqualifiedCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <p className="text-sm font-medium text-slate-600 mb-2">Avg Score</p>
          <p className="text-3xl font-bold text-indigo-600">{avgScore}%</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Pie Chart */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Qualification Status</h2>
          {statusData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height={256}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">No data</p>
          )}
        </div>

        {/* Top Candidates Podium */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Top 5 Candidates</h2>
          <div className="space-y-2">
            {topCandidates.map((candidate, idx) => (
              <div
                key={candidate.id}
                onClick={onNavigateToCampaigns}
                className="flex items-center p-3 bg-slate-50 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-600">{candidate.full_name}</p>
                  {candidate.position_applied && (
                    <p className="text-xs text-slate-500 truncate">{candidate.position_applied}</p>
                  )}
                </div>
                <div className="ml-2 flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-indigo-600">{candidate.total_score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Score Distribution</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={scoreBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#4f46e5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Candidates per Role */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Candidates by Role</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height={256}>
              <BarChart
                data={roleData}
                layout="vertical"
                margin={{ left: 80, right: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="role" type="category" stroke="#94a3b8" width={75} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#10b981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
