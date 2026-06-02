import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BrainCircuit, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import screenshotImg from '../../assets/landing/app-screenshot.png';
import { authService } from '../../services/authService';
import { AuthModal } from '../ui/AuthModal';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage = ({ onStart }: LandingPageProps) => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState(authService.getCurrentUser());

  const handleStart = () => {
    if (authService.isAuthenticated()) {
      onStart();
    } else {
      setIsAuthOpen(true);
    }
  };

  const handleAuthSuccess = (email: string) => {
    setUser({ email });
    onStart(); // Auto start workspace after sign in
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white selection:bg-indigo-500/30 overflow-hidden flex flex-col">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/15 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <BrainCircuit size={22} />
          </div>
          <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            AI System Designer
          </span>
        </div>
        
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50 hidden sm:inline">{user.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
            >
              Sign Out
            </button>
            <button 
              onClick={handleStart}
              className="px-4 py-1.5 bg-indigo-600 rounded-full text-xs font-semibold hover:bg-indigo-500 transition-all active:scale-95 cursor-pointer"
            >
              Open App
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-2 bg-transparent text-sm font-semibold hover:text-indigo-400 transition-all active:scale-95 cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={handleStart}
              className="px-5 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-semibold hover:bg-white/10 transition-all active:scale-95 backdrop-blur-md cursor-pointer"
            >
              Open App
            </button>
          </div>
        )}
      </nav>

      {/* Hero Section - Compact */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-8 max-w-7xl mx-auto w-full pb-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-6 backdrop-blur-sm">
            <Sparkles size={12} />
            <span>AI-Native Architect</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight leading-[1.1]">
            Design Systems at the <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Speed of Thought
            </span>
          </h1>
          <p className="text-base md:text-lg text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
            The intelligent workspace for database architects. Transform natural language into 
            production-ready ER diagrams and SQL schemas instantly.
          </p>
          <button 
            onClick={handleStart}
            className="group relative px-8 py-3.5 bg-indigo-600 rounded-xl font-bold overflow-hidden transition-all hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] active:scale-95 cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-2">
              Launch Workspace <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </motion.div>

        {/* Real Screenshot Preview */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative w-full max-w-5xl mx-auto group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity" />
          <div className="relative p-1.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-3xl shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-8 bg-white/5 border-b border-white/5 flex items-center px-4 gap-1.5">
               <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
               <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
               <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            </div>
            <img 
              src={screenshotImg} 
              alt="Real App Screenshot" 
              className="rounded-xl w-full mt-8 shadow-inner grayscale-[0.2] hover:grayscale-0 transition-all duration-700"
            />
          </div>
        </motion.div>
      </main>

      {/* Simple Footer */}
      <footer className="relative z-10 py-8 px-8 border-t border-white/5 max-w-7xl mx-auto w-full flex justify-between items-center opacity-40 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
          <BrainCircuit size={14} />
          <span>Built for Architects</span>
        </div>
        <p className="text-[10px] font-medium">
          &copy; 2026 AI SYSTEM DESIGNER
        </p>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default LandingPage;
