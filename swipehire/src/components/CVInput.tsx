interface CVInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CVInput({ value, onChange }: CVInputProps) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <h2 className="mb-3 text-xl font-bold text-white">Paste Candidate CV</h2>
      <p className="mb-3 text-sm text-slate-400">
        Add multiple CVs separated by a blank line.
      </p>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-64 w-full resize-none rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
        placeholder="CV #1...&#10;&#10;CV #2...&#10;&#10;CV #3..."
      />
    </div>
  );
}
