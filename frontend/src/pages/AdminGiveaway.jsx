import React, { useState } from "react";
// Asigură-te că importi corect apiFetch, exact cum ai făcut în Success.jsx
import { apiFetch } from "../api/client";

export default function Giveaway() {
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
    // Schimbăm ruta să bată la ADMIN, unde știm că restul funcțiilor merg
    const res = await apiFetch("/admin/giveaway-picker", { 
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
    <div className="min-h-screen pt-24 pb-12 px-4 bg-[#0b1020] text-white flex flex-col items-center">
      
      <div className="max-w-2xl w-full">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black italic tracking-tighter mb-2">
            Instagram <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Giveaway</span>
          </h1>
          <p className="text-gray-400">Extrage un câștigător aleatoriu din comentariile unei postări.</p>
        </div>

        <div className="p-8 rounded-[30px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl mb-8">
          <form onSubmit={handlePickWinner} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                Link Postare / Reel Instagram
              </label>
              <input
                type="url"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://www.instagram.com/p/..."
                className="w-full px-4 py-4 rounded-xl bg-black/30 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all text-white placeholder-gray-600"
                required
              />
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-4 rounded-xl font-black text-white bg-gradient-to-r from-purple-500 to-pink-600 hover:opacity-90 transition-opacity uppercase tracking-widest text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center h-[56px]"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                "🎲 Alege Câștigătorul"
              )}
            </button>
          </form>
        </div>

        {/* Zona de afișare a câștigătorului */}
        {winner && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-1 rounded-[30px] bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_40px_rgba(52,211,153,0.3)]">
            <div className="p-8 rounded-[28px] bg-[#0b1020] text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-emerald-500/10 z-0"></div>
              
              <div className="relative z-10 flex flex-col items-center">
                <span className="text-4xl mb-4 drop-shadow-lg">🏆</span>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-6">
                  Câștigător Extras (din {totalComments} comentarii)
                </p>
                
                {winner.profilePic && (
                  <img 
                    src={winner.profilePic} 
                    alt="Profile" 
                    className="w-24 h-24 rounded-full border-4 border-[#0b1020] shadow-[0_0_0_2px_rgba(52,211,153,0.5)] mb-4 object-cover"
                    onError={(e) => e.target.style.display = 'none'} // Ascunde imaginea dacă e blocată de Instagram
                  />
                )}
                
                <h2 className="text-3xl font-black text-white mb-2">@{winner.username}</h2>
                
                <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 w-full max-w-md">
                  <p className="text-sm text-gray-300 italic mb-1">Comentariul lăsat:</p>
                  <p className="text-white font-medium">"{winner.text}"</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}