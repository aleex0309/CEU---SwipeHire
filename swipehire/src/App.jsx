import React, { useState, useEffect } from 'react';
import { Layout, Upload, Settings, ListChecks, ArrowLeft, Building2 } from 'lucide-react';
import LandingPage from './components/LandingPage';
import UploadScreen from './components/UploadScreen';
import MatchScreen from './components/MatchScreen';
import ResultsScreen from './components/ResultsScreen';
import { checkHealth } from './utils/api';

const App = () => {
  const [screen, setScreen] = useState('landing');
  const [jobDescription, setJobDescription] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [likedCandidates, setLikedCandidates] = useState([]);
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const health = await checkHealth();
        setBackendStatus(health.status === 'ok' ? 'online' : 'offline');
      } catch {
        setBackendStatus('offline');
      }
    };
    fetchHealth();
  }, []);

  const handleStart = () => setScreen('upload');
  
  const handleAnalyze = (desc, data) => {
    setJobDescription(desc);
    setCandidates(data);
    setScreen('match');
  };

  const handleFinishMatching = (matches) => {
    setLikedCandidates(matches);
    setScreen('results');
  };

  const reset = () => {
    setScreen('landing');
    setJobDescription('');
    setCandidates([]);
    setLikedCandidates([]);
  };

  return (
    <div className="flex-1 flex flex-col relative w-full overflow-hidden bg-[#f9fafb]">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#4F46E5 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      {/* Nav */}
      <nav className="h-16 flex items-center justify-between px-6 border-b border-gray-200 bg-white/80 backdrop-blur-md z-50 sticky top-0">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={reset}>
          <div className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <Building2 className="text-white" size={18} />
          </div>
          <span className="text-lg font-bold tracking-tight text-gray-900">
            Swipe<span className="text-[#4F46E5]">Hire</span>
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            <span className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-400'}`}></span>
            System: {backendStatus}
          </div>
          {screen !== 'landing' && (
            <button 
              onClick={reset}
              className="text-xs font-bold text-gray-500 hover:text-[#4F46E5] transition-colors border-l border-gray-200 pl-6 ml-2"
            >
              EXIT SESSION
            </button>
          )}
        </div>
      </nav>

      {/* Screen Content */}
      <main className="flex-1 flex flex-col relative z-10">
        {screen === 'landing' && <LandingPage onStart={handleStart} />}
        {screen === 'upload' && <UploadScreen onAnalyze={handleAnalyze} />}
        {screen === 'match' && (
          <MatchScreen 
            jobDescription={jobDescription} 
            candidates={candidates} 
            onFinish={handleFinishMatching}
            onBack={() => setScreen('upload')}
          />
        )}
        {screen === 'results' && (
          <ResultsScreen 
            matches={likedCandidates} 
            onRestart={reset} 
          />
        )}
      </main>

      {/* Status Bar */}
      <footer className="py-3 px-6 border-t border-gray-200 bg-white text-gray-400 text-[10px] tracking-widest font-bold uppercase flex justify-between items-center z-20">
        <span>v1.0.4-PRO</span>
        <span className="flex items-center gap-2 italic normal-case tracking-normal">
          ISO-Meet Design Language <Layout size={10} />
        </span>
      </footer>
    </div>
  );
};

export default App;
