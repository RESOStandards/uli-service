const VARIANTS = {
  primary: 'bg-blue-primary text-white hover:bg-blue-700 focus:ring-blue-300',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300',
  success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-300',
};

const Button = ({ children, variant = 'primary', className = '', ...props }) => (
  <button
    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    {...props}
  >
    {children}
  </button>
);

export default Button;
