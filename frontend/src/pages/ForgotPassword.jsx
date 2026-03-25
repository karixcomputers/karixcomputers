import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "https://karixcomputers.ro/api";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await axios.post(`${API_URL}/auth/forgot-password`, { email });
      
      if (res.status === 200) {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || "A apărut o eroare la trimiterea link-ului.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Am scos "items-center" ca să nu se mai centreze pe mijlocul ecranului, ci să stea sus (pt-40)
    <div className="min-h-screen pt-40 pb-24 px-4 relative overflow-hidden bg-transparent flex justify-center">
      
      {/* Glow-uri de fundal */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-pink-500/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      <div className="max-w-md w-full mx-auto relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="p-10 sm:p-12 rounded-[50px] bg-[#161e31]/95 border border-white/10 backdrop-blur-3xl text-center shadow-3xl">
          
          {!success ? (
            // --- STAREA 1: FORMULARUL DE INTRODUCERE EMAIL ---
            <>
              <div className="h-16 w-16 rounded-[24px] bg-gradient-to-br from-indigo-500 to-pink-500 mx-auto mb-6 flex items-center justify-center text-2xl shadow-2xl">
                🔐
              </div>
              
              <h1 className="text-3xl font-black text-white tracking-tighter mb-2 italic uppercase drop-shadow-lg">
                Recuperare <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Parolă</span>
              </h1>
              
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-8 italic">
                Introdu adresa de email asociată contului.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Am scos "uppercase" și am pus "text-sm" ca să fie ușor de citit cu litere mici */}
                <input 
                  required 
                  type="email" 
                  className="w-full bg-white/5 border border-white/10 rounded-[20px] px-6 py-5 text-white outline-none focus:border-indigo-500/50 transition-all text-sm font-bold tracking-wider text-center placeholder:uppercase placeholder:text-xs" 
                  placeholder="email@exemplu.ro" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />

                {error && (
                  <p className="text-[10px] text-pink-500 font-bold uppercase tracking-tighter mt-2">{error}</p>
                )}

                <button 
                  disabled={loading || !email} 
                  className="w-full py-5 rounded-[20px] font-black text-white bg-indigo-600 hover:bg-indigo-500 transition-all uppercase tracking-widest text-[11px] mt-4 shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? "Se Trimite..." : "Trimite Link"}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-white/5">
                <Link to="/login" className="text-[10px] text-gray-500 hover:text-white font-black uppercase tracking-widest transition-colors italic">
                  ← Înapoi la Autentificare
                </Link>
              </div>
            </>
          ) : (
            // --- STAREA 2: SUCCES (EMAIL TRIMIS) ---
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="h-20 w-20 rounded-[30px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 shadow-inner shadow-emerald-500/20">
                <span className="text-4xl drop-shadow-lg">✉️</span>
              </div>
              
              <h2 className="text-2xl font-black text-white tracking-tighter mb-4 italic uppercase drop-shadow-lg">
                Verifică <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Email-ul</span>
              </h2>
              
              <p className="text-gray-300 font-medium tracking-tight text-sm leading-relaxed mb-8">
                Am trimis un link de resetare a parolei către <br/>
                <span className="text-white font-bold">{email}</span>
              </p>

              <Link to="/login" className="block w-full py-5 rounded-[20px] font-black text-[#0b1020] bg-white hover:bg-emerald-400 hover:text-white transition-all uppercase tracking-widest text-[11px] shadow-xl active:scale-95">
                Întoarce-te la Login
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}