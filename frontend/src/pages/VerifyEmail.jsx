import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { verifyWithCodeApi, resendVerificationApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email"); // Scoatem fallback-ul || "" pentru a verifica exact dacă există
  const nav = useNavigate();
  const { setUser } = useAuth();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // --- PROTECȚIE PAGINĂ ---
  // Dacă nu avem email în URL (ex: a intrat direct pe /verify-email), îl dăm afară
  useEffect(() => {
    if (!email) {
      nav("/auth/register", { replace: true }); // replace: true șterge pagina din istoricul de navigare
    }
  }, [email, nav]);

  async function handleVerify(e) {
    e.preventDefault();
    if (code.length < 6) return setError("Introdu codul complet de 6 cifre.");
    
    setError("");
    setLoading(true);
    try {
      const data = await verifyWithCodeApi(email, code);
      setSuccess(true);
      
      // Dacă serverul returnează userul, îl logăm direct
      if (data.user) setUser(data.user);
      
      // Redirecționare după succes
      setTimeout(() => nav("/account"), 2000);
    } catch (err) {
      setError(err.message || "Codul introdus este incorect.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    try {
      await resendVerificationApi(email);
      setError("Un cod nou a fost trimis!"); 
    } catch (err) {
      setError("Eroare la retrimitere. Încearcă mai târziu.");
    }
  }

  // Dacă nu avem email, nu randăm nimic pentru o fracțiune de secundă cât face redirectul
  if (!email) return null;

  return (
    <div className="min-h-screen pt-12 pb-24 px-4 relative overflow-hidden flex justify-center">
      
      {/* Glow-uri de fundal Karix */}
      <div className="absolute top-0 -left-20 w-[400px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-0 -right-20 w-[400px] h-[400px] bg-pink-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <div className="rounded-[40px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8 sm:p-12 shadow-2xl text-center">
          
          <header className="mb-10">
            <div className="h-16 w-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 border border-indigo-500/20">
              📩
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Verifică <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">contul</span>
            </h1>
            <p className="text-sm text-gray-400 mt-2 font-medium leading-relaxed">
              Introdu codul de 6 cifre trimis la <br/>
              <span className="text-white font-bold">{email}</span>
            </p>
          </header>

          {success ? (
            <div className="py-6 animate-in zoom-in duration-300">
              <div className="text-emerald-400 text-lg font-bold mb-2 uppercase tracking-widest">
                Cont Activat!
              </div>
              <p className="text-gray-400 text-sm">Te trimitem în panoul de control...</p>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-8">
              <div className="space-y-2">
                <input
                  type="text"
                  maxLength="6"
                  placeholder="000000"
                  className="w-full bg-white/[0.05] border border-white/10 rounded-2xl p-5 text-center text-4xl font-black tracking-[0.5em] text-white focus:border-indigo-500 outline-none transition-all placeholder:text-gray-800"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                />
                {error && (
                  <p className="text-[10px] font-black uppercase text-pink-500 tracking-widest pt-3">
                    {error}
                  </p>
                )}
              </div>

              <button
                disabled={loading}
                className="w-full rounded-2xl py-5 text-lg font-black text-white bg-gradient-to-r from-indigo-500 to-pink-500 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "Se verifică..." : "Confirmă Codul"}
              </button>

              <button
                type="button"
                onClick={handleResend}
                className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
              >
                Nu ai primit codul? Trimite din nou
              </button>
            </form>
          )}

          <div className="mt-12 pt-8 border-t border-white/5">
            <Link to="/auth/login" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-tighter transition-colors">
              Revino la pagina de login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}