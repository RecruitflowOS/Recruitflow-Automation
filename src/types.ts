import { createClient } from '@supabase/supabase-js';

// --- Supabase Client Initialization ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Please check .env.local or Vercel environment configuration.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
    flowType: 'implicit'
  }
});

// --- Types ---

export interface UserProfile {
  id: string;
  email: string;
  company_name: string;
}

export type QualificationStatus = 'Qualified' | 'Unqualified' | 'Pending';

export interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  screening_score: number;
  status: QualificationStatus;
  summary: string;
  resume_path: string | null;
  reports?: string;
  position_applied?: string;
  nationality?: string;
  current_city?: string;
}

// --- Constants ---

export const ITEMS_PER_PAGE = 10;

// --- Utilities ---

export const normalizeStatus = (dbStatus: string): QualificationStatus => {
  if (!dbStatus) return 'Pending';
  const lower = dbStatus.toLowerCase();
  if (lower === 'qualified') return 'Qualified';
  if (lower === 'unqualified') return 'Unqualified';
  return 'Pending';
};

export const mapCandidate = (item: any): Candidate => ({
  id: item.id,
  full_name: item.full_name,
  email: item.email || 'N/A',
  phone: item.phone || 'N/A',
  screening_score: item.screening_score ?? 0,
  status: normalizeStatus(item.screening_status),
  resume_path: item.resume_url ? item.resume_url.trim() : null,
  reports: item.screening_report,
  summary: item.screening_summary || 'No summary available.',
  position_applied: item.position_applied || undefined,
  nationality: item.nationality || undefined,
  current_city: item.current_city || undefined,
});
