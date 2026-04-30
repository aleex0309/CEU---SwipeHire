import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Database, Upload as UploadIcon, AlertCircle, Loader2, ChevronRight, CheckCircle2, HelpCircle, ArrowRight } from 'lucide-react';
import { parseResumesCSV } from '../utils/csvParser';

const UploadScreen = ({ onAnalyze }) => {
  const [jobDesc, setJobDesc] = useState('');
  const [file, setFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && (selected.type === 'text/csv' || selected.name.endsWith('.csv'))) {
      setFile(selected);
      setError(null);
    } else {
      setError('Please upload a valid CSV file.');
    }
  };

  const handleRun = async () => {
    if (!jobDesc || !file) {
      setError('Please provide both a job description and a CSV file.');
      return;
    }

    setIsParsing(true);
    try {
      const data = await parseResumesCSV(file);
      onAnalyze(jobDesc, data);
    } catch (err) {
      setError('Failed to parse CSV: ' + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center py-16 px-6 max-w-5xl mx-auto w-full animate-in">
      {/* Header */}
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold mb-4 tracking-tight">Configure Analysis Session</h2>
        <p className="text-gray-500 text-lg max-w-xl mx-auto font-medium">
          Upload your candidate pool and define the criteria for the neural matching engine.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-10 w-full items-stretch">
        {/* Step 1: Requirements */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="glass p-1 p-8 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-[#4F46E5] font-bold shadow-sm">
                   1
                </div>
                <h3 className="text-lg font-bold tracking-tight">Job Requirements</h3>
              </div>
              <HelpCircle size={18} className="text-gray-300 cursor-help hover:text-indigo-400 transition-colors" title="Paste the main responsibilities and required skills." />
            </div>
            
            <p className="text-xs text-gray-400 mb-4 font-bold uppercase tracking-wider">Criteria Definition</p>
            <textarea
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Paste the job description, required skills, and key qualifications here..."
              className="w-full min-h-[320px] bg-gray-50/50 border border-gray-100 rounded-2xl p-5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all resize-none shadow-inner"
            />
          </div>
        </motion.div>

        {/* Step 2: Candidates */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass p-1 p-8 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-[#4F46E5] font-bold shadow-sm">
                   2
                </div>
                <h3 className="text-lg font-bold tracking-tight">Candidate Pool</h3>
              </div>
              <Database size={18} className="text-gray-300" />
            </div>

            <p className="text-xs text-gray-400 mb-4 font-bold uppercase tracking-wider">Secure Upload</p>
            <div className={`relative min-h-[240px] flex flex-col items-center justify-center border-2 border-dashed rounded-3xl transition-all ${
              file ? 'bg-emerald-50/30 border-emerald-200' : 'bg-gray-50/50 border-gray-100 hover:border-[#4F46E5]/30 hover:bg-white'
            }`}>
              <input
                type="file"
                id="csv-upload"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-5 p-8 w-full text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  file ? 'bg-emerald-100 text-emerald-600' : 'bg-white shadow-sm text-[#4F46E5]'
                }`}>
                  {file ? <CheckCircle2 size={32} /> : <UploadIcon size={32} />}
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900 mb-1">
                    {file ? file.name : 'Choose CSV database'}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">
                    {file ? 'File ready for processing' : 'Drag into space or click to browse'}
                  </p>
                </div>
              </label>
            </div>

            <div className="mt-8 p-5 bg-indigo-50/30 rounded-2xl border border-indigo-50">
              <div className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#4F46E5]">
                 <FileText size={12} /> Optimization Guide
              </div>
              <ul className="text-[11px] text-gray-500 space-y-2 font-medium leading-relaxed">
                <li className="flex items-center gap-2">• CSV must contain <span className="font-bold">'resume'</span> and <span className="font-bold">'category'</span></li>
                <li className="flex items-center gap-2">• Limit batches to 500 records for optimal speed</li>
                <li className="flex items-center gap-2">• Detailed job descriptions yield 40% better scores</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="mt-16 flex flex-col items-center w-full max-w-md">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-rose-600 bg-rose-50 px-5 py-3 rounded-xl border border-rose-100 text-xs font-bold mb-6 w-full shadow-sm"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}
        
        <button
          onClick={handleRun}
          disabled={isParsing || !jobDesc || !file}
          className={`btn-primary w-full py-5 flex items-center justify-center gap-4 text-lg shadow-lg shadow-indigo-500/20 group transition-all h-[64px] ${
            (isParsing || !jobDesc || !file) ? 'opacity-50 grayscale cursor-not-allowed transform-none' : ''
          }`}
        >
          {isParsing ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              <span className="animate-pulse">Optimizing Neural Network...</span>
            </>
          ) : (
            <>
              Initialize Analysis Engine <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
        <p className="mt-4 text-[10px] text-gray-400 font-bold tracking-widest uppercase italic">
          Powered by Sentence-BERT (S-BERT)
        </p>
      </div>
    </div>
  );
};

export default UploadScreen;

