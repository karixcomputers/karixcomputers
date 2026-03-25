import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { resendVerificationApi } from "../api/auth";
// IMPORTĂM COMPONENTA SEO
import SEO from "../components/SEO";

export default function VerifyCode() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");
  const { verifyCode } = useAuth();
  const nav = useNavigate();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyCode(email, code);
      nav("/account");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await resendVerificationApi(email);
      setMsg("Un cod nou a fost trimis!");
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <>
      {/* SEO: CONFIGURARE PENTRU PAGINA DE VERIFICARE */}
      <SEO 
        title="Verificare Email" 
        description="Introdu codul de securitate primit pe email pentru a activa contul tău Karix Computers și a finaliza înregistrarea."
      />

      <div className="min-h-screen pt-12 pb-24 px-4 relative flex justify-center bg-transparent">
        <div className="absolute top-0 w-full h-[500px] bg-indigo-500/5 blur-[120px] pointer-events-none" />
        
        <div className="max-w-md w-full relative z-10">
          <div className="rounded-[40px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-10 shadow-2xl text-center">
            
            <div className="h-16 w-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6 text-indigo-400">
              📩
            </div>

            <h1 className="text-3xl font-black text-white mb-2 uppercase italic tracking-tight">
              Verificare <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Email</span>
            </h1>
            
            <p className="text-sm text-gray-400 mb-8 font-medium italic">
              Am trimis un cod de 6 cifre la <br/>
              <span className="text-white font-bold">{email}</span>
            </p>

            <form onSubmit={handleVerify} className="space-y-6">
              <input 
                required
                type="text"
                className="w-full bg-white/[0.05] border border-white/10 rounded-2xl p-5 text-center text-3xl font-black tracking-[0.5em] text-white focus:border-indigo-500 outline-none transition-all placeholder:text-gray-700"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} // Permitem doar cifre
              />
              
              {msg && (
                <p className={`text-xs font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-1 ${msg.includes("trimis") ? "text-emerald-400" : "text-pink-400"}`}>
                  {msg}
                </p>
              )}

              <button 
                disabled={loading}
                className="w-full py-5 rounded-2xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-black text-lg shadow-lg shadow-indigo-500/20 hover:-translate-y-1 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 uppercase tracking-widest italic"
              >
                {loading ? "Se verifică..." : "Activează Contul"}
              </button>
            </form>

            <button 
              onClick={resend} 
              className="mt-8 text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-[0.2em] transition-colors italic"
            >
              Nu ai primit codul? <span className="text-indigo-400 underline decoration-indigo-500/20 ml-1">Trimite din nou</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}