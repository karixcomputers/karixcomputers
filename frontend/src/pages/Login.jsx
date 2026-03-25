import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import axios from "axios";
// IMPORTĂM COMPONENTA SEO
import SEO from "../components/SEO";

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Formular clasic (Email/Parolă)
  const [form, setForm] = useState({ email: "", password: "" });

  // State-uri pentru client NOU (Google Step 2)
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [profileData, setProfileData] = useState({ name: "", email: "", avatar: "", phone: "" });
  
  // NOU: State pentru bifa de Termeni și Condiții
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "https://karixcomputers.ro/api";
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // --- 1. CAPTURĂM TOKEN-UL CÂND NE ÎNTOARCEM DE LA GOOGLE ---
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");

      if (accessToken) {
        handleBackendLogin(accessToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleBackendLogin = async (token) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/google`, { token });
      
      // Dacă backend-ul zice că e client NOU (Status 202)
      if (res.status === 202 && res.data.require_profile_completion) {
        setTempToken(res.data.tempToken);
        setProfileData({
          name: res.data.profileData.name || "",
          email: res.data.profileData.email || "",
          avatar: res.data.profileData.avatar || "",
          phone: ""
        });
        setIsCompletingProfile(true); // Schimbăm interfața la Pasul 2
        return;
      }

      // Dacă e client EXISTENT (Status 200 normal)
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

  // --- 2. FINALIZARE CONT NOU GOOGLE (Trimitem Nume + Telefon) ---
  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!acceptedTerms) {
      setError("Trebuie să accepți Termenii și Condițiile.");
      setLoading(false);
      return;
    }

    if (!profileData.phone || profileData.phone.length < 9) {
      setError("Te rugăm să introduci un număr de telefon valid.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/auth/google-complete`, {
        tempToken,
        name: profileData.name,
        phone: profileData.phone,
        termsAccepted: true
      });

      if (res.data && res.data.accessToken) {
        loginWithGoogle(res.data);
        nav("/account");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Eroare la finalizarea contului.");
    } finally {
      setLoading(false);
    }
  };

  // --- 3. REDIRECT MANUAL ABSOLUT ---
  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError("Eroare critică: VITE_GOOGLE_CLIENT_ID nu este setat în .env");
      return;
    }

    const redirectUri = "https://karixcomputers.ro/auth/login";
    const scope = "email profile";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}`;
    
    window.location.href = authUrl;
  };

  // --- 4. LOGARE CLASICĂ (Email + Parolă) ---
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
    <>
      {/* SEO: CONFIGURARE PENTRU PAGINA DE LOGIN */}
      <SEO 
        title="Autentificare Cont" 
        description="Conectează-te la contul tău Karix Computers pentru a accesa istoricul comenzilor, statusul garanțiilor și tichetele de suport tehnic."
      />

      <div className="min-h-screen pt-32 pb-24 px-4 relative flex justify-center bg-transparent">
        <div className="max-w-md w-full relative z-10">
          <div className="rounded-[40px] border border-white/10 bg-white/5 backdrop-blur-md p-8 sm:p-10 shadow-2xl transition-all duration-500">
            
            {error && (
              <div className="mb-6 rounded-2xl border border-pink-500/30 bg-pink-500/10 p-5 text-center backdrop-blur-md">
                <p className="text-sm text-pink-200 font-medium">{error}</p>
              </div>
            )}

            {isCompletingProfile ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="mb-8 text-center">
                  <div className="relative inline-block mb-4">
                    {profileData.avatar ? (
                      <img src={profileData.avatar} alt="Profile" className="w-20 h-20 rounded-full border-2 border-indigo-500 shadow-lg object-cover" />
                    ) : (
                      <div className="w-20 h-20 rounded-full border-2 border-indigo-500 bg-indigo-500/20 flex items-center justify-center text-2xl">👋</div>
                    )}
                  </div>
                  <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">
                    Aproape <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Gata!</span>
                  </h1>
                  <p className="text-xs text-gray-300 mt-2 font-medium italic px-4">
                    Salut, {profileData.name.split(' ')[0]}! Avem nevoie de numărul tău de telefon pentru facturare și livrări.
                  </p>
                </header>

                <form onSubmit={handleCompleteProfile} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-2 block text-left">Nume Complet</label>
                      <input
                        required
                        type="text"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500 outline-none transition-all font-medium"
                        value={profileData.name}
                        onChange={(e) => setProfileData(p => ({ ...p, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-2 block text-left">Telefon</label>
                      <input
                        required
                        type="tel"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500 outline-none transition-all font-medium placeholder:text-gray-600"
                        placeholder="Ex: 0712345678"
                        value={profileData.phone}
                        onChange={(e) => setProfileData(p => ({ ...p, phone: e.target.value }))}
                      />
                    </div>

                    <label className="flex items-start gap-3 mt-4 cursor-pointer group p-2 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="relative flex items-center mt-0.5">
                        <input 
                          type="checkbox" 
                          required 
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          className="peer h-4 w-4 shrink-0 appearance-none rounded border border-white/20 bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 focus:outline-none transition-all"
                        />
                        <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <span className="text-xs text-gray-400 font-medium leading-relaxed italic text-left">
                        Am citit și sunt de acord cu <Link to="/terms" target="_blank" className="text-indigo-400 hover:text-indigo-300 font-bold underline">Termenii și Condițiile</Link> și <Link to="/confidentialitate" target="_blank" className="text-indigo-400 hover:text-indigo-300 font-bold underline">Politica de Confidențialitate</Link>.
                      </span>
                    </label>
                  </div>

                  <button
                    disabled={loading || !acceptedTerms}
                    className="w-full rounded-2xl py-5 text-sm font-black text-white bg-indigo-500 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all disabled:opacity-50 uppercase tracking-widest"
                  >
                    {loading ? "Se salvează..." : "Finalizează Contul"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="animate-in fade-in duration-500">
                <header className="mb-8 text-center">
                  <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">
                    Bine ai <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">revenit</span>
                  </h1>
                  <p className="text-sm text-gray-300 mt-2 font-medium italic">
                    Introdu datele tale pentru a accesa contul Karix.
                  </p>
                </header>

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
                      <span className="bg-[#0b1020] px-4 text-gray-500">sau</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black font-medium py-4 rounded-2xl transition-all active:scale-[0.98] shadow-2xl disabled:opacity-50 uppercase text-xs tracking-tighter"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Continuă cu Google</span>
                  </button>

                  <div className="pt-6 border-t border-white/5 flex flex-row items-center justify-between w-full">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider italic">
                      Nu ai cont? <Link to="/auth/register" className="text-white hover:text-indigo-400 ml-1">Înregistrează-te</Link>
                    </p>
                    <Link to="/auth/forgot" className="text-xs font-bold text-white hover:text-indigo-400 uppercase tracking-wider transition-colors italic text-right">
                      Ai uitat parola?
                    </Link>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}