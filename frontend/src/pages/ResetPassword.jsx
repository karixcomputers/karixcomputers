import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { resetPasswordApi } from "../api/auth";
// IMPORTĂM COMPONENTA SEO
import SEO from "../components/SEO";

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const token = sp.get("token");

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const [isTokenValid, setIsTokenValid] = useState(null); 
  const API_URL = import.meta.env.VITE_API_URL || "https://karixcomputers.ro/api";

  useEffect(() => {
    if (!token) {
      setIsTokenValid(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await axios.post(`${API_URL}/auth/verify-reset-token`, { token });
        if (res.data.valid) {
          setIsTokenValid(true);
        } else {
          setIsTokenValid(false);
        }
      } catch (err) {
        setIsTokenValid(false);
      }
    };

    verifyToken();
  }, [token, API_URL]);

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (pw.length < 6) return setError("Parola trebuie să aibă minim 6 caractere.");
    if (pw !== pw2) return setError("Parolele nu coincid.");

    setLoading(true);
    try {
      await resetPasswordApi(token, pw);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Resetarea a eșuat. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  }

  // LOGICĂ TITLU DINAMIC PENTRU SEO
  const getPageTitle = () => {
    if (isTokenValid === null) return "Verificare link...";
    if (isTokenValid === false) return "Link Resetare Invalid";
    if (done) return "Parolă Schimbată cu Succes";
    return "Setare Parolă Nouă";
  };

  // 1. STARE: VERIFICARE TOKEN
  if (isTokenValid === null) {
    return (
      <>
        <SEO title="Verificare Securitate" description="Verificăm validitatea link-ului de resetare a parolei..." />
        <div className="min-h-screen pt-40 pb-24 px-4 flex justify-center items-start bg-transparent">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mt-20"></div>
        </div>
      </>
    );
  }

  // 2. STARE: TOKEN INVALID
  if (isTokenValid === false) {
    return (
      <>
        <SEO title="Link Invalid" description="Link-ul de resetare a parolei este invalid sau a expirat." />
        <div className="min-h-screen pt-40 pb-24 px-4 relative overflow-hidden bg-transparent flex justify-center text-center">
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-rose-500/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-pink-500/10 blur-[120px] rounded-full animate-pulse" />
          </div>

          <div className="max-w-md w-full mx-auto relative z-10 animate-in fade-in zoom-in duration-500">
            <div className="p-10 sm:p-12 rounded-[50px] bg-[#161e31]/95 border border-white/10 backdrop-blur-3xl shadow-3xl">
              <div className="h-16 w-16 rounded-[24px] bg-rose-500/10 border border-rose-500/20 mx-auto mb-6 flex items-center justify-center text-2xl shadow-2xl">
                ❌
              </div>
              <h1 className="text-3xl font-black text-white tracking-tighter mb-4 italic uppercase drop-shadow-lg">
                Link <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-400">Invalid</span>
              </h1>
              <p className="text-gray-300 font-medium tracking-tight text-sm leading-relaxed mb-8">
                Acest link de resetare a fost deja folosit, a expirat sau este invalid.
              </p>
              <Link to="/auth/forgot" className="block w-full py-5 rounded-[20px] font-black text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all uppercase tracking-widest text-[11px] shadow-xl active:scale-95">
                Cere un link nou
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // 3. STARE: FORMULAR SAU SUCCES
  return (
    <>
      <SEO title={getPageTitle()} description="Securizează-ți contul Karix Computers prin setarea unei noi parole." />
      
      <div className="min-h-screen pt-40 pb-24 px-4 relative overflow-hidden bg-transparent flex justify-center text-center">
        
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-pink-500/10 blur-[120px] rounded-full animate-pulse" />
        </div>

        <div className="max-w-md w-full mx-auto relative z-10 animate-in fade-in zoom-in duration-500">
          <div className="p-10 sm:p-12 pb-16 sm:pb-20 rounded-[50px] bg-[#161e31]/95 border border-white/10 backdrop-blur-3xl shadow-3xl">
            
            {!done ? (
              <>
                <div className="h-16 w-16 rounded-[24px] bg-gradient-to-br from-indigo-500 to-pink-500 mx-auto mb-6 flex items-center justify-center text-2xl shadow-2xl">
                  🔒
                </div>
                
                <h1 className="text-3xl font-black text-white tracking-tighter mb-2 italic uppercase drop-shadow-lg">
                  Parolă <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Nouă</span>
                </h1>
                
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-8 italic">
                  Alege o parolă puternică pentru contul tău.
                </p>

                <form onSubmit={submit} className="space-y-4">
                  <input 
                    required 
                    type="password" 
                    className="w-full bg-white/5 border border-white/10 rounded-[20px] px-6 py-5 text-white outline-none focus:border-indigo-500/50 transition-all text-sm font-bold tracking-wider text-center placeholder:uppercase placeholder:text-xs" 
                    placeholder="Parolă Nouă" 
                    value={pw} 
                    onChange={(e) => setPw(e.target.value)} 
                    autoComplete="new-password"
                  />

                  <input 
                    required 
                    type="password" 
                    className="w-full bg-white/5 border border-white/10 rounded-[20px] px-6 py-5 text-white outline-none focus:border-indigo-500/50 transition-all text-sm font-bold tracking-wider text-center placeholder:uppercase placeholder:text-xs" 
                    placeholder="Confirmă Parola" 
                    value={pw2} 
                    onChange={(e) => setPw2(e.target.value)} 
                    autoComplete="new-password"
                  />

                  {error && (
                    <p className="text-[10px] text-pink-500 font-bold uppercase tracking-tighter mt-2">{error}</p>
                  )}

                  <button 
                    disabled={loading || !pw || !pw2} 
                    className="w-full py-5 rounded-[20px] font-black text-white bg-indigo-600 hover:bg-indigo-500 transition-all uppercase tracking-widest text-[11px] mt-4 shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? "Se Salvează..." : "Schimbă Parola"}
                  </button>
                </form>

                <div className="mt-10 pt-6 border-t border-white/5">
                  <Link to="/auth/login" className="text-[10px] text-gray-500 hover:text-white font-black uppercase tracking-widest transition-colors italic">
                    ← Anulează
                  </Link>
                </div>
              </>
            ) : (
              <div className="animate-in fade-in zoom-in duration-300">
                <div className="h-20 w-20 rounded-[30px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 shadow-inner shadow-emerald-500/20">
                  <span className="text-4xl drop-shadow-lg">✅</span>
                </div>
                
                <h2 className="text-2xl font-black text-white tracking-tighter mb-4 italic uppercase drop-shadow-lg">
                  Parolă <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Schimbată</span>
                </h2>
                
                <p className="text-gray-300 font-medium tracking-tight text-sm leading-relaxed mb-8">
                  Contul tău Karix a fost securizat cu noua parolă. Acum te poți autentifica.
                </p>

                <Link to="/auth/login" className="block w-full py-5 rounded-[20px] font-black text-[#0b1020] bg-white hover:bg-emerald-400 hover:text-white transition-all uppercase tracking-widest text-[11px] shadow-xl active:scale-95">
                  Mergi la Login
                </Link>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}