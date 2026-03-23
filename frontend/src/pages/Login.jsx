import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
// --- IMPORTUL NOU PENTRU HOOK-UL GOOGLE ---
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios"; // Import obligatoriu pentru comunicarea cu backend-ul

export default function Login() {
  // Am adăugat loginWithGoogle aici
  const { login, loginWithGoogle } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  // 1. Autentificare clasică (Email/Parolă)
  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      nav("/account");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Autentificare eșuată");
    } finally {
      setLoading(false);
    }
  }

  // 2. Autentificare Google
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError("");
      try {
        // Trimitem access_token-ul la backend-ul tău (Port 4000)
        const res = await axios.post(`${API_URL}/auth/google`, {
          token: tokenResponse.access_token,
        });

        // Verificăm dacă primim datele corect
        if (res.data && res.data.accessToken) {
          // SALVĂM DATELE ÎN CONTEXT (Asta te loghează vizual peste tot)
          loginWithGoogle(res.data);
          
          // Navigăm către cont
          nav("/account");
        }
      } catch (err) {
        console.error("Google Login Error:", err);
        setError(err.response?.data?.error || "Eroare la sincronizarea cu contul Google.");
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.error("Google Auth Failure:", error);
      setError("Conectarea cu Google a eșuat sau a fost anulată.");
    },
  });

  return (
    <div className="min-h-screen pt-12 pb-24 px-4 relative overflow-hidden flex justify-center">
      
      {/* Glow-uri de fundal Karix */}
      <div className="absolute top-0 -left-20 w-[400px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-0 -right-20 w-[400px] h-[400px] bg-pink-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <div className="rounded-[40px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8 sm:p-10 shadow-2xl">
          
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-black text-white tracking-tight">
              Bine ai <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">revenit</span>
            </h1>
            <p className="text-sm text-gray-400 mt-2 font-medium">
              Introdu datele tale pentru a accesa contul Karix.
            </p>
          </header>

          {error && (
            <div className="mb-6 rounded-2xl border border-pink-500/30 bg-pink-500/10 p-5 animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-col gap-3">
                <p className="text-sm text-pink-200 font-medium">
                  {error === "EMAIL_NOT_VERIFIED" 
                    ? "Contul tău nu este activat. Te rugăm să confirmi adresa de email." 
                    : error}
                </p>
                {error === "EMAIL_NOT_VERIFIED" && (
                  <button 
                    type="button"
                    onClick={() => nav(`/auth/verify?email=${form.email}`)}
                    className="w-full py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                  >
                    Confirmă emailul acum →
                  </button>
                )}
              </div>
            </div>
          )}

          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Email</label>
                <input
                  required
                  type="email"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-gray-600"
                  placeholder="email@exemplu.ro"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Parolă</label>
                <input
                  required
                  type="password"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-gray-600"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full mt-2 rounded-2xl py-5 text-lg font-black text-white bg-gradient-to-r from-indigo-500 to-pink-500 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? "Se conectează..." : "Autentificare"}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                <span className="bg-[#0b1020] px-4 text-gray-500">sau</span>
              </div>
            </div>

            {/* BUTON GOOGLE - ACUM COMPLET FUNCȚIONAL */}
            <button
              type="button"
              onClick={() => handleGoogleLogin()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black font-bold py-4 rounded-2xl transition-all active:scale-[0.98] shadow-xl disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-sm uppercase tracking-tight">Continuă cu Google</span>
            </button>

            <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link to="/auth/forgot" className="text-xs font-bold text-white hover:text-indigo-400 uppercase tracking-wider transition-colors">
                Ai uitat parola?
              </Link>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                Nu ai cont?{" "}
                <Link to="/auth/register" className="text-white font-bold hover:text-indigo-400 ml-1 transition-colors">
                  Înregistrează-te
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}