
import React, { useState } from 'react';
import { JobListing, GroundingSource } from './types';
import { searchJobsWithGemini } from './services/gemini';
import JobCard from './components/JobCard';
import JobTable from './components/JobTable';

const SCRAPE_GOAL = 1000;

interface LogEntry {
  id: string;
  time: string;
  msg: string;
  type: 'info' | 'success' | 'error' | 'export';
}

const App: React.FC = () => {
  const [jobTitle, setJobTitle] = useState('Senior Python Automation Engineer');
  const [location, setLocation] = useState('Remote');
  const [loading, setLoading] = useState(false);
  const [allJobs, setAllJobs] = useState<JobListing[]>([]);
  const [allSources, setAllSources] = useState<GroundingSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' | 'export' = 'info') => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      msg,
      type
    };
    setLogs(prev => [entry, ...prev].slice(0, 15));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim()) {
      addLog("System.Auth: Intelligence target missing.", "error");
      return;
    }
    setLoading(true);
    setError(null);
    addLog(`Initiating node discovery for "${jobTitle}"...`, 'info');
    
    try {
      const data = await searchJobsWithGemini(jobTitle, location);
      
      setAllJobs(prev => {
        const existingLinks = new Set(prev.map(j => j.applyLink));
        const newUniqueJobs = data.jobs.filter(j => !existingLinks.has(j.applyLink));
        
        if (newUniqueJobs.length === 0) {
          addLog("Update: Scan yielded 0 new unique identifiers.", "info");
        } else {
          addLog(`Update: ${newUniqueJobs.length} new unique identifiers injected into local store.`, 'success');
        }
        
        return [...prev, ...newUniqueJobs];
      });

      setAllSources(prev => {
        const existingUris = new Set(prev.map(s => s.uri));
        const newUniqueSources = data.sources.filter(s => !existingUris.has(s.uri));
        return [...prev, ...newUniqueSources];
      });

    } catch (err) {
      const errMsg = "Crawler obstructed. Protocol reset required.";
      setError(errMsg);
      addLog(errMsg, 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = () => {
    // Immediate state reset for better UX
    setAllJobs([]);
    setAllSources([]);
    addLog("Memory scrubbed. Database reset complete.", "info");
  };

  const exportToExcel = () => {
    if (allJobs.length === 0) return;
    
    addLog(`Generating secure CSV dump for ${allJobs.length} records...`, 'export');
    
    const headers = ["Company", "Job Title", "Date Posted", "Location", "Email", "Apply Link", "Maps Search URL"];
    const rows = allJobs.map(j => [
      `"${(j.company || '').replace(/"/g, '""')}"`,
      `"${(j.title || '').replace(/"/g, '""')}"`,
      `"${(j.datePosted || '').replace(/"/g, '""')}"`,
      `"${(j.location || '').replace(/"/g, '""')}"`,
      `"${(j.email || '').replace(/"/g, '""')}"`,
      `"${(j.applyLink || '').replace(/"/g, '""')}"`,
      `"${(j.mapUrl || '').replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Construct descriptive filename: jobTitle_location_timestamp.csv
    const sanitize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/T/, '_').replace(/:/g, '-');
    const fileName = `JobFlow_${sanitize(jobTitle)}_${sanitize(location)}_${timestamp}.csv`;
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addLog("Export complete. File transmission successful.", "success");
  };

  const progress = Math.min((allJobs.length / SCRAPE_GOAL) * 100, 100);

  return (
    <div className="flex flex-col min-h-screen text-slate-100">
      {/* Premium Navbar */}
      <nav className="sticky top-0 z-50 bg-slate-900/40 backdrop-blur-2xl border-b border-slate-800/40 px-6 md:px-10 py-4">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-800 rounded-xl flex items-center justify-center text-white shadow-[0_0_30px_rgba(79,70,229,0.2)] border border-indigo-400/30">
              <i className="fas fa-terminal text-lg"></i>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black tracking-tighter text-white leading-none">JOBFLOW<span className="text-indigo-500 font-light">PRO</span></h1>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] mt-0.5 block">AUTOMATION TERMINAL</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {allJobs.length > 0 && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={clearAllData}
                  className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white text-[10px] font-black rounded-xl transition-all border border-rose-600/30 active:scale-95 flex items-center gap-2.5"
                  title="Wipe Local Data"
                >
                  <i className="fas fa-trash-can text-xs"></i>
                  <span>CLEAR</span>
                </button>
                <button 
                  onClick={exportToExcel}
                  className="relative overflow-hidden group flex items-center gap-2.5 px-6 py-2 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white text-[10px] font-black rounded-xl transition-all border border-emerald-600/30 active:scale-95"
                >
                  <i className="fas fa-file-excel text-xs"></i>
                  <span>EXPORT.XL</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-[1440px] mx-auto px-6 md:px-10 py-8 w-full space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 space-y-8">
            {/* Intelligence Targetting Card */}
            <div className="bg-slate-900/60 border border-slate-800/80 p-8 md:p-10 rounded-[2.5rem] shadow-2xl backdrop-blur-3xl relative overflow-hidden scanline transition-colors">
              <div className="mb-8 relative z-10">
                <div className="flex items-center gap-4 mb-3">
                  <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tighter">Target Discovery</h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Protocol Active</span>
                  </div>
                  <p className="text-slate-400 text-xs font-medium opacity-80">Autonomous deduplication and mapping engaged.</p>
                </div>
              </div>

              <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                <div className="space-y-3 group/field">
                  <div className="flex items-center justify-between px-3">
                    <label className="text-[10px] font-black text-slate-500 group-focus-within/field:text-indigo-400 transition-colors uppercase tracking-[0.4em]">Intelligence Focus</label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <i className="fas fa-microchip text-slate-600 group-focus-within/field:text-indigo-400 transition-colors text-base"></i>
                    </div>
                    <input 
                      type="text" 
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="futuristic-input w-full pl-12 pr-6 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl focus:outline-none transition-all font-bold text-sm text-white placeholder-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-3 group/field">
                  <div className="flex items-center justify-between px-3">
                    <label className="text-[10px] font-black text-slate-500 group-focus-within/field:text-indigo-400 transition-colors uppercase tracking-[0.4em]">Geospatial Origin</label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <i className="fas fa-location-crosshairs text-slate-600 group-focus-within/field:text-indigo-400 transition-colors text-base"></i>
                    </div>
                    <input 
                      type="text" 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="futuristic-input w-full pl-12 pr-6 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl focus:outline-none transition-all font-bold text-sm text-white placeholder-slate-800"
                    />
                  </div>
                </div>

                <button 
                  disabled={loading}
                  type="submit"
                  className="md:col-span-2 group relative overflow-hidden w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-600 bg-[length:200%_auto] hover:bg-right disabled:from-slate-800 disabled:to-slate-900 text-white font-black rounded-2xl transition-all duration-700 shadow-lg shadow-indigo-500/20 active:scale-[0.98] flex items-center justify-center gap-4 text-sm tracking-[0.2em] uppercase"
                >
                  {loading ? (
                    <><i className="fas fa-atom fa-spin"></i> Processing...</>
                  ) : (
                    <><i className="fas fa-bolt-lightning text-base"></i> Run Scrape Protocol</>
                  )}
                </button>
              </form>
            </div>

            {/* Performance Tracker */}
            <div className="bg-slate-900/40 border border-slate-800/40 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-10 backdrop-blur-xl">
              <div className="shrink-0 flex flex-col items-center md:items-start">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Buffer Utilization</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white tabular-nums tracking-tighter">{allJobs.length}</span>
                  <span className="text-slate-600 font-bold text-lg">/ {SCRAPE_GOAL}</span>
                </div>
              </div>
              <div className="flex-1 w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 bg-[length:200%_auto] animate-gradient transition-all duration-1000 ease-in-out" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="shrink-0 text-center md:text-right">
                <div className="px-4 py-1.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 inline-block mb-1">
                  <span className="text-base font-black text-indigo-400 tabular-nums">{progress.toFixed(1)}%</span>
                </div>
                <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Efficiency Index</p>
              </div>
            </div>
          </div>

          {/* Side Panel: Console */}
          <div className="lg:col-span-4 h-full">
            <div className="bg-slate-950 border border-slate-800/80 rounded-[2.5rem] p-7 shadow-2xl flex flex-col h-[450px] lg:h-[650px] relative overflow-hidden group/console">
              <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none opacity-50"></div>
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.8)]"></div>
                  <h3 className="text-[10px] font-black text-white uppercase tracking-[0.5em]">System_Log</h3>
                </div>
                <button 
                  onClick={() => setLogs([])} 
                  className="px-3 py-1.5 text-[9px] text-slate-600 font-black hover:text-white transition-all uppercase tracking-widest"
                >
                  Flush
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto code-font text-[10px] space-y-3.5 pr-2 scrollbar-hide relative z-10">
                {logs.length === 0 ? (
                  <div className="text-slate-800 italic select-none text-center pt-16 uppercase font-black tracking-widest">Awaiting nodes...</div>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="flex gap-3 leading-relaxed group animate-in slide-in-from-left-4 duration-500">
                      <span className="text-slate-700 shrink-0 select-none font-bold">[{log.time}]</span>
                      <span className={`
                        ${log.type === 'success' ? 'text-emerald-400/90 font-bold' : ''}
                        ${log.type === 'error' ? 'text-rose-400/90 font-bold' : ''}
                        ${log.type === 'export' ? 'text-blue-400/90 font-bold' : 'text-slate-500'}
                        group-hover:brightness-125 transition-all
                      `}>
                        <span className="opacity-40 mr-1.5 font-black">{log.type === 'info' ? '>>' : log.type === 'success' ? 'OK' : 'ERR'}</span>
                        {log.msg}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 flex items-center gap-6 animate-in zoom-in-95 duration-500 shadow-2xl">
            <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/10">
              <i className="fas fa-triangle-exclamation text-2xl"></i>
            </div>
            <div>
              <p className="font-black text-lg tracking-tighter leading-none mb-1 uppercase">CRITICAL BREACH: PROTOCOL HALTED</p>
              <p className="text-xs font-medium opacity-70 italic tracking-wide">{error}</p>
            </div>
          </div>
        )}

        {/* Intelligence Visualization */}
        {allJobs.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900/40 p-6 rounded-[2.5rem] border border-slate-800/40 backdrop-blur-3xl shadow-sm">
              <div className="flex items-center gap-8">
                <div className="text-center md:text-left">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] block mb-1.5">Stored Intelligence</span>
                  <h3 className="text-2xl font-black text-white leading-none tracking-tighter">{allJobs.length} Unique Datasets</h3>
                </div>
                <div className="h-12 w-px bg-slate-800/60 hidden sm:block"></div>
                <div className="hidden lg:flex flex-col">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-1.5">Origin Port</span>
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-2.5">
                    <i className="fas fa-network-wired text-indigo-500/40"></i>
                    {jobTitle} <span className="text-slate-800">/</span> {location}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-1.5 bg-slate-950/50 rounded-2xl border border-slate-800/60">
                <button 
                  onClick={() => setViewMode('table')}
                  className={`group px-6 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2.5 ${viewMode === 'table' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-900'}`}
                >
                  <i className="fas fa-list-ul text-xs"></i> <span>DASHBOARD</span>
                </button>
                <button 
                  onClick={() => setViewMode('cards')}
                  className={`group px-6 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2.5 ${viewMode === 'cards' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-900'}`}
                >
                  <i className="fas fa-table-cells text-xs"></i> <span>GRID_VIS</span>
                </button>
              </div>
            </div>

            <div className="min-h-[500px]">
              {viewMode === 'table' ? (
                <JobTable jobs={allJobs} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {allJobs.map((job, idx) => (
                    <JobCard key={idx} job={job} />
                  ))}
                </div>
              )}
            </div>

            {/* Source Index List */}
            {allSources.length > 0 && (
              <div className="bg-slate-950/40 border border-slate-800/40 rounded-[3rem] p-10 space-y-8 relative overflow-hidden">
                <div className="absolute -bottom-16 -right-16 p-32 opacity-[0.02] pointer-events-none">
                  <i className="fas fa-fingerprint text-[200px] text-white"></i>
                </div>
                
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <i className="fas fa-shield-halved text-indigo-400 text-lg"></i>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-[0.4em]">Node Intelligence Index</h4>
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Global source cross-reference active</p>
                    </div>
                  </div>
                  <span className="px-5 py-1.5 bg-slate-900 rounded-full border border-slate-800 text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase">
                    {allSources.length} Origins Verified
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-4 scrollbar-hide relative z-10">
                  {allSources.map((source, idx) => (
                    <a 
                      key={idx} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3.5 p-4 bg-slate-900/40 hover:bg-indigo-600/10 rounded-[1.25rem] border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-300 overflow-hidden shadow-sm"
                    >
                      <i className="fas fa-link text-slate-700 group-hover:text-indigo-400 text-[10px] transition-transform group-hover:rotate-12"></i>
                      <span className="text-[10px] font-black text-slate-600 group-hover:text-slate-200 truncate tracking-tight">{source.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && allJobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center group">
            <div className="relative mb-12">
              <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-[100px] scale-150 group-hover:scale-[2] transition-transform duration-1000"></div>
              <div className="w-28 h-28 bg-slate-950 border border-slate-800/80 rounded-[2.5rem] flex items-center justify-center relative shadow-3xl group-hover:border-indigo-500/50 transition-colors duration-700">
                <i className="fas fa-radar text-5xl text-slate-800 animate-pulse group-hover:text-indigo-900 transition-colors"></i>
              </div>
            </div>
            <h3 className="text-3xl font-black text-white mb-3 tracking-tighter">Terminal Standby</h3>
            <p className="text-slate-500 max-w-sm font-medium text-base leading-relaxed opacity-60">
              Input discovery parameters above to initiate high-frequency intelligence extraction.
            </p>
          </div>
        )}
      </main>

      <footer className="bg-slate-950 border-t border-slate-900 px-10 py-16 mt-auto">
        <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row justify-between items-center gap-12">
          <div className="flex flex-col items-center lg:items-start gap-4 text-center lg:text-left">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-indigo-600 rounded flex items-center justify-center">
                <i className="fas fa-code text-[10px] text-white"></i>
              </div>
              <p className="text-sm font-black text-white uppercase tracking-[0.5em]">JOBFLOW ARCHITECTURE</p>
            </div>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em] max-w-sm">Autonomous Intelligence Framework • Optimized for Python Automation Hub</p>
          </div>
          <div className="flex flex-wrap justify-center gap-10">
            <a href="#" className="text-[10px] font-black text-slate-600 hover:text-indigo-400 uppercase tracking-[0.4em] transition-all hover:translate-y-[-2px]">Terminal Docs</a>
            <a href="#" className="text-[10px] font-black text-slate-600 hover:text-indigo-400 uppercase tracking-[0.4em] transition-all hover:translate-y-[-2px]">Intelligence API</a>
            <a href="#" className="text-[10px] font-black text-slate-600 hover:text-indigo-400 uppercase tracking-[0.4em] transition-all hover:translate-y-[-2px]">Kernel Core</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
