import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { formatRON } from "../utils/money";

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 👉 1. STĂRI PENTRU ISTORIC RETRAGERI
  const [withdrawals, setWithdrawals] = useState([]);
  const [showWithdrawals, setShowWithdrawals] = useState(false);
  
  const [form, setForm] = useState({
    code: "",
    discountType: "percentage",
    discountValue: "",
    minOrderTotal: "0",
    usageLimit: "",
    expiryDate: "",
    userEmail: "" 
  });

  const fetchCoupons = async () => {
    try {
      const res = await apiFetch("/coupons");
      if (res.ok) setCoupons(await res.json());

      // 👉 2. TRAGEM ISTORICUL DIN BACKEND
      const resW = await apiFetch("/coupons/withdraw");
      if (resW.ok) setWithdrawals(await resW.json());
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      discountValue: form.discountType === 'fixed' ? Math.round(parseFloat(form.discountValue) * 100) : form.discountValue,
      minOrderTotal: Math.round(parseFloat(form.minOrderTotal) * 100)
    };

    try {
      const res = await apiFetch("/coupons", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setForm({ 
          code: "", 
          discountType: "percentage", 
          discountValue: "", 
          minOrderTotal: "0", 
          usageLimit: "", 
          expiryDate: "",
          userEmail: "" 
        });
        fetchCoupons();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) { alert("Eroare server."); }
  };

  const deleteCoupon = async (id) => {
    if (!window.confirm("Ștergi acest cod?")) return;
    await apiFetch(`/coupons/${id}`, { method: "DELETE" });
    fetchCoupons();
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 md:px-8 text-white relative">
      <div className="max-w-6xl mx-auto z-10 relative">
        
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter">
              Control <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">Cupoane</span>
            </h1>
            <p className="text-gray-400 font-medium italic mt-2">Generează reduceri pentru clienții Karix.</p>
          </div>
          <div className="flex gap-4">
            {/* 👉 3. BUTONUL DE ISTORIC RETRAGERI ÎN HEADER */}
            <button 
              onClick={() => setShowWithdrawals(!showWithdrawals)} 
              className={`px-6 py-3 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${showWithdrawals ? 'bg-pink-600 border-pink-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
            >
              {showWithdrawals ? "🎰 Vezi Cupoane" : `💰 Istoric Retrageri (${withdrawals.length})`}
            </button>
            <Link to="/admin" className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">← Dashboard</Link>
          </div>
        </header>

        {/* DUPĂ CUM AI CERUT: DUPĂ APĂSAREA BUTONULUI, SCHIMBĂM CE SE VEDE JOS */}
        {!showWithdrawals ? (
          <>
            {/* Formular Creare */}
            <form onSubmit={handleSubmit} className="p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl mb-16 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Cod Reducere</label>
                  <input required type="text" placeholder="EX: KARIX10" className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500 transition-all uppercase font-bold" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Tip Reducere</label>
                  <select className="bg-[#0b1020] border border-white/10 p-4 rounded-2xl outline-none cursor-pointer" value={form.discountType} onChange={e => setForm({...form, discountType: e.target.value})}>
                    <option value="percentage">Procentaj (%)</option>
                    <option value="fixed">Sumă Fixă (RON)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Valoare ({form.discountType === 'percentage' ? '%' : 'RON'})</label>
                  <input required type="number" placeholder="10" className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold" value={form.discountValue} onChange={e => setForm({...form, discountValue: e.target.value})} />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Comandă Minimă (RON)</label>
                  <input type="number" className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none" value={form.minOrderTotal} onChange={e => setForm({...form, minOrderTotal: e.target.value})} />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Limită Utilizări (Opțional)</label>
                  <input type="number" placeholder="Nelimitat" className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none" value={form.usageLimit} onChange={e => setForm({...form, usageLimit: e.target.value})} />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Data Expirării (Opțional)</label>
                  <input type="date" className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none text-gray-400" value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})} />
                </div>

                <div className="flex flex-col gap-2 md:col-span-3">
                  <label className="text-[10px] font-black text-pink-400 uppercase tracking-widest ml-2">Email Utilizator (Opțional - Completează doar dacă e cod de afiliat)</label>
                  <input type="email" placeholder="EX: pilot@karix.ro" className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-pink-500 transition-all font-bold" value={form.userEmail} onChange={e => setForm({...form, userEmail: e.target.value})} />
                </div>

                <button type="submit" className="md:col-span-3 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl font-black uppercase tracking-[0.2em] hover:scale-[1.01] transition-all active:scale-95 shadow-xl shadow-emerald-900/20">
                  Creează Cupon Nou
                </button>
              </div>
            </form>

            {/* Lista Cupoane */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {coupons.map(c => (
                <div key={c.id} className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                  <div className="flex flex-col gap-1">
                    <span className="text-xl font-black italic text-white uppercase">{c.code}</span>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold uppercase text-gray-500">
                      <span className="text-emerald-400">{c.discountType === 'percentage' ? `${c.discountValue}%` : `${c.discountValue/100} RON`} OFF</span>
                      <span>• Folosit: {c.timesUsed} {c.usageLimit ? `/ ${c.usageLimit}` : ''}</span>
                      <span className="text-amber-400">• Total Redus: {((c.totalDiscounted || 0) / 100).toFixed(2)} RON</span>
                      {c.userId && <span className="text-indigo-400 font-black">• 👤 COD AFILIAT</span>}
                    </div>
                    {c.minOrderTotal > 0 && <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-tighter">Min: {c.minOrderTotal/100} RON</span>}
                  </div>
                  <button onClick={() => deleteCoupon(c.id)} className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-pink-500/20 hover:bg-pink-500 hover:text-white">✕</button>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* 👉 4. LISTA CURATĂ CU ISTORICUL RETRAGERILOR */
          <div className="flex flex-col gap-4">
            {withdrawals.length === 0 ? (
              <p className="text-gray-500 italic text-sm ml-2">Nu există nicio cerere înregistrată în baza de date.</p>
            ) : (
              withdrawals.map(w => (
                <div key={w.id} className="p-6 rounded-3xl bg-white/5 border border-white/10 flex justify-between items-center gap-4 hover:border-pink-500/30 transition-all">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-xl text-white">{w.fullName}</span>
                      <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded text-gray-400 font-bold uppercase">{w.type}</span>
                      <span className="px-3 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/10 text-amber-400">{w.status}</span>
                    </div>
                    <div className="text-xs text-gray-400 font-mono mt-1">IBAN: <span className="text-gray-200">{w.iban}</span> | {w.bankName}</div>
                    <div className="text-xs text-gray-400 font-mono">CNP/CUI: <span className="text-gray-200">{w.identifier}</span></div>
                    <div className="text-[10px] text-indigo-400 font-bold uppercase mt-2">Dată cerere: {new Date(w.createdAt).toLocaleString('ro-RO')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-pink-500">{Number(w.amountRon).toFixed(2)} RON</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}