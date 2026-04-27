interface JobInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function JobInput({ value, onChange }: JobInputProps) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <h2 className="mb-3 text-xl font-bold text-white">Paste Job Offer</h2>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-64 w-full resize-none rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
        placeholder="Drop the role description here. Must-haves, nice-to-haves, the whole hiring wish list."
      />
    </div>
  );
}
