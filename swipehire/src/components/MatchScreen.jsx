import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, X, Heart, Star, Sparkles, BrainCircuit } from 'lucide-react';
import SwipeCard from './SwipeCard.jsx';
import { matchResumes, normalizeCandidate } from '../utils/api';
import confetti from 'canvas-confetti';

const MatchScreen = ({ jobDescription, candidates, onFinish, onBack }) => {
  const [stack, setStack] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchMatches = async () => {
      setIsLoading(true);
      try {
        const result = await matchResumes(jobDescription, candidates, 10);
        setStack(result.candidates);
      } catch (err) {
        console.warn('Backend match failed, using local simulation:', err);
        const mockResults = candidates
          .map((candidate, index) =>
            normalizeCandidate(
              {
                ...candidate,
                score: 55 + Math.random() * 40,
              },
              index
            )
          )
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);
        setStack(mockResults);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [jobDescription, candidates]);

  const handleSwipe = (direction, candidate) => {
    if (!candidate) return;

    if (direction === 'right') {
      setMatches(prev => [...prev, candidate]);
      if (candidate.score >= 80) {
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#4F46E5', '#10b981', '#ffffff']
        });
      }
    }
    
    setCurrentIndex(prev => prev + 1);
  };

  useEffect(() => {
    if (stack.length > 0 && currentIndex >= stack.length) {
      onFinish(matches);
    }
  }, [currentIndex, stack, matches, onFinish]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f9fafb]">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full scale-150 animate-pulse"></div>
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="relative z-10 w-20 h-20 border-4 border-indigo-100 border-t-[#4F46E5] rounded-full flex items-center justify-center"
          >
             <BrainCircuit className="text-[#4F46E5] animate-pulse" size={32} />
          </motion.div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold tracking-tight text-gray-900 mb-2">Analyzing Candidate DNA</h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.3em] flex items-center gap-2 justify-center">
            Neural Mapping in Progress <span className="flex gap-1"><span className="animate-bounce">.</span><span className="animate-bounce" style={{animationDelay: '0.2s'}}>.</span><span className="animate-bounce" style={{animationDelay: '0.4s'}}>.</span></span>
          </p>
        </div>
      </div>
    );
  }

  const currentStack = stack.slice(currentIndex, currentIndex + 3).reverse();

  return (
    <div className="flex-1 flex flex-col items-center pt-10 pb-20 px-4">
      {/* Back Control */}
      <div className="absolute top-24 left-8">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-[#4F46E5] transition-all uppercase tracking-[0.2em] bg-white border border-gray-100 px-4 py-2 rounded-xl shadow-sm hover:shadow-md"
        >
           <ArrowLeft size={12} /> Refine Criteria
        </button>
      </div>

      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 text-[10px] font-black text-[#4F46E5] uppercase tracking-[0.4em] mb-3 bg-indigo-50 px-3 py-1 rounded-full">
          <Sparkles size={10} /> Neural Analysis Complete
        </div>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Screening Top {stack.length} Strategic Matches</p>
      </div>

      <div className="relative w-[360px] h-[560px] flex items-center justify-center">
        <AnimatePresence>
          {currentStack.map((candidate, i) => (
            <SwipeCard 
              key={candidate.id} 
              candidate={candidate} 
              index={currentStack.length - 1 - i} 
              onSwipe={handleSwipe}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Modern Action Controls */}
      <div className="mt-12 flex items-center gap-10">
        <button 
          onClick={() => handleSwipe('left', stack[currentIndex])}
          className="w-16 h-16 rounded-full bg-white border border-gray-100 shadow-xl flex items-center justify-center text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95 group"
          title="Skip Candidate"
        >
          <X size={32} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
        
        <button 
          className="w-14 h-14 rounded-full bg-white border border-gray-100 shadow-lg flex items-center justify-center text-amber-500 hover:bg-amber-50 transition-all active:scale-95"
          title="Save for Later"
        >
          <Star size={24} />
        </button>
        
        <button 
          onClick={() => handleSwipe('right', stack[currentIndex])}
          className="w-16 h-16 rounded-full bg-white border border-indigo-100 shadow-xl flex items-center justify-center text-[#4F46E5] hover:bg-indigo-50 transition-all active:scale-95 group"
          title="Shortlist Candidate"
        >
          <Heart size={32} className="group-hover:scale-110 transition-transform" fill="currentColor" />
        </button>
      </div>

      {/* Progress Footer */}
      <div className="mt-14 flex flex-col items-center gap-3">
        <div className="h-1.5 w-64 bg-gray-100 rounded-full overflow-hidden shadow-inner flex">
          <motion.div 
            className="h-full bg-gradient-to-r from-[#4F46E5] to-[#8b5cf6]"
            animate={{ width: `${stack.length ? (currentIndex / stack.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-[10px] font-black tracking-[0.2em] text-gray-300 uppercase">
          Batch Progress: <span className="text-gray-900">{currentIndex}</span> / {stack.length}
        </span>
      </div>
    </div>
  );
};

export default MatchScreen;
