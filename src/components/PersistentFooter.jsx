export default function PersistentFooter() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#042f23]/95 px-4 py-2 text-primary-dark shadow-2xl shadow-slate-900/20 backdrop-blur-xl">
      <div className="flex flex-col items-center justify-between gap-1 text-center text-xs font-semibold sm:flex-row sm:text-left">
        <p>Aapki Aawaz, Aapka Bazaar, Aapka SAATHI.</p>
        <p className="text-primary-dark opacity-60">Voice-first market transparency for every farmer</p>
      </div>
    </footer>
  );
}
