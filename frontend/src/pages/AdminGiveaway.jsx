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
      // APELĂM RUTA DE ADMIN CARE DEJA FUNCȚIONEAZĂ PENTRU PRODUSE/COMENZI
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
    <div className="min-h-screen pt-24 pb-12 px-4 bg-[#0b1020] text-white flex flex-col items-center">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-black italic text-center mb-8 uppercase tracking-tighter">
          Instagram <span className="text-purple-500">Giveaway</span>
        </h1>

        <div className="p-8 rounded-[30px] bg-white/5 border border-white/10 backdrop-blur-xl mb-8">
          <form onSubmit={handlePickWinner} className="flex flex-col gap-4">
            <input
              type="url"
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="Lipește link-ul postării aici..."
              className="w-full px-4 py-4 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-purple-500 transition-all"
              required
            />
            {error && <p className="text-red-400 text-sm font-bold">{error}</p>}
            <button
              disabled={loading}
              className="w-full py-4 rounded-xl font-black bg-gradient-to-r from-purple-500 to-pink-600 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "SE EXTRAGE..." : "🎲 ALEGE CÂȘTIGĂTOR"}
            </button>
          </form>
        </div>

        {winner && (
          <div className="p-8 rounded-[30px] bg-emerald-500/10 border border-emerald-500/30 text-center animate-bounce-short">
            <p className="text-emerald-400 font-bold uppercase text-xs mb-4">Câștigător din {totalComments} comentarii</p>
            <h2 className="text-3xl font-black mb-2 text-white">@{winner.username}</h2>
            <div className="p-4 bg-black/20 rounded-xl italic text-gray-300">"{winner.text}"</div>
          </div>
        )}
      </div>
    </div>
  );
}