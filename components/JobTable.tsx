
import React from 'react';
import { JobListing } from '../types';

interface JobTableProps {
  jobs: JobListing[];
  sortKey: string;
  sortOrder: 'asc' | 'desc';
  onSort: (key: 'company' | 'title' | 'datePosted') => void;
}

const JobTable: React.FC<JobTableProps> = ({ jobs, sortKey, sortOrder, onSort }) => {
  const renderSortIcon = (key: string) => {
    if (sortKey !== key) return <i className="fas fa-sort ml-2 opacity-20 group-hover/th:opacity-50"></i>;
    return <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'} ml-2 text-indigo-400`}></i>;
  };

  return (
    <div className="bg-slate-950/60 backdrop-blur-3xl rounded-[2.5rem] border border-slate-800/80 overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800/60">
              <th 
                className="w-60 px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] cursor-pointer hover:bg-slate-900 group/th transition-colors"
                onClick={() => onSort('company')}
              >
                <div className="flex items-center">
                  Corporation {renderSortIcon('company')}
                </div>
              </th>
              <th 
                className="w-80 px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] cursor-pointer hover:bg-slate-900 group/th transition-colors"
                onClick={() => onSort('title')}
              >
                <div className="flex items-center">
                  Assignment {renderSortIcon('title')}
                </div>
              </th>
              <th className="w-56 px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Coordinates</th>
              <th 
                className="w-36 px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] cursor-pointer hover:bg-slate-900 group/th transition-colors"
                onClick={() => onSort('datePosted')}
              >
                <div className="flex items-center">
                  Stamp {renderSortIcon('datePosted')}
                </div>
              </th>
              <th className="w-60 px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Comm Link</th>
              <th className="w-28 px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] text-right">Gate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/30">
            {jobs.map((job, idx) => (
              <tr key={idx} className="hover:bg-indigo-500/[0.03] transition-all group/row">
                <td className="px-10 py-6 truncate">
                  <span className={`text-sm font-black tracking-tight transition-colors ${sortKey === 'company' ? 'text-indigo-400' : 'text-white group-hover/row:text-indigo-400'}`}>
                    {job.company}
                  </span>
                </td>
                <td className="px-10 py-6 truncate">
                  <span className={`text-sm font-bold tracking-tight transition-colors ${sortKey === 'title' ? 'text-white' : 'text-slate-400 group-hover/row:text-slate-100'}`}>
                    {job.title}
                  </span>
                </td>
                <td className="px-10 py-6 truncate">
                  <a 
                    href={job.mapUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 text-[11px] font-black text-slate-600 hover:text-indigo-400 transition-all group/map"
                  >
                    <i className="fas fa-location-dot text-xs group-hover/map:scale-110 transition-transform"></i>
                    <span className="truncate tracking-wide">{job.location || 'GLOBAL'}</span>
                  </a>
                </td>
                <td className="px-10 py-6">
                  <span className={`px-3 py-1 bg-slate-950/50 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all shadow-inner ${sortKey === 'datePosted' ? 'text-indigo-400 border-indigo-500/30' : 'text-slate-600 border-slate-800/60 group-hover/row:border-slate-700'}`}>
                    {job.datePosted}
                  </span>
                </td>
                <td className="px-10 py-6">
                  {job.email ? (
                    <span className="text-[10px] text-indigo-400 font-black bg-indigo-500/5 px-4 py-2 rounded-xl border border-indigo-500/10 shadow-sm group-hover/row:border-indigo-500/30 transition-all">
                      {job.email}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-800 italic font-black tracking-[0.2em]">NULL_LINK</span>
                  )}
                </td>
                <td className="px-10 py-6 text-right">
                  <div className="flex items-center justify-end">
                    <a 
                      href={job.applyLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-10 h-10 bg-slate-950/80 hover:bg-indigo-600 text-slate-700 hover:text-white rounded-xl transition-all border border-slate-800 hover:border-indigo-500 shadow-md active:scale-90 group/gate"
                      title="Engage Entrance"
                    >
                      <i className="fas fa-link text-xs group-hover/gate:rotate-12 transition-transform"></i>
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {jobs.length === 0 && (
        <div className="py-32 text-center relative overflow-hidden group">
          <div className="w-20 h-20 bg-slate-950 border border-slate-900 rounded-[1.75rem] flex items-center justify-center mx-auto mb-8 shadow-inner group-hover:border-slate-700 transition-all">
            <i className="fas fa-database text-slate-900 text-3xl group-hover:text-slate-700 transition-colors"></i>
          </div>
          <p className="text-slate-600 font-black uppercase text-[10px] tracking-[0.5em] opacity-40">Buffer Empty</p>
        </div>
      )}
    </div>
  );
};

export default JobTable;
