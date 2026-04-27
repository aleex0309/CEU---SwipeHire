import { motion } from 'framer-motion';
import SectionLayout from './Layout';
import Button from './Button';

export default function Hero() {
  return (
    <SectionLayout className="py-20">
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-indigo-400/40 bg-indigo-500/15 px-3 py-1 text-sm text-indigo-200">
            SwipeHire - recruitment with chemistry
          </p>
          <div className="relative inline-block">
            <img
              src="/image%20copy.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -left-8 top-[16%] h-24 w-24 rotate-[-18deg] opacity-40 blur-[0.4px] md:-left-12 md:h-32 md:w-32"
            />
            <img
              src="/image%20copy%202.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 top-[58%] h-24 w-24 rotate-[12deg] opacity-40 blur-[0.4px] md:-right-12 md:h-32 md:w-32"
            />
            <h1 className="relative text-4xl font-black leading-tight text-white md:text-6xl">
              Hiring sucks.
              <br />
              <span className="text-indigo-400">Swipe better.</span>
            </h1>
          </div>
          <p className="mt-5 max-w-xl text-lg text-slate-300">
            Stop reading CVs. Start matching talent. SwipeHire turns recruitment into a fast,
            intuitive matching experience.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/swipe">
              <Button>Start Swiping</Button>
            </a>
            <a href="/app">
              <Button variant="secondary">Upload CVs</Button>
            </a>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-indigo-500/20 via-fuchsia-500/10 to-emerald-500/20 blur-2xl" />
          <img
            src="/image%20copy%203.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-5 -top-8 h-12 w-12 rotate-[14deg] opacity-80 drop-shadow-[0_0_20px_rgba(236,72,153,0.35)]"
          />
          <img
            src="/image%20copy%203.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-8 -top-6 h-8 w-8 rotate-[-18deg] opacity-70 drop-shadow-[0_0_16px_rgba(251,113,133,0.28)]"
          />
          <img
            src="/image%20copy%203.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute right-16 top-2 h-6 w-6 rotate-[8deg] opacity-60 drop-shadow-[0_0_12px_rgba(168,85,247,0.25)]"
          />
          <motion.div
            className="relative rounded-[2rem] border border-slate-700 bg-slate-900/60 p-6 shadow-2xl backdrop-blur"
            initial={{ rotate: -3, y: 10, opacity: 0.8 }}
            animate={{ rotate: 0, y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm uppercase tracking-widest text-slate-400">Live preview</p>
            <h3 className="mt-3 text-2xl font-bold text-white">Senior Frontend Engineer</h3>
            <div className="mt-3 inline-flex rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-300">
              92% match
            </div>
            <p className="mt-4 text-sm text-slate-300">
              React + TypeScript + UI performance + team leadership. Exactly the profile recruiters
              keep ghosting spreadsheets for.
            </p>
          </motion.div>
        </div>
      </section>
    </SectionLayout>
  );
}
