import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Mail, Lock, BrainCircuit, ArrowRight, Loader2, AlertCircle, CheckCircle
} from 'lucide-react';
import { authService } from '../../services/authService';
import { cn } from '../../utils/cn';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export const AuthModal = ({ isOpen, onClose, onSuccess }: AuthModalProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccessMsg('');
  };

  const handleToggle = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Handle Login
        const data = await authService.login(email.trim(), password.trim());
        setSuccessMsg('Logged in successfully!');
        setTimeout(() => {
          onSuccess(data.email);
          onClose();
          resetForm();
        }, 1000);
      } else {
        // Handle Registration
        await authService.register(email.trim(), password.trim());
        setSuccessMsg('Account created! Logging you in...');
        
        // Auto login after registration
        const loginData = await authService.login(email.trim(), password.trim());
        setTimeout(() => {
          onSuccess(loginData.email);
          onClose();
          resetForm();
        }, 1000);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data || err?.message || 'Authentication failed. Please check your network or credentials.';
      setError(typeof msg === 'string' ? msg : 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className={cn(
              "relative w-full max-w-[420px] rounded-2xl overflow-hidden border border-white/[0.08]",
              "bg-[#0B1020]/90 backdrop-blur-xl p-6 shadow-2xl flex flex-col text-white"
            )}
          >
            {/* Background Glow */}
            <div className="absolute top-[-30%] left-[-30%] w-[80%] h-[80%] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-30%] right-[-30%] w-[80%] h-[80%] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-white/50 hover:text-white transition-all"
            >
              <X size={15} />
            </button>

            {/* Header */}
            <div className="flex flex-col items-center text-center mt-3 mb-6 relative z-10">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 mb-3">
                <BrainCircuit size={22} className="text-white" />
              </div>
              <h2 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-[12px] text-white/40 mt-1 max-w-[280px]">
                {isLogin 
                  ? 'Access your database designs and start building schemas.' 
                  : 'Join the smart workspace for modern database architects.'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider pl-0.5">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-3.5 text-white/20" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className={cn(
                      "w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/[0.08] text-[13px] outline-none transition-all",
                      "bg-white/[0.03] placeholder:text-white/20 text-white focus:border-indigo-500/50 focus:bg-white/[0.05]"
                    )}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider pl-0.5">Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-3.5 text-white/20" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={cn(
                      "w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/[0.08] text-[13px] outline-none transition-all",
                      "bg-white/[0.03] placeholder:text-white/20 text-white focus:border-indigo-500/50 focus:bg-white/[0.05]"
                    )}
                  />
                </div>
              </div>

              {/* Confirm Password (Sign Up only) */}
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider pl-0.5">Confirm Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-3.5 text-white/20" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required={!isLogin}
                      className={cn(
                        "w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/[0.08] text-[13px] outline-none transition-all",
                        "bg-white/[0.03] placeholder:text-white/20 text-white focus:border-indigo-500/50 focus:bg-white/[0.05]"
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Alerts */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] leading-relaxed"
                  >
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {successMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] leading-relaxed"
                  >
                    <CheckCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full py-2.5 rounded-xl text-xs font-bold transition-all mt-4 relative overflow-hidden group flex items-center justify-center gap-2",
                  loading 
                    ? "bg-indigo-600/50 text-white/50 cursor-not-allowed" 
                    : "bg-indigo-600 text-white hover:shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:bg-indigo-500 active:scale-[0.98]"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{isLogin ? 'Sign In' : 'Sign Up'}</span>
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Footer switcher */}
            <div className="text-center mt-6 text-[11px] text-white/30 relative z-10">
              {isLogin ? (
                <span>
                  Don't have an account?{' '}
                  <button 
                    onClick={handleToggle}
                    className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline bg-transparent border-none p-0 outline-none cursor-pointer"
                  >
                    Create one
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <button 
                    onClick={handleToggle}
                    className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline bg-transparent border-none p-0 outline-none cursor-pointer"
                  >
                    Sign in
                  </button>
                </span>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
