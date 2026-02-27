import resoLogo from '../../assets/reso-logo-white.png';

const Navbar = () => (
  <header className="bg-slate-header text-white h-14 flex items-center px-6 shadow-md z-10">
    <div className="flex items-center gap-3">
      <img src={resoLogo} alt="RESO" className="h-7" />
      <span className="text-lg font-semibold tracking-wide">ULI Service</span>
    </div>
  </header>
);


export default Navbar;
