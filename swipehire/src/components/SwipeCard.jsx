import React from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Briefcase, CheckCircle2, Star, User, FileText } from 'lucide-react';

const SwipeCard = ({ candidate, index, onSwipe }) => {
  const safeIndex = Number.isFinite(index) ? index : 0;
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 150], [-15, 15]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const likeOpacity = useTransform(x, [50, 120], [0, 1]);
  const dislikeOpacity = useTransform(x, [-120, -50], [1, 0]);
  const displayScore = Number.isFinite(candidate?.score) ? candidate.score : 0;

  const handleDragEnd = (event, info) => {
    if (info.offset.x > 100) {
      onSwipe('right', candidate);
    } else if (info.offset.x < -100) {
      onSwipe('left', candidate);
    } else {
      x.set(0);
    }
  };

  return (
    <motion.div
      style={{ x, rotate, opacity, zIndex: 100 - safeIndex }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.02 }}
      initial={{ scale: 0.96, opacity: 0, y: 20 }}
      animate={{ scale: 1 - safeIndex * 0.03, opacity: 1, y: safeIndex * 12 }}
      className="absolute w-[360px] h-[540px] cursor-grab active:cursor-grabbing origin-bottom"
    >
      <div className="w-full h-full bg-white rounded-[32px] flex flex-col overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-gray-100">
        {/* Swipe Indicators (Badges instead of full overlays) */}
        <motion.div 
          style={{ opacity: likeOpacity }} 
          className="absolute top-8 right-8 z-20 pointer-events-none"
        >
          <div className="border-4 border-emerald-500 text-emerald-500 px-4 py-1 rounded-xl text-xl font-black uppercase tracking-tighter rotate-[15deg] bg-white/90 backdrop-blur-sm">
            SHORTLIST
          </div>
        </motion.div>
        
        <motion.div 
          style={{ opacity: dislikeOpacity }} 
          className="absolute top-8 left-8 z-20 pointer-events-none"
        >
          <div className="border-4 border-rose-500 text-rose-500 px-4 py-1 rounded-xl text-xl font-black uppercase tracking-tighter rotate-[-15deg] bg-white/90 backdrop-blur-sm">
            SKIP
          </div>
        </motion.div>

        {/* Card Content */}
        <div className="flex flex-col h-full">
          {/* Header Area */}
          <div className="p-8 pb-4">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4F46E5] shadow-sm">
                <User size={28} />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 mb-1">Match Rating</p>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-3xl font-bold tracking-tighter text-gray-900 leading-none">
                    {displayScore.toFixed(0)}<span className="text-sm align-top text-indigo-400 font-black ml-0.5">%</span>
                  </span>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight mb-1">{candidate.name}</h2>
            <div className="flex items-center gap-2 text-gray-500 text-[13px] font-semibold">
              <Briefcase size={14} className="text-indigo-400" /> {candidate.category}
            </div>
          </div>

          {/* Details Area */}
          <div className="flex-1 px-8 py-2 overflow-y-auto custom-scrollbar">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Star size={12} className="text-amber-400 fill-amber-400" />
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Core Expertise</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {(candidate.skills || ['Leadership', 'Strategic Planning', 'Product Dev']).slice(0, 4).map((skill, i) => (
                  <span key={i} className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-[11px] font-bold border border-gray-100">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={12} className="text-indigo-400" />
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Experience Insight</h4>
              </div>
              <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-50 font-medium italic">
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-5">
                  "{candidate.text.substring(0, 350)}..."
                </p>
              </div>
            </div>
          </div>

          {/* Footer Area */}
          <div className="p-8 pt-4">
            <div className="flex items-center justify-between py-4 border-t border-gray-100 mt-auto">
               <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-bold uppercase tracking-tight">
                  <CheckCircle2 size={14} /> Profile Verified
               </div>
               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest bg-gray-50 px-2.5 py-1 rounded-md">
                  Ref: {candidate.id.toUpperCase().substring(0, 5)}
               </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SwipeCard;
