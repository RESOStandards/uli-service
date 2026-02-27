const Navbar = () => (
  <header className="bg-slate-header text-white h-14 flex items-center px-6 shadow-md z-10">
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current" aria-hidden="true">
        <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
      </svg>
      <span className="text-lg font-semibold tracking-wide">RESO ULI Service</span>
    </div>
  </header>
);

export default Navbar;
