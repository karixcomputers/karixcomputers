import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "https://karixcomputers.ro/api";

  // --- 1. LOGICA DE "CATCH" DUPĂ REDIRECT ---
  // Când Google te trimite înapoi, token-ul este în URL după simbolul # (Implicit Flow)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");

      if (accessToken) {
        handleBackendLogin(accessToken);
        // Curățăm URL-ul pentru un aspect profi
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleBackendLogin = async (token) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/google`, { token });
      if (res.data && res.data.accessToken) {
        loginWithGoogle(res.data);
        nav("/account");
      }
    } catch (err) {
      console.error("Google Auth Error:", err);
      setError("Sincronizarea cu Karix a eșuat.");
    } finally {
      setLoading(false);
    }
  };

  // --- 2. FORȚĂM REDIRECT-UL (FĂRĂ POPUP) ---
  const handleGoogleLogin = useGoogleLogin({
    flow: "implicit",
    ux_mode: "redirect", // Forțează deschiderea în același tab
    redirect_uri: "https://karixcomputers.ro/auth/login",
  });

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      nav("/account");
    } catch (err) {
      setError(err.response?.data?.error || "Autentificare eșuată");
    } finally {
      setLoading(false);
    }
  }

  return (
    /* Modificat: bg-transparent și overflow-hidden eliminat pentru a lăsa animația globală să respire */
    <div className="min-h-screen pt-32 pb-24 px-4 relative flex justify-center bg-transparent">
      
      {/* --- GLOW-URI DE FUNDAL ELIMINATE --- */}

      <div className="max-w-md w-full relative z-10">
        {/* Card cu efect de sticlă (Glassmorphism) ca în pagina de Servicii */}
        <div className="rounded-[40px] border border-white/10 bg-white/5 backdrop-blur-md p-8 sm:p-10 shadow-2xl">
          
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">
              Bine ai <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">revenit</span>
            </h1>
            <p className="text-sm text-gray-300 mt-2 font-medium italic">
              Introdu datele tale pentru a accesa contul Karix.
            </p>
          </header>

          {error && (
            <div className="mb-6 rounded-2xl border border-pink-500/30 bg-pink-500/10 p-5 text-center backdrop-blur-md">
              <p className="text-sm text-pink-200 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-4">
              <input
                required
                type="email"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500 outline-none transition-all placeholder:text-gray-500 font-medium"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              />
              <input
                required
                type="password"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500 outline-none transition-all placeholder:text-gray-600 font-medium"
                placeholder="Parolă"
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>

            <button
              disabled={loading}
              className="w-full mt-2 rounded-2xl py-5 text-lg font-black text-white bg-indigo-500 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all disabled:opacity-50 uppercase tracking-widest"
            >
              {loading ? "Se procesează..." : "Autentificare"}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                <span className="bg-transparent px-4 text-gray-500">sau</span>
              </div>
            </div>

            {/* BUTON GOOGLE - ACUM FĂRĂ POPUP */}
            <button
              type="button"
              onClick={() => handleGoogleLogin()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black font-black py-4 rounded-2xl transition-all active:scale-[0.98] shadow-2xl disabled:opacity-50 uppercase text-xs tracking-tighter"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Continuă cu Google</span>
            </button>

            <div className="pt-6 border-t border-white/5 flex flex-col items-center gap-4">
              <Link to="/auth/forgot" className="text-xs font-bold text-white hover:text-indigo-400 uppercase tracking-wider transition-colors italic">
                Ai uitat parola?
              </Link>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider italic">
                Nu ai cont? <Link to="/auth/register" className="text-white hover:text-indigo-400 ml-1">Înregistrează-te</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}