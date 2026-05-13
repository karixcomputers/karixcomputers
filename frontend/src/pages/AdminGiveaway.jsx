import React, { useState } from "react";
import { apiFetch } from "../api/client";

export default function AdminGiveaway() {
  const [postUrl, setPostUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [winner, setWinner] = useState(null);
  const [error, setError] = useState("");
  const [totalComments, setTotalComments] = useState(0);

  const handlePickWinner = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setWinner(null);

    try {
      const res = await apiFetch("/admin/insta-pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la extragere.");

      setWinner(data.winner);
      setTotalComments(data.totalComments);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // FIX 1: FUNDAL TRANSPARENT PE CONTAINERUL PRINCIPAL
    <div className="relative min-h-screen pt-32 pb-24 px-4 overflow-hidden bg-transparent text-white">
      
      {/* BLOBS DE LUMINĂ INTERNI (PĂSTRAȚI PENTRU ADÂNCIME) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[140px] -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-[140px] -z-10" />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* HEADER KARIX */}
        <header className="mb-16 text-center">
          <h1 className="text-6xl font-black text-white tracking-tighter mb-4 italic uppercase">
            Instagram <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-500">Giveaway</span>
          </h1>
          <div className="h-1.5 w-24 bg-gradient-to-r from-indigo-500 to-pink-500 mx-auto rounded-full opacity-40 mb-6" />
          <p className="text-gray-500 uppercase tracking-[0.4em] text-[10px] font-bold">
            Panou Administrativ Extrageri © 2026
          </p>
        </header>

        {/* FORM CARD - GLASSMORPHISM (TRANSPARENT + BLUR) */}
        <div className="relative p-1 rounded-[32px] bg-gradient-to-b from-white/10 to-transparent mb-12">
          {/* FIX 2: SCHIMBAT CULOAREA DE FUNDAL ÎN bg-white/[0.02] PENTRU TRANSPARENȚĂ */}
          <div className="p-8 rounded-[31px] bg-white/[0.02] backdrop-blur-xl border border-white/5">
            <form onSubmit={handlePickWinner} className="space-y-6">
              <div className="relative">
                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-2 mb-2 block">
                  URL Postare Instagram
                </label>
                <input
                  type="url"
                  value={postUrl}
                  onChange={(e) => setPostUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/..."
                  // Fundal input și mai transparent
                  className="w-full px-6 py-5 rounded-2xl bg-black/30 backdrop-blur-md border border-white/5 outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-gray-200"
                  required
                />
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-3 italic backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  {error}
                </div>
              )}

              <button
                disabled={loading}
                className="relative w-full py-5 rounded-2xl font-black text-lg uppercase italic tracking-tight overflow-hidden group/btn transition-all active:scale-95 disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-pink-600 group-hover/btn:scale-110 transition-transform duration-500" />
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      SE EXTRAGE DIN INSTAGRAM...
                    </>
                  ) : (
                    <>🎲 ALEGE CÂȘTIGĂTORUL</>
                  )}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* WINNER RESULT - GLASSMORPHISM EMERALD */}
        {winner && (
          <div className="relative group animate-in fade-in zoom-in duration-700">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-[35px] blur-xl opacity-20" />
            
            {/* FIX 3: SCHIMBAT bg-[#050810] ÎN bg-emerald-500/[0.03] PENTRU TRANSPARENȚĂ TONALĂ + BLUR */}
            <div className="relative p-10 rounded-[32px] bg-emerald-500/[0.03] backdrop-blur-2xl border border-emerald-500/20 text-center overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
              
              <p className="text-emerald-400 font-black uppercase text-[10px] tracking-[0.3em] mb-6 relative z-10">
                ✨ Extragere finalizată din {totalComments} comentarii
              </p>
              
              <div className="relative inline-block mb-6 z-10">
                <div className="absolute -inset-4 bg-emerald-500/20 blur-2xl rounded-full" />
                <h2 className="relative text-5xl sm:text-6xl font-black text-white italic tracking-tighter uppercase">
                  @{winner.username}
                </h2>
              </div>

              {/* Caseta comentariu transparentă */}
              <div className="max-w-md mx-auto p-6 rounded-2xl bg-black/20 border border-white/5 relative z-10 backdrop-blur-sm">
                <span className="absolute -top-3 left-6 px-3 py-1 bg-emerald-500 text-[8px] font-black rounded-full text-black uppercase">
                  Comentariu
                </span>
                <p className="text-gray-300 italic text-lg leading-relaxed font-medium">
                  "{winner.text}"
                </p>
              </div>

              <button 
                onClick={() => window.open(postUrl, '_blank')}
                className="mt-8 text-[10px] font-bold text-gray-500 hover:text-emerald-400 transition-colors uppercase tracking-widest relative z-10"
              >
                Vezi postarea originală →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}