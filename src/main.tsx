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
import { supabase, Candidate } from '@/types';
import { LoginPage } from '@/pages/LoginPage';
import { CampaignsView } from '@/pages/CampaignsView';
import { CandidateProfileView } from '@/pages/CandidateProfileView';
import { DashboardHomeView } from '@/pages/DashboardHomeView';

type AppView = 'home' | 'campaigns' | 'profile';

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState<AppView>('home');
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
            {currentView === 'home' && (
              <DashboardHomeView onNavigateToCampaigns={() => setCurrentView('campaigns')} />
            )}
            {currentView === 'campaigns' && (
              <CampaignsView
                onSelectCandidate={(candidate) => {
                  setSelectedCandidate(candidate);
                  setCurrentView('profile');
                }}
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
