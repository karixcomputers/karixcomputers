import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { verifyWithCodeApi, resendVerificationApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";
// IMPORTĂM COMPONENTA SEO
import SEO from "../components/SEO";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email"); 
  const nav = useNavigate();
  const { setUser } = useAuth();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // --- PROTECȚIE PAGINĂ ---
  useEffect(() => {
    if (!email) {
      nav("/auth/register", { replace: true });
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
      
      if (data.user) setUser(data.user);
      
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

  if (!email) return null;

  return (
    <>
      {/* SEO: CONFIGURARE PENTRU ACTIVAREA CONTULUI */}
      <SEO 
        title="Verificare Cont" 
        description="Introdu codul de securitate primit pe email pentru a activa contul tău Karix Computers și a accesa configurațiile tale."
      />

      <div className="min-h-screen pt-12 pb-24 px-4 relative overflow-hidden flex justify-center bg-transparent">
        
        {/* Glow-uri de fundal Karix */}
        <div className="absolute top-0 -left-20 w-[400px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute top-0 -right-20 w-[400px] h-[400px] bg-pink-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-md w-full relative z-10">
          <div className="rounded-[40px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8 sm:p-12 shadow-2xl text-center">
            
            <header className="mb-10">
              <div className="h-16 w-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 border border-indigo-500/20">
                📩
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight uppercase italic text-center">
                Verifică <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">contul</span>
              </h1>
              <p className="text-sm text-gray-400 mt-2 font-medium leading-relaxed italic text-center">
                Introdu codul de 6 cifre trimis la <br/>
                <span className="text-white font-bold">{email}</span>
              </p>
            </header>

            {success ? (
              <div className="py-6 animate-in zoom-in duration-300 text-center">
                <div className="text-emerald-400 text-lg font-bold mb-2 uppercase tracking-widest italic">
                  Cont Activat!
                </div>
                <p className="text-gray-400 text-sm italic">Te trimitem în panoul de control...</p>
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
                    <p className={`text-[10px] font-black uppercase tracking-widest pt-3 text-center ${error.includes("trimis") ? "text-emerald-400" : "text-pink-500"}`}>
                      {error}
                    </p>
                  )}
                </div>

                <button
                  disabled={loading}
                  className="w-full rounded-2xl py-5 text-lg font-black text-white bg-gradient-to-r from-indigo-500 to-pink-500 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest italic"
                >
                  {loading ? "Se verifică..." : "Confirmă Codul"}
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-[0.2em] transition-colors italic"
                >
                  Nu ai primit codul? <span className="text-indigo-400 underline decoration-indigo-500/20 ml-1">Trimite din nou</span>
                </button>
              </form>
            )}

            <div className="mt-12 pt-8 border-t border-white/5 text-center">
              <Link to="/auth/login" className="text-[10px] font-black text-gray-500 hover:text-indigo-400 uppercase tracking-widest transition-colors italic">
                ← Revino la pagina de login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}