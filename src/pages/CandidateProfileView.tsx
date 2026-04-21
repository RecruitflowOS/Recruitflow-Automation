import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Award,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { supabase, Candidate } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { ScoreCircle } from '@/components/ScoreCircle';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export const CandidateProfileView = ({ candidate, onBack }: { candidate: Candidate, onBack: () => void }) => {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const resolveUrls = async () => {
      if (!candidate.resume_path) return;

      setLoadingUrl(true);
      setUrlError(null);
      setResolvedPath(null);
      setNumPages(null);
      setPageNumber(1);
      setPdfError(null);

      const bucketName = 'resumes';
      const originalPath = candidate.resume_path;
      const cleanPath = originalPath.replace(/^resumes\//, '');

      let targetPath = cleanPath;
      let finalViewUrl: string | null = null;
      let finalDownloadUrl: string | null = null;
      let fetchError: string | null = null;

      try {
        const { data: directData } = await supabase.storage
          .from(bucketName)
          .createSignedUrls([cleanPath], 3600);

        if (directData && directData[0] && !directData[0].error) {
          finalViewUrl = directData[0].signedUrl;
        } else {
          if (cleanPath !== originalPath) {
            const { data: originalData } = await supabase.storage
              .from(bucketName)
              .createSignedUrls([originalPath], 3600);

            if (originalData && originalData[0] && !originalData[0].error) {
              targetPath = originalPath;
              finalViewUrl = originalData[0].signedUrl;
            }
          }
        }

        if (!finalViewUrl) {
          const searchName = cleanPath.split('/').pop() || cleanPath;
          const { data: searchResults, error: searchError } = await supabase.storage
            .from(bucketName)
            .list('', { limit: 10, search: searchName });

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
            fetchError = "File not found in storage";
          }
        }

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

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setPdfError(null);
  }, []);

  const onDocumentLoadError = useCallback(() => {
    setPdfError("Could not render this PDF. Try downloading it instead.");
  }, []);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
      <button onClick={onBack} className="flex items-center text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors group">
        <ArrowLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" />
        Back to Pipeline
      </button>

      {/* Compact candidate header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
            {candidate.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 leading-tight">{candidate.full_name}</h2>
              <StatusBadge status={candidate.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
              {candidate.position_applied && (
                <span className="flex items-center text-xs text-slate-600">
                  <Briefcase className="w-3 h-3 mr-1 text-indigo-400" />{candidate.position_applied}
                </span>
              )}
              <span className="flex items-center text-xs text-slate-600">
                <Mail className="w-3 h-3 mr-1 text-slate-400" />{candidate.email}
              </span>
              <span className="flex items-center text-xs text-slate-600">
                <Phone className="w-3 h-3 mr-1 text-slate-400" />{candidate.phone}
              </span>
              {candidate.current_city && (
                <span className="flex items-center text-xs text-slate-600">
                  <MapPin className="w-3 h-3 mr-1 text-slate-400" />{candidate.current_city}
                </span>
              )}
              {candidate.nationality && (
                <span className="flex items-center text-xs text-slate-600">
                  <Globe className="w-3 h-3 mr-1 text-slate-400" />{candidate.nationality}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleReportDownload}
              disabled={!candidate.reports}
              className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              AI Report
            </button>
            <button
              onClick={handleResumeDownload}
              disabled={!downloadUrl}
              className="flex items-center px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-xs hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              {loadingUrl ? 'Loading...' : 'Download CV'}
            </button>
          </div>
        </div>
      </div>

      {/* AI Evaluation + Resume side by side */}
      <div className="flex flex-col lg:flex-row gap-4" style={{ height: 'calc(100vh - 260px)', minHeight: '500px' }}>

        {/* AI Evaluation panel */}
        <div className="lg:w-2/5 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Score */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center">
              <Award className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
              Screening Score
            </h3>
            <div className="flex justify-center">
              <ScoreCircle score={candidate.screening_score} label="Screening" />
            </div>
          </div>

          {/* Executive Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center">
              <FileText className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
              AI Executive Summary
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed italic">
              "{candidate.summary}"
            </p>
          </div>
        </div>

        {/* Resume viewer */}
        <div className="lg:w-3/5 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0 h-11">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Resume Preview</h3>
            {numPages && numPages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                  disabled={pageNumber <= 1}
                  className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-500 font-medium">{pageNumber} / {numPages}</span>
                <button
                  onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                  disabled={pageNumber >= numPages}
                  className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div ref={containerRef} className="flex-1 bg-slate-100 overflow-auto relative">
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
              <div className="flex flex-col items-center py-4 px-2">
                {pdfError ? (
                  <div className="flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                    <AlertCircle className="w-8 h-8 text-amber-600 mb-3" />
                    <p className="text-sm text-slate-600 mb-4">{pdfError}</p>
                    <button
                      onClick={handleResumeDownload}
                      disabled={!downloadUrl}
                      className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </button>
                  </div>
                ) : (
                  <Document
                    file={viewUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-sm font-medium">Rendering PDF...</p>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={containerWidth > 16 ? containerWidth - 16 : containerWidth}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                    />
                  </Document>
                )}
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
  );
};
