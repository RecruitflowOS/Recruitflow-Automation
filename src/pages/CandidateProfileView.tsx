import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  Download,
  FileText,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Globe,
  ExternalLink,
  Award,
  FileSearch,
  Minus,
  Plus,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase, Candidate } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { ScoreCircle } from '@/components/ScoreCircle';

export const CandidateProfileView = ({ candidate, onBack }: { candidate: Candidate, onBack: () => void }) => {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

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
      const cleanPath = originalPath.replace(/^resumes\//, '');

      let targetPath = cleanPath;
      let finalViewUrl: string | null = null;
      let finalDownloadUrl: string | null = null;
      let fetchError: string | null = null;

      try {
        // --- Strategy 1: Direct Fetch (Clean Path) ---
        const { data: directData } = await supabase.storage
          .from(bucketName)
          .createSignedUrls([cleanPath], 3600);

        if (directData && directData[0] && !directData[0].error) {
          finalViewUrl = directData[0].signedUrl;
        } else {
          console.warn('[ResumeFetch] Clean path failed. Trying original...');

          // --- Strategy 2: Direct Fetch (Original Path) ---
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
        if (!finalViewUrl) {
          console.warn('[ResumeFetch] Direct fetches failed. Attempting deep search...');

          const searchName = cleanPath.split('/').pop() || cleanPath;

          const { data: searchResults, error: searchError } = await supabase.storage
            .from(bucketName)
            .list('', {
              limit: 10,
              search: searchName
            });

          if (!searchError && searchResults && searchResults.length > 0) {
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
  }, [candidate, retryKey]);

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
    const file = new Blob([candidate.reports], { type: 'text/plain' });
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
                  <div className="text-xs font-mono bg-white p-2 rounded border border-slate-200 text-slate-500 break-all max-w-md mb-4">
                    DB Record: {candidate.resume_path}
                  </div>
                  <button
                    onClick={() => { setUrlError(null); setRetryKey(k => k + 1); }}
                    className="mt-4 flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </button>
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
