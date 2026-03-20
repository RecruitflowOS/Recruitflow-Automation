import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, Download, ChevronRight, ChevronLeft, Mail, Phone, RefreshCw } from 'lucide-react';
import { supabase, Candidate, mapCandidate, ITEMS_PER_PAGE } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';

interface CampaignsViewProps {
  onSelectCandidate: (c: Candidate) => void;
  tableName: string;
  campaignTitle: string;
}

export const CampaignsView = ({ onSelectCandidate, tableName, campaignTitle }: CampaignsViewProps) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [roles, setRoles] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const tableRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

  // Fetch distinct roles on mount
  useEffect(() => {
    supabase.from(tableName)
      .select('position_applied')
      .not('position_applied', 'is', null)
      .order('position_applied')
      .then(({ data }) => {
        if (data) setRoles([...new Set(data.map(r => r.position_applied as string).filter(Boolean))]);
      });
  }, [tableName]);

  const fetchCandidates = async (page: number = 1, role = selectedRole) => {
    page === 1 ? setLoading(true) : setPageLoading(true);
    setError(null);

    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .order('screening_score', { ascending: false })
      .range(from, to);

    if (role !== 'All') {
      query = query.eq('position_applied', role);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Fetch error:', error);
      setError(error.message);
    } else if (data) {
      setCandidates(data.map(mapCandidate));
      if (count !== null) setTotalCount(count);
    }
    setLoading(false);
    setPageLoading(false);
  };

  useEffect(() => { fetchCandidates(1, selectedRole); }, [selectedRole]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    fetchCandidates(page, selectedRole);
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    setCurrentPage(1);
    fetchCandidates(1, role);
  };

  const handleDownloadTop10 = async () => {
    let query = supabase
      .from(tableName)
      .select('*')
      .order('screening_score', { ascending: false })
      .limit(10);

    if (selectedRole !== 'All') {
      query = query.eq('position_applied', selectedRole);
    }

    const { data } = await query;

    if (!data || data.length === 0) return;

    const top10 = data.map(mapCandidate);
    const reportContent =
      "TOP 10 CANDIDATE REPORT\n" +
      "====================================================\n\n" +
      top10.map((c, i) =>
        `RANK #${i+1}: ${c.full_name}\n` +
        `Total Score: ${c.total_score}%\n` +
        `Status: ${c.status}\n` +
        (c.position_applied ? `Position Applied: ${c.position_applied}\n` : '') +
        `Email: ${c.email}\n` +
        `Phone: ${c.phone}\n` +
        (c.nationality ? `Nationality: ${c.nationality}\n` : '') +
        (c.current_city ? `Current City: ${c.current_city}\n` : '') +
        `Summary: ${c.summary}\n` +
        `----------------------------------------------------\n`
      ).join('\n');

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Top10_Candidates_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | '...')[] = [1];
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
      <p className="font-medium">Fetching candidate pipeline...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-500 p-8 text-center animate-in fade-in">
      <div className="bg-rose-100 p-3 rounded-full mb-4">
        <AlertCircle className="w-8 h-8 text-rose-600" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">Access Denied</h3>
      <p className="max-w-md text-sm text-slate-600 mb-6">
        Unable to load candidates. This is likely due to missing database permissions (RLS) for your account.
        <br/><span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded mt-2 inline-block text-rose-500">{error}</span>
      </p>
      <button
        onClick={() => fetchCandidates(1, selectedRole)}
        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Retry Connection
      </button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{campaignTitle}</h1>
          <p className="text-slate-500 mt-1">
            {totalCount > 0
              ? `Showing ${startItem}–${endItem} of ${totalCount} candidates · Sorted by highest AI score`
              : 'Sorting by highest AI score (Total Score DESC)'}
          </p>
        </div>
        <button
          onClick={handleDownloadTop10}
          disabled={totalCount === 0}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Top 10 Report
        </button>
      </div>

      {/* Role Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {['All', ...roles].map(role => (
          <button key={role} onClick={() => handleRoleChange(role)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap shrink-0 transition-all ${
              selectedRole === role
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600'
            }`}>
            {role}
          </button>
        ))}
      </div>

      <div ref={tableRef} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className={`overflow-x-auto transition-opacity duration-200 ${pageLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Info</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider text-center">AI Score</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Qualification</th>
                <th className="relative px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                    No candidates found in this campaign.
                  </td>
                </tr>
              ) : (
                candidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                          {candidate.full_name.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-slate-900">{candidate.full_name}</div>
                          {candidate.position_applied
                            ? <div className="text-xs text-indigo-500 font-medium truncate max-w-[180px]">{candidate.position_applied}</div>
                            : <div className="text-xs text-slate-500 font-medium uppercase tracking-tight">ID_{candidate.id.slice(0,6)}</div>
                          }
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 flex items-center mb-1">
                        <Mail className="w-3.5 h-3.5 mr-2 text-slate-400" />
                        {candidate.email}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center">
                        <Phone className="w-3.5 h-3.5 mr-2 text-slate-400" />
                        {candidate.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-indigo-600">{candidate.total_score}%</span>
                        <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-600" style={{ width: `${candidate.total_score}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={candidate.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => onSelectCandidate(candidate)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-bold rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                      >
                        View Profile
                        <ChevronRight className="ml-1 w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-slate-500 order-2 sm:order-1">
              Showing{' '}
              <span className="font-semibold text-slate-700">{startItem}</span>–<span className="font-semibold text-slate-700">{endItem}</span>
              {' '}of{' '}
              <span className="font-semibold text-slate-700">{totalCount}</span> candidates
              {pageLoading && <Loader2 className="inline w-3.5 h-3.5 animate-spin ml-2 text-indigo-500" />}
            </p>

            {totalPages > 1 && (
              <nav className="flex items-center space-x-1 order-1 sm:order-2" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || pageLoading}
                  aria-label="Previous page"
                  className="flex items-center px-3 py-1.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Prev
                </button>

                {getPageNumbers().map((page, idx) =>
                  page === '...' ? (
                    <span key={`ell-${idx}`} className="px-2 text-sm text-slate-400 select-none">…</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page as number)}
                      disabled={pageLoading}
                      aria-label={`Page ${page}`}
                      aria-current={page === currentPage ? 'page' : undefined}
                      className={`w-9 h-9 text-sm font-semibold rounded-lg transition-all ${
                        page === currentPage
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 cursor-default'
                          : 'text-slate-600 bg-white border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
                      } disabled:opacity-50`}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || pageLoading}
                  aria-label="Next page"
                  className="flex items-center px-3 py-1.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
