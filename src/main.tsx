import './globals.css';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './src/index.css';
import { createClient } from '@supabase/supabase-js';
import {
  LayoutDashboard,
  Users,
  FileText,
  Download,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  LogOut,
  Mail,
  Phone,
  ExternalLink,
  Award,
  BarChart3,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileSearch,
  Minus,
  Plus,
  RotateCcw,
  Maximize,
  MapPin,
  Briefcase,
  Globe
} from 'lucide-react';

// --- Supabase Client Initialization ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Please check .env.local or Vercel environment configuration.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
    flowType: 'implicit'
  }
});

// --- Types ---

type QualificationStatus = 'Qualified' | 'Unqualified' | 'Pending';

interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  total_score: number;
  status: QualificationStatus;
  skills_score: number;
  experience_score: number;
  cultural_fit_score: number;
  summary: string;
  resume_path: string | null; // Mapped from 'resume_url' in DB
  reports?: string;           // Mapped from 'screening_report' in DB
  position_applied?: string;  // Role the candidate applied for
  nationality?: string;
  current_city?: string;
}

// --- Components ---

const StatusBadge = ({ status }: { status: QualificationStatus }) => {
  const styles = {
    Qualified: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Unqualified: 'bg-rose-100 text-rose-700 border-rose-200',
    Pending: 'bg-amber-100 text-amber-700 border-amber-200'
  };

  const icons = {
    Qualified: <CheckCircle2 className="w-3.5 h-3.5 mr-1" />,
    Unqualified: <XCircle className="w-3.5 h-3.5 mr-1" />,
    Pending: <Clock className="w-3.5 h-3.5 mr-1" />
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {icons[status]}
      {status}
    </span>
  );
};

const ScoreCircle = ({ score, label }: { score: number, label: string }) => (
  <div className="flex flex-col items-center">
    <div className="relative flex items-center justify-center">
      <svg className="w-16 h-16">
        <circle className="text-slate-200" strokeWidth="5" stroke="currentColor" fill="transparent" r="28" cx="32" cy="32" />
        <circle 
          className="text-indigo-600" 
          strokeWidth="5" 
          strokeDasharray={175.9} 
          strokeDashoffset={175.9 - (175.9 * score) / 100} 
          strokeLinecap="round" 
          stroke="currentColor" 
          fill="transparent" 
          r="28" 
          cx="32" 
          cy="32" 
        />
      </svg>
      <span className="absolute text-sm font-bold text-slate-900">{score}%</span>
    </div>
    <span className="mt-2 text-[10px] uppercase tracking-wider font-semibold text-slate-500 text-center">{label}</span>
  </div>
);

// --- Pages ---

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        if (data.user && !data.session) {
          setSuccessMessage('Account created! Please check your email for verification link.');
        } else if (data.user && data.session) {
          setSuccessMessage('Account created! Logging you in...');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Recruitflow" className="h-20 w-auto rounded-xl shadow-lg object-contain" />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900">
          {isSignUp ? 'Create Account' : 'Recruiter Portal'}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 font-medium">
          {isSignUp ? 'Join the recruitment team' : 'Internal Candidate Management'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleAuth}>
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-lg text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                {error}
              </div>
            )}
            {successMessage && (
               <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-lg text-sm flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {successMessage}
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-700">Recruiter Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="recruiter@enterprise.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            <button 
              disabled={loading}
              type="submit"
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? 'Create Account' : 'Secure Login')}
            </button>
          </form>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">
                  {isSignUp ? 'Already have an account?' : 'Need an account?'}
                </span>
              </div>
            </div>
            <div className="mt-6 flex justify-center">
                <button 
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-indigo-600 hover:text-indigo-500 font-semibold text-sm hover:underline"
                >
                    {isSignUp ? 'Sign in instead' : 'Sign up for access'}
                </button>
            </div>
          </div>

          {!isSignUp && (
            <div className="mt-6 flex flex-col items-center">
               <span className="text-xs text-slate-400 font-medium tracking-wide">ENTERPRISE SECURITY ACTIVE</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ITEMS_PER_PAGE = 10;

const normalizeStatus = (dbStatus: string): QualificationStatus => {
  if (!dbStatus) return 'Pending';
  const lower = dbStatus.toLowerCase();
  if (lower === 'qualified') return 'Qualified';
  if (lower === 'unqualified') return 'Unqualified';
  return 'Pending';
};

const mapCandidate = (item: any): Candidate => ({
  id: item.id,
  full_name: item.full_name,
  email: item.email || 'N/A',
  phone: item.phone || 'N/A',
  total_score: item.screening_score ?? 0,
  status: normalizeStatus(item.screening_status),
  resume_path: item.resume_url ? item.resume_url.trim() : null,
  reports: item.screening_report,
  summary: item.screening_summary || 'No summary available.',
  skills_score: item.screening_score ?? 0,
  experience_score: item.screening_score ?? 0,
  cultural_fit_score: item.screening_score ?? 0,
  position_applied: item.position_applied || undefined,
  nationality: item.nationality || undefined,
  current_city: item.current_city || undefined,
});

const DashboardView = ({ onSelectCandidate }: { onSelectCandidate: (c: Candidate) => void }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

  const fetchCandidates = async (page: number = 1) => {
    page === 1 ? setLoading(true) : setPageLoading(true);
    setError(null);

    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, error, count } = await supabase
      .from('campaign_candidates')
      .select('*', { count: 'exact' })
      .order('screening_score', { ascending: false })
      .range(from, to);

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

  useEffect(() => { fetchCandidates(1); }, []);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    fetchCandidates(page);
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDownloadTop10 = async () => {
    const { data } = await supabase
      .from('campaign_candidates')
      .select('*')
      .order('screening_score', { ascending: false })
      .limit(10);

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
        onClick={() => fetchCandidates(1)}
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
          <h1 className="text-2xl font-bold text-slate-900">MA Construction Personnel list</h1>
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

const CandidateProfileView = ({ candidate, onBack }: { candidate: Candidate, onBack: () => void }) => {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
  
  // PDF Navigation State
  const [pdfPage, setPdfPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    let isMounted = true;
    const resolveUrls = async () => {
      if (!candidate.resume_path) return;
      
      setLoadingUrl(true);
      setUrlError(null);
      setResolvedPath(null);
      setPdfPage(1); 
      setZoomLevel(100); 
      
      const bucketName = 'resumes';
      const originalPath = candidate.resume_path;
      // Aggressive strip: remove "resumes/" prefix if present to handle DB paths like "resumes/file.pdf"
      const cleanPath = originalPath.replace(/^resumes\//, '');
      
      let targetPath = cleanPath;
      let finalViewUrl: string | null = null;
      let finalDownloadUrl: string | null = null;
      let fetchError: string | null = null;

      try {
        // --- Strategy 1: Direct Fetch (Clean Path) ---
        // This is the most likely scenario where DB has "resumes/file.pdf" but storage has "file.pdf"
        const { data: directData } = await supabase.storage
          .from(bucketName)
          .createSignedUrls([cleanPath], 3600);

        if (directData && directData[0] && !directData[0].error) {
           finalViewUrl = directData[0].signedUrl;
        } else {
           console.warn('[ResumeFetch] Clean path failed. Trying original...');
           
           // --- Strategy 2: Direct Fetch (Original Path) ---
           // Fallback in case the file actually resides in a subfolder "resumes/"
           if (cleanPath !== originalPath) {
               const { data: originalData } = await supabase.storage
                 .from(bucketName)
                 .createSignedUrls([originalPath], 3600);
                 
               if (originalData && originalData[0] && !originalData[0].error) {
                   console.log('[ResumeFetch] Success with original path.');
                   targetPath = originalPath;
                   finalViewUrl = originalData[0].signedUrl;
               }
           }
        }

        // --- Strategy 3: Deep Search (List bucket with search param) ---
        // If exact paths fail, search for the filename in the bucket
        if (!finalViewUrl) {
            console.warn('[ResumeFetch] Direct fetches failed. Attempting deep search...');
            
            // Search for the filename specifically
            const searchName = cleanPath.split('/').pop() || cleanPath;
            
            const { data: searchResults, error: searchError } = await supabase.storage
              .from(bucketName)
              .list('', { 
                  limit: 10, 
                  search: searchName 
              });

            if (!searchError && searchResults && searchResults.length > 0) {
                // Find exact match or take first result
                const match = searchResults.find(f => f.name === searchName) || searchResults[0];
                targetPath = match.name;
                const { data: signedData } = await supabase.storage
                  .from(bucketName)
                  .createSignedUrls([match.name], 3600);
                  
                if (signedData && signedData[0] && !signedData[0].error) {
                    finalViewUrl = signedData[0].signedUrl;
                } else {
                    fetchError = signedData?.[0]?.error || "Failed to sign discovered file";
                }
            } else {
                console.error('[ResumeFetch] Deep search returned no results.', searchError);
                fetchError = "File not found in storage (Deep Search failed)";
            }
        }

        // --- Generate Download URL for whatever path worked ---
        if (finalViewUrl) {
            const { data: dlData } = await supabase.storage
              .from(bucketName)
              .createSignedUrls([targetPath], 3600, { download: true });
            
            if (dlData && dlData[0] && !dlData[0].error) {
                finalDownloadUrl = dlData[0].signedUrl;
            }
        }

        if (isMounted) {
            if (finalViewUrl) {
                setResolvedPath(targetPath);
                setViewUrl(finalViewUrl);
                setDownloadUrl(finalDownloadUrl);
            } else {
                setUrlError(fetchError || "Resume not accessible");
            }
        }

      } catch (err: any) {
        console.error("[ResumeFetch] Critical Exception:", err);
        if (isMounted) setUrlError(err.message || "Unexpected error");
      } finally {
        if (isMounted) setLoadingUrl(false);
      }
    };
    
    resolveUrls();
    return () => { isMounted = false; };
  }, [candidate]);

  const handleResumeDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      const filename = resolvedPath ? resolvedPath.split('/').pop() : 'Resume.pdf';
      link.setAttribute('download', filename || 'Resume.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReportDownload = () => {
    if (!candidate.reports) return;
    const element = document.createElement("a");
    const file = new Blob([candidate.reports], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${candidate.full_name.replace(/\s+/g, '_')}_AI_Report.txt`;
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
  };

  // --- Zoom & Page Handlers ---
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 25, 50));
  const handleZoomReset = () => setZoomLevel(100);
  
  const handlePageNext = () => setPdfPage(prev => prev + 1);
  const handlePagePrev = () => setPdfPage(prev => Math.max(prev - 1, 1));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <button onClick={onBack} className="flex items-center text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors group">
        <ArrowLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" />
        Back to Pipeline
      </button>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Profile Details */}
        <div className="lg:w-1/3 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center mb-6">
              <div className="h-16 w-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold">
                {candidate.full_name.charAt(0)}
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">{candidate.full_name}</h2>
                <StatusBadge status={candidate.status} />
              </div>
            </div>

            {/* Contact & Role Details */}
            <div className="space-y-2 mb-6 border-b border-slate-100 pb-6">
              {candidate.position_applied && (
                <div className="flex items-start text-sm text-slate-700">
                  <Briefcase className="w-3.5 h-3.5 mr-2 mt-0.5 text-indigo-500 shrink-0" />
                  <span className="font-medium">{candidate.position_applied}</span>
                </div>
              )}
              <div className="flex items-center text-sm text-slate-600">
                <Mail className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                {candidate.email}
              </div>
              <div className="flex items-center text-sm text-slate-600">
                <Phone className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                {candidate.phone}
              </div>
              {candidate.current_city && (
                <div className="flex items-center text-sm text-slate-600">
                  <MapPin className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                  {candidate.current_city}
                </div>
              )}
              {candidate.nationality && (
                <div className="flex items-center text-sm text-slate-600">
                  <Globe className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                  {candidate.nationality}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900 flex items-center border-b border-slate-100 pb-2">
                <Award className="w-4 h-4 mr-2 text-indigo-600" />
                AI Evaluation Matrix
              </h3>
              
              <div className="grid grid-cols-3 gap-2">
                <ScoreCircle score={candidate.skills_score} label="Technical" />
                <ScoreCircle score={candidate.experience_score} label="Experience" />
                <ScoreCircle score={candidate.cultural_fit_score} label="Cultural" />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                  <FileText className="w-3 h-3 mr-1" />
                  Executive Summary
                </p>
                <p className="text-sm text-slate-700 leading-relaxed italic">
                  "{candidate.summary}"
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <button 
                onClick={handleReportDownload}
                className="w-full flex items-center justify-center py-3 px-4 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-100 disabled:opacity-50"
                disabled={!candidate.reports}
              >
                <Download className="w-4 h-4 mr-2" />
                Download AI Report
              </button>
              <button 
                onClick={handleResumeDownload}
                className="w-full flex items-center justify-center py-3 px-4 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                disabled={!downloadUrl}
              >
                <FileText className="w-4 h-4 mr-2" />
                {loadingUrl ? 'Scanning Storage...' : 'Download Resume (PDF)'}
              </button>
            </div>
          </div>
        </div>

        {/* Resume Preview */}
        <div className="lg:w-2/3">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm h-[800px] flex flex-col relative">
            
            {/* Toolbar */}
             <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-sm z-10 shrink-0 h-12">
               <div className="flex items-center space-x-1">
                 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-3 hidden sm:block">Preview</h3>
                 <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                    <button 
                      onClick={handlePagePrev} 
                      disabled={pdfPage <= 1}
                      className="p-1 hover:bg-white rounded-md text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-700 w-12 text-center select-none">
                      Page {pdfPage}
                    </span>
                    <button 
                       onClick={handlePageNext}
                       className="p-1 hover:bg-white rounded-md text-slate-500 hover:text-indigo-600 transition-all"
                       title="Next Page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                 </div>
               </div>

               <div className="flex items-center space-x-2">
                 <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                    <button 
                      onClick={handleZoomOut}
                      className="p-1 hover:bg-white rounded-md text-slate-500 hover:text-indigo-600 transition-all"
                      title="Zoom Out"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-700 w-12 text-center select-none">
                      {zoomLevel}%
                    </span>
                    <button 
                      onClick={handleZoomIn}
                      className="p-1 hover:bg-white rounded-md text-slate-500 hover:text-indigo-600 transition-all"
                      title="Zoom In"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                 </div>
                 <button 
                   onClick={handleZoomReset}
                   className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                   title="Reset Zoom"
                 >
                   <RotateCcw className="w-3.5 h-3.5" />
                 </button>
                 <div className="w-px h-4 bg-slate-200 mx-1"></div>
                 {viewUrl && (
                  <a 
                    href={viewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                    title="Open in New Tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
               </div>
            </div>

            <div className="flex-1 bg-slate-100 overflow-auto relative">
              {loadingUrl ? (
                 <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p className="text-sm font-medium">Searching Secure Storage...</p>
                 </div>
              ) : urlError ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                  <div className="bg-amber-100 p-3 rounded-full mb-4">
                    <AlertCircle className="w-8 h-8 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Resume Not Found</h3>
                  <p className="text-sm text-slate-600 mb-4 max-w-sm">
                    The system could not locate the file. It may have been deleted or the naming convention is invalid.
                  </p>
                  <div className="text-xs font-mono bg-white p-2 rounded border border-slate-200 text-slate-500 break-all max-w-md">
                     DB Record: {candidate.resume_path}
                  </div>
                </div>
              ) : viewUrl ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                  <FileSearch className="w-12 h-12 text-indigo-200" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-600 mb-4">Resume Preview</p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      <button
                        onClick={() => window.open(viewUrl, '_blank')}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Resume
                      </button>
                      <button
                        onClick={handleResumeDownload}
                        className="inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                   <p className="text-sm font-medium">No resume document available.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- App Shell ---

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'profile'>('dashboard');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!initialized) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
    </div>
  );

  if (!user) {
    return <LoginPage />;
  }

  if (user.email !== 'moconstruction@gmail.com') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-10 max-w-md w-full text-center">
          <div className="mb-4 text-rose-500">
            <AlertCircle className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-500 text-sm mb-6">
            This portal is restricted. You are signed in as <span className="font-semibold text-slate-700">{user.email}</span>, which does not have access.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center justify-center px-4 py-3 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white hidden xl:flex flex-col flex-shrink-0">
        <div className="p-8">
          <div className="flex items-center space-x-3 mb-10">
            <img src="/logo.png" alt="Recruitflow" className="h-10 w-auto rounded-lg object-contain" />
            <span className="text-xl font-black tracking-tight">Recruitflow</span>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => { setCurrentView('dashboard'); setSelectedCandidate(null); }}
              className={`w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all ${currentView === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Campaigns
            </button>
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-slate-800">
          <div className="flex items-center mb-6">
            <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-indigo-400 uppercase">
              {user.email?.charAt(0)}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-bold truncate">Recruiter</p>
              <p className="text-[10px] text-slate-500 truncate uppercase tracking-tighter">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center px-4 py-3 text-sm font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center px-8 justify-between flex-shrink-0">
          <div className="flex items-center flex-1 max-w-lg">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search candidates by name, email..." 
                className="w-full bg-slate-100 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-50 border border-slate-100 rounded-md">Enterprise Console</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            {currentView === 'dashboard' ? (
              <DashboardView 
                onSelectCandidate={(candidate) => {
                  setSelectedCandidate(candidate);
                  setCurrentView('profile');
                }} 
              />
            ) : (
              selectedCandidate && (
                <CandidateProfileView 
                  candidate={selectedCandidate} 
                  onBack={() => setCurrentView('dashboard')} 
                />
              )
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// --- Execution ---

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
