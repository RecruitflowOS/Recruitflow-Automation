
import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Download, 
  ChevronRight, 
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
  ShieldCheck,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileSearch
} from 'lucide-react';

// --- Supabase Client Initialization ---
const SUPABASE_URL = 'https://bebiojwkjnyyccnlqjge.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlYmlvandram55eWNjbmxxamdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDMwNTksImV4cCI6MjA4NTExOTA1OX0.-vsjqytJI9XACqdaLdQ4VKQ3Mf7ZgNFWm36_1jvim4Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  resume_path: string | null; // Mapped from 'cv_file_name' in DB, can be null
  reports?: string;    // Mapped from 'report' in DB
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
          <div className="bg-indigo-600 p-3 rounded-xl shadow-lg shadow-indigo-200">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
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

const DashboardView = ({ onSelectCandidate }: { onSelectCandidate: (c: Candidate) => void }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    
    // Fetch all columns to handle mapping in code
    // Ordering by 'score' as seen in DB schema (was 'total_score' in original types)
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('score', { ascending: false });
    
    if (error) {
      console.error('Fetch error:', error);
      setError(error.message);
    } else if (data) {
      // MAP DATABASE COLUMNS TO FRONTEND INTERFACE
      const mappedCandidates: Candidate[] = data.map((item: any) => ({
        id: item.id,
        full_name: item.full_name,
        email: item.email || 'N/A',
        phone: item.phone || 'N/A',
        // Map 'score' from DB to 'total_score'
        total_score: item.score ?? 0,
        // Normalize Status (handle 'unqualified' lowercase from DB)
        status: normalizeStatus(item.status),
        // Map 'cv_file_name' from DB to 'resume_path'
        resume_path: item.cv_file_name ? item.cv_file_name.trim() : null,
        // Map 'report' (singular) from DB to 'reports' (plural in type)
        reports: item.report,
        summary: item.summary || 'No summary available.',
        // Use total score for sub-scores if specific columns missing in DB view
        skills_score: item.score ?? 0,
        experience_score: item.score ?? 0,
        cultural_fit_score: item.score ?? 0,
      }));
      setCandidates(mappedCandidates);
    }
    setLoading(false);
  };

  const normalizeStatus = (dbStatus: string): QualificationStatus => {
    if (!dbStatus) return 'Pending';
    const lower = dbStatus.toLowerCase();
    if (lower === 'qualified') return 'Qualified';
    if (lower === 'unqualified') return 'Unqualified';
    return 'Pending';
  };

  useEffect(() => { fetchCandidates(); }, []);

  const handleDownloadTop10 = () => {
    if (candidates.length === 0) return;
    
    const top10 = candidates.slice(0, 10);
    const reportContent = 
      "TOP 10 CANDIDATE REPORT - AI ENGINEERING LEAD CAMPAIGN\n" +
      "====================================================\n\n" +
      top10.map((c, i) => 
        `RANK #${i+1}: ${c.full_name}\n` +
        `Total Score: ${c.total_score}%\n` +
        `Status: ${c.status}\n` +
        `Email: ${c.email}\n` +
        `Phone: ${c.phone}\n` +
        `Scores: Tech ${c.skills_score} | Exp ${c.experience_score} | Culture ${c.cultural_fit_score}\n` +
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
        onClick={fetchCandidates}
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
          <h1 className="text-2xl font-bold text-slate-900">Campaign: AI Engineering Lead</h1>
          <p className="text-slate-500 mt-1">Sorting by highest AI score (Total Score DESC)</p>
        </div>
        <button 
          onClick={handleDownloadTop10}
          disabled={candidates.length === 0}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Top 10 Report
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
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
                        <div className="text-xs text-slate-500 font-medium uppercase tracking-tight">ID_{candidate.id.slice(0,6)}</div>
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
              )))}
            </tbody>
          </table>
        </div>
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

  useEffect(() => {
    let isMounted = true;
    const resolveUrls = async () => {
      if (!candidate.resume_path) return;
      
      setLoadingUrl(true);
      setUrlError(null);
      setResolvedPath(null);
      
      let targetPath = candidate.resume_path;
      
      console.log(`[ResumeFetch] Initial path: "${targetPath}"`);

      try {
        // --- STEP 1: Attempt direct fetch ---
        // Try to get the signed URL directly. 
        let { data: viewData } = await supabase.storage
          .from('resumes')
          .createSignedUrls([targetPath], 3600);

        // --- STEP 2: Smart Recovery (If direct fetch fails) ---
        // If the direct fetch returned an error (file not found), try to find the "real" filename
        if (viewData && viewData[0] && viewData[0].error) {
          console.warn(`[ResumeFetch] Direct fetch failed: ${viewData[0].error}. Attempting smart recovery...`);
          
          // List files in the bucket to find a match
          // Note: limiting to 100 files for performance, adjust if bucket is huge
          const { data: fileList, error: listError } = await supabase.storage
            .from('resumes')
            .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });

          if (!listError && fileList) {
             // Create a "normalized" version of the target path for comparison
             // Remove special chars, spaces, convert to lower case
             const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9.]/g, '');
             const targetNormalized = normalize(targetPath);

             // Find a file that matches roughly
             const match = fileList.find(f => normalize(f.name) === targetNormalized);

             if (match) {
                console.log(`[ResumeFetch] Smart recovery found match! "${targetPath}" -> "${match.name}"`);
                targetPath = match.name; // Update target path to the real file name found in storage
                
                // Retry fetching with the corrected path
                const { data: retryData } = await supabase.storage
                  .from('resumes')
                  .createSignedUrls([targetPath], 3600);
                  
                viewData = retryData;
             } else {
                console.warn(`[ResumeFetch] No fuzzy match found for ${targetPath}`);
             }
          }
        }

        // --- STEP 3: Generate URLs with final resolved path ---
        if (isMounted) {
            setResolvedPath(targetPath); // Store the actual working path for download buttons

            // Check View URL result
            if (viewData && viewData[0]) {
               if (viewData[0].error) {
                 console.error('[ResumeFetch] Final Error:', viewData[0].error);
                 setUrlError(viewData[0].error);
               } else {
                 setViewUrl(viewData[0].signedUrl);
               }
            }

            // Generate Download URL with the (potentially corrected) path
            const { data: downloadData } = await supabase.storage
              .from('resumes')
              .createSignedUrls([targetPath], 3600, { download: true });
              
            if (downloadData && downloadData[0] && !downloadData[0].error) {
               setDownloadUrl(downloadData[0].signedUrl);
            }
        }

      } catch (err: any) {
        console.error("[ResumeFetch] Critical Exception:", err);
        if (isMounted) setUrlError(err.message || "Failed to generate secure link");
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
      // Use the resolved path (real filename) for the download
      const filename = resolvedPath ? resolvedPath.split('/').pop() : 'Resume.pdf';
      link.setAttribute('download', filename || 'Resume.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReportDownload = () => {
    if (!candidate.reports) return;
    
    // Create a blob from the text content and trigger download
    const element = document.createElement("a");
    const file = new Blob([candidate.reports], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${candidate.full_name.replace(/\s+/g, '_')}_AI_Report.txt`;
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
  };

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
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm h-[800px] flex flex-col">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-700 flex items-center uppercase tracking-wide">
                Candidate Resume Preview
              </h3>
              <div className="flex items-center space-x-3">
                {resolvedPath && resolvedPath !== candidate.resume_path && (
                   <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center font-medium" title={`Original: ${candidate.resume_path}`}>
                      <FileSearch className="w-3 h-3 mr-1" />
                      Auto-Resolved
                   </span>
                )}
                {viewUrl && (
                  <a 
                    href={viewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs font-bold text-indigo-600 flex items-center hover:underline"
                  >
                    Open in New Tab
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex-1 bg-slate-100">
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
                <iframe 
                  src={`${viewUrl}#toolbar=0`} 
                  className="w-full h-full border-none" 
                  title="PDF Preview" 
                />
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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white hidden xl:flex flex-col flex-shrink-0">
        <div className="p-8">
          <div className="flex items-center space-x-3 mb-10">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-tight">AI-RECRUIT</span>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => { setCurrentView('dashboard'); setSelectedCandidate(null); }}
              className={`w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all ${currentView === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Dashboard
            </button>
            <button className="w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <Users className="w-5 h-5 mr-3" />
              Qualified Leads
            </button>
            <button className="w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <BarChart3 className="w-5 h-5 mr-3" />
              Reports
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
