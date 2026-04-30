import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Download, RefreshCw, ExternalLink, Mail, UserCheck, Share2 } from 'lucide-react';

const ResultsScreen = ({ matches, onRestart }) => {
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(matches, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "swipehire_matches.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="flex-1 flex flex-col items-center py-20 px-6 max-w-5xl mx-auto w-full animate-in">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center mb-20"
      >
        <div className="w-24 h-24 bg-emerald-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-emerald-600 shadow-sm border border-emerald-100">
          <UserCheck size={48} />
        </div>
        <h2 className="text-5xl font-bold mb-4 tracking-tight">Curation Complete</h2>
        <p className="text-gray-500 text-lg font-medium">
          You have successfully shortlisted <span className="text-gray-900 font-black">{matches.length}</span> top-tier candidates.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6 w-full mb-20">
        {matches.map((candidate, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="glass p-8 glass-hover flex items-center justify-between group"
          >
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-black text-[#4F46E5] shadow-sm group-hover:scale-110 transition-transform">
                {Number.isFinite(candidate?.score) ? candidate.score.toFixed(0) : '0'}%
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 tracking-tight">{candidate.name}</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">{candidate.category}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-3 text-gray-400 hover:text-[#4F46E5] hover:bg-indigo-50 rounded-xl transition-all" title="Email Candidate">
                <Mail size={18} />
              </button>
              <button className="p-3 text-gray-400 hover:text-[#4F46E5] hover:bg-indigo-50 rounded-xl transition-all" title="View Full Profile">
                <ExternalLink size={18} />
              </button>
            </div>
          </motion.div>
        ))}

        {matches.length === 0 && (
          <div className="col-span-2 glass p-20 text-center border-dashed">
            <p className="text-gray-400 font-medium italic">No candidates were selected for the shortlist during this session.</p>
          </div>
        )}
      </div>

      {/* Primary Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <button 
          onClick={handleExport}
          disabled={matches.length === 0}
          className="btn-primary flex items-center gap-3 px-10 py-5 text-lg disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-xl shadow-indigo-500/20"
        >
          <Download size={22} /> Export Shortlist (.json)
        </button>
        <button 
          onClick={onRestart}
          className="btn-secondary flex items-center gap-3 px-10 py-5 text-lg border-2"
        >
          <RefreshCw size={22} className="text-gray-400" /> Start New Session
        </button>
      </div>

      <div className="mt-12">
        <button className="flex items-center gap-2 text-[10px] font-black text-gray-300 hover:text-gray-500 transition-colors uppercase tracking-[0.3em]">
           <Share2 size={12} /> Share Report with Stakeholders
        </button>
      </div>
    </div>
  );
};

export default ResultsScreen;
