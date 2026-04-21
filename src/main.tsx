import './globals.css';
import './index.css';

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard,
  Search,
  LogOut,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { supabase, Candidate, UserProfile } from '@/types';
import { LoginPage } from '@/pages/LoginPage';
import { CampaignsView } from '@/pages/CampaignsView';
import { CandidateProfileView } from '@/pages/CandidateProfileView';
import { DashboardHomeView } from '@/pages/DashboardHomeView';

type AppView = 'home' | 'campaigns' | 'profile';

const TABLE_MAP: Record<string, string> = {
  bella_vida: 'Bella Vida campaign_candidates_duplicate',
  mo_construction: 'campaign_candidates',
  id8_technologies: 'ID8 Technologies campaign_candidates_duplicate_duplicate',
  refrane_dev: 'Refrane_dev_campaign_candidates_duplicate',
  document_warehouse: 'Document Warehouse campaign_candidates_duplicate_duplicate_dupl',
};

const TITLE_MAP: Record<string, string> = {
  bella_vida: 'Bella Vida Campaign',
  mo_construction: "Mo's Construction Campaign",
  id8_technologies: 'ID8 Technologies Campaign',
  refrane_dev: 'Refrane Dev Campaign',
  document_warehouse: 'Document Warehouse Campaign',
};

// Email-based company mapping — takes precedence over the users table
const EMAIL_TO_COMPANY: Record<string, string> = {
  'refranedev@gmail.com': 'refrane_dev',
  'rentia@documentwarehouse.com.na': 'document_warehouse',
};

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const handleAuthStateChange = async (authUser: any) => {
      setUser(authUser);
      setProfileLoading(true);

      if (authUser) {
        const emailCompany = authUser.email ? EMAIL_TO_COMPANY[authUser.email] : null;
        if (emailCompany) {
          setUserProfile({
            id: authUser.id,
            email: authUser.email,
            company_name: emailCompany,
          });
        } else {
          const { data: profile } = await supabase
            .from('users')
            .select('id, email, company_name')
            .eq('id', authUser.id)
            .single();
          setUserProfile(profile || null);
        }
      } else {
        setUserProfile(null);
      }

      setProfileLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange(session?.user ?? null);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthStateChange(session?.user ?? null);
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

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-10 max-w-md w-full text-center">
          <div className="mb-4 text-rose-500">
            <AlertCircle className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Profile Not Configured</h2>
          <p className="text-slate-500 text-sm mb-6">
            Your user profile is not set up in the system. Please contact your administrator.
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

  const tableName = TABLE_MAP[userProfile.company_name] ?? 'campaign_candidates';
  const campaignTitle = TITLE_MAP[userProfile.company_name] ?? 'Campaign';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
        <div className="p-8">
          <div className="flex items-center space-x-3 mb-10">
            <img src="/logo.png" alt="Recruitflow" className="h-10 w-auto rounded-lg object-contain" />
            <span className="text-xl font-black tracking-tight">Recruitflow</span>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => { setCurrentView('home'); setSelectedCandidate(null); }}
              className={`w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all ${currentView === 'home' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Dashboard
            </button>
            <button
              onClick={() => { setCurrentView('campaigns'); setSelectedCandidate(null); }}
              className={`w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all ${(currentView === 'campaigns' || currentView === 'profile') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Campaigns
            </button>
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-slate-800">
          <div className="flex items-center mb-6">
            <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-indigo-400 uppercase">
              {userProfile.company_name?.charAt(0)}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-bold truncate">Recruiter</p>
              <p className="text-[10px] text-slate-500 truncate uppercase tracking-tighter">{userProfile.company_name}</p>
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
            {currentView === 'home' && (
              <DashboardHomeView
                onNavigateToCampaigns={() => setCurrentView('campaigns')}
                tableName={tableName}
              />
            )}
            {currentView === 'campaigns' && (
              <CampaignsView
                onSelectCandidate={(candidate) => {
                  setSelectedCandidate(candidate);
                  setCurrentView('profile');
                }}
                tableName={tableName}
                campaignTitle={campaignTitle}
              />
            )}
            {currentView === 'profile' && selectedCandidate && (
              <CandidateProfileView
                candidate={selectedCandidate}
                onBack={() => setCurrentView('campaigns')}
              />
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
