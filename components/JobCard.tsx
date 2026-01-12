
import React from 'react';
import { JobListing } from '../types';

interface JobCardProps {
  job: JobListing;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  return (
    <div className="group relative bg-slate-900 border border-slate-800/60 rounded-[2.5rem] p-7 transition-all duration-700 hover:border-indigo-500/50 hover:shadow-[0_20px_60px_rgba(79,70,229,0.15)] hover:-translate-y-2 flex flex-col shadow-xl backdrop-blur-3xl">
      {/* Background Icon */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:opacity-[0.08] transition-opacity duration-700">
        <i className="fas fa-cube text-6xl text-white"></i>
      </div>

      <div className="flex justify-between items-start mb-6 relative z-10 pl-2">
        <div className="space-y-1.5 pr-4 min-w-0">
          <h3 className="text-xl font-black text-white leading-none truncate group-hover:text-indigo-400 transition-colors tracking-tight">
            {job.title}
          </h3>
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] truncate mt-1">
            {job.company}
          </p>
        </div>
        <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-[9px] font-black text-slate-600 whitespace-nowrap uppercase tracking-widest shrink-0 shadow-sm border-white/5">
          {job.datePosted}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2.5 mb-6 relative z-10">
        <a 
          href={job.mapUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="group/btn flex items-center gap-2.5 px-4 py-2 bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 rounded-xl text-[10px] font-black text-slate-500 hover:text-indigo-400 transition-all shadow-inner active:scale-95"
        >
          <i className="fas fa-location-dot transition-transform group-hover/btn:scale-110"></i>
          <span className="tracking-widest uppercase">{job.location || 'REMOTE'}</span>
        </a>
        {job.email && (
          <div className="flex items-center gap-2.5 px-4 py-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-[10px] font-black text-indigo-400/80 tracking-widest uppercase shadow-sm">
            <i className="fas fa-envelope"></i>
            {job.email}
          </div>
        )}
      </div>

      <div className="relative mb-8 flex-1">
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 italic opacity-60 group-hover:opacity-100 transition-opacity duration-500">
          {job.descriptionSnippet || "Node summary encrypted. Access port verification required for full data extraction."}
        </p>
      </div>

      <a 
        href={job.applyLink} 
        target="_blank" 
        rel="noopener noreferrer"
        className="group/apply relative overflow-hidden flex items-center justify-center gap-3 w-full py-3.5 bg-black hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all duration-500 shadow-xl border border-slate-800 hover:border-indigo-400/30 active:scale-[0.98]"
      >
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/apply:opacity-100 transition-opacity"></div>
        <span className="relative z-10">ENGAGE PORTAL</span>
        <i className="fas fa-arrow-right text-[10px] relative z-10 transition-transform group-hover/apply:translate-x-1"></i>
      </a>
    </div>
  );
};

export default JobCard;
