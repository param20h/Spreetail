import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { 
  Wallet, 
  Users, 
  Scale, 
  FileSearch, 
  ArrowRight, 
  Sun, 
  Moon,
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col relative overflow-hidden">
      {/* Dynamic Background Accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="glass border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center shadow-lg shadow-sky-500/15">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-theme-primary tracking-tight">FlatMate</h1>
            <p className="text-[10px] text-theme-muted -mt-0.5 font-sans">Shared Expenses</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-navy-800/60 transition-all duration-300 text-slate-450 hover:text-white cursor-pointer relative overflow-hidden"
            aria-label="Toggle theme"
          >
            <div className="relative w-5 h-5">
              <Sun className={`w-5 h-5 absolute inset-0 transition-transform duration-500 ease-out ${
                theme === 'light' ? "rotate-0 scale-100" : "rotate-90 scale-0"
              }`} />
              <Moon className={`w-5 h-5 absolute inset-0 transition-transform duration-500 ease-out ${
                theme === 'dark' ? "rotate-0 scale-100" : "-rotate-90 scale-0"
              }`} />
            </div>
          </button>

          {isAuthenticated ? (
            <Button variant="primary" onClick={() => navigate('/dashboard')}>
              Go to App <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center justify-center text-center gap-8 z-10">
        <div className="space-y-4 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" /> Intelligent expense sharing
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-theme-primary tracking-tight max-w-3xl leading-tight">
            Fair Splits. <br className="sm:hidden" />
            <span className="bg-gradient-to-r from-sky-500 to-teal-500 bg-clip-text text-transparent">Transparent Ledgers.</span>
          </h2>
          <p className="text-sm md:text-base text-theme-secondary max-w-2xl mx-auto leading-relaxed">
            The premium shared expense ledger designed for flatmates. Focuses on time-scoped membership periods, automated CSV anomaly audit logs, and currency-aware greedy settlements.
          </p>
        </div>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-xs sm:max-w-md animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {isAuthenticated ? (
            <Button variant="primary" size="lg" className="w-full sm:w-auto" onClick={() => navigate('/dashboard')}>
              Access Workspace
            </Button>
          ) : (
            <>
              <Button variant="primary" size="lg" className="w-full sm:w-auto px-8" onClick={() => navigate('/register')}>
                Get Started
              </Button>
              <Button variant="secondary" size="lg" className="w-full sm:w-auto px-8" onClick={() => navigate('/login')}>
                Sign In to Account
              </Button>
            </>
          )}
        </div>

        {/* Mock Mockup Stack */}
        <div className="w-full max-w-4xl mt-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="relative glass-strong rounded-2xl p-6 shadow-2xl border border-white/5 text-left overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="text-xs text-theme-muted font-mono">Workspace Preview • Flat 4B</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-4 bg-navy-850 border border-white/5">
                <p className="text-[10px] text-theme-muted uppercase tracking-wider font-semibold">Aisha Net Balance</p>
                <p className="text-2xl font-black text-emerald-400 mt-1 tabular-nums">+₹4,500.00</p>
              </Card>

              <Card className="p-4 bg-navy-850 border border-white/5">
                <p className="text-[10px] text-theme-muted uppercase tracking-wider font-semibold">Rohan Net Balance</p>
                <p className="text-2xl font-black text-rose-400 mt-1 tabular-nums">-₹1,200.00</p>
              </Card>

              <Card className="p-4 bg-navy-850 border border-white/5">
                <p className="text-[10px] text-theme-muted uppercase tracking-wider font-semibold">Greedy Settlements</p>
                <p className="text-sm font-bold text-sky-400 mt-2">1 Transactions Simplified</p>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Feature Section */}
      <section className="bg-navy-950 py-16 border-t border-white/5 relative z-10">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3">
            <h3 className="text-2xl md:text-3xl font-black text-theme-primary tracking-tight">Engineered for Accuracy</h3>
            <p className="text-xs md:text-sm text-theme-secondary max-w-xl mx-auto">
              FlatMate solves the standard issues of other expense apps with robust features:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-5 flex flex-col gap-3 hover" hover>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-theme-primary text-sm">Time-Scoped Membership</h4>
              <p className="text-xs text-theme-secondary leading-relaxed">
                Exclude members automatically from splits dated outside their lease period (e.g. Sam joined April 8, Meera left March 31).
              </p>
            </Card>

            <Card className="p-5 flex flex-col gap-3 hover" hover>
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
                <FileSearch className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-theme-primary text-sm">19-Anomaly CSV Parser</h4>
              <p className="text-xs text-theme-secondary leading-relaxed">
                Review and approve duplicates, ambiguous dates, comma-separated amounts, and missing payers during file uploads.
              </p>
            </Card>

            <Card className="p-5 flex flex-col gap-3 hover" hover>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Scale className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-theme-primary text-sm">Debt Simplification</h4>
              <p className="text-xs text-theme-secondary leading-relaxed">
                Greedy reduction matching net receivers and net payers to clear debts in the fewest possible payment transactions.
              </p>
            </Card>

            <Card className="p-5 flex flex-col gap-3 hover" hover>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-theme-primary text-sm">Traceable Audit Trail</h4>
              <p className="text-xs text-theme-secondary leading-relaxed">
                Trace any balance back to specific splits, currency exchange rates (USD → INR), and refund logs for audit integrity.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass border-t border-white/5 py-8 text-center text-xs text-theme-muted relative z-10">
        <p>© 2026 FlatMate Shared Expenses. Made with precision and style.</p>
      </footer>
    </div>
  );
}
