import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerApi } from "../api/auth";

export default function Register() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false); // Stare pentru checkbox

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });

  async function submit(e) {
    e.preventDefault();
    
    // Verificare suplimentară de siguranță
    if (!acceptedTerms) {
      setError("Trebuie să accepți Termenii și Condițiile.");
      return;
    }

    setError("");
    setLoading(true);
    
    try {
      // Trimitem și 'termsAccepted: true' către backend
      await registerApi({ ...form, termsAccepted: true });
      
      nav(`/auth/verify?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err.message || "Eroare la creare cont");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen pt-12 pb-24 px-4 relative overflow-hidden flex justify-center">
      {/* Glow-uri de fundal Karix */}
      <div className="absolute top-0 -left-20 w-[400px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-0 -right-20 w-[400px] h-[400px] bg-pink-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <div className="rounded-[40px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8 sm:p-10 shadow-2xl">
          
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-black text-white tracking-tight">
              Creează <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">cont</span>
            </h1>
            <p className="text-sm text-gray-400 mt-2 font-medium">
              Alătură-te comunității Karix pentru performanță extremă.
            </p>
          </header>

          {error && (
            <div className="mb-6 rounded-2xl border border-pink-500/30 bg-pink-500/10 p-4 text-sm text-pink-200 animate-in fade-in slide-in-from-top-2">
              <span className="font-bold">Atenție:</span> {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nume Complet</label>
                <input
                  required
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-gray-600"
                  placeholder="Popescu Ion"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Număr Telefon</label>
                <input
                  required
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-gray-600"
                  placeholder="07xx xxx xxx"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Email</label>
                <input
                  required
                  type="email"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-gray-600"
                  placeholder="email@exemplu.ro"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
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
                />
              </div>
            </div>

            {/* CHECKBOX TERMENI SI CONDITII */}
            <div className="flex items-start gap-3 px-1 py-2">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  type="checkbox"
                  required
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="w-5 h-5 rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500/20 cursor-pointer transition-all"
                />
              </div>
              <label htmlFor="terms" className="text-[12px] text-gray-400 leading-tight cursor-pointer select-none">
                Sunt de acord cu{" "}
                <Link to="/terms" className="text-indigo-400 hover:text-indigo-300 font-bold underline decoration-indigo-500/20">
                  Termenii și Condițiile
                </Link>{" "}
                și politica de confidențialitate Karix.
              </label>
            </div>

            <button
              disabled={loading || !acceptedTerms}
              className="w-full mt-2 rounded-2xl py-5 text-lg font-black text-white bg-gradient-to-r from-indigo-500 to-pink-500 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 hover:-translate-y-1 active:scale-[0.98] transition-all disabled:opacity-30 disabled:translate-y-0 disabled:cursor-not-allowed"
            >
              {loading ? "Se procesează..." : "Creează cont"}
            </button>

            <div className="pt-6 text-center border-t border-white/5">
              <p className="text-sm text-gray-400 font-medium uppercase tracking-tighter">
                Ai deja cont?{" "}
                <Link to="/auth/login" className="text-white font-bold hover:text-indigo-400 transition-all ml-1">
                  Autentifică-te
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}