import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../api/client"; 
import { useCart } from "../context/CartContext.jsx";
import { formatRON } from "../utils/money";

export default function Product() {
  const { id } = useParams();
  const { addItem } = useCart();
  const [p, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        // Eliminăm eventualele caractere parazite din ID (cum ar fi :1)
        const cleanId = id.split(":")[0];
        const res = await apiFetch(`/api/products/${cleanId}`);
        
        if (!res.ok) throw new Error("Produsul nu a fost găsit.");
        
        const data = await res.json();
        setProduct(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProductData();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1020]">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
  );

  if (error || !p) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b1020] text-white p-4 text-center">
      <h2 className="text-2xl font-black uppercase italic mb-4">Eroare 404</h2>
      <p className="text-gray-400 mb-8">{error || "Produsul nu mai există în baza de date."}</p>
      <Link to="/shop" className="px-8 py-3 bg-indigo-600 rounded-xl font-bold uppercase text-xs">Înapoi în Shop</Link>
    </div>
  );

  const inStock = p.priceCents > 0; // Folosim prețul ca indicator de disponibilitate dacă nu ai stock în DB

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 bg-[#0b1020] text-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-xs font-black uppercase tracking-widest text-gray-500 mb-8 flex gap-2">
          <Link to="/shop" className="hover:text-white transition-colors">Magazin</Link> 
          <span>/</span> 
          <span className="text-indigo-400 italic">{p.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Imagine Produs */}
          <div className="rounded-[40px] overflow-hidden border border-white/5 bg-white/[0.02] aspect-square lg:aspect-auto lg:h-[600px] relative group">
            <img
              src={p.images?.[0] || "https://placehold.co/900x900/0b1020/ffffff?text=Karix+Computers"}
              alt={p.name}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1020] to-transparent opacity-40" />
          </div>

          {/* Detalii Produs */}
          <div className="flex flex-col">
            <span className={`w-fit px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 border ${p.category === 'service' ? 'border-pink-500/30 text-pink-500 bg-pink-500/5' : 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5'}`}>
              {p.category === 'service' ? 'Karix Service' : 'Hardware Premium'}
            </span>
            
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-6 leading-none">
              {p.name}
            </h1>

            <div className="text-4xl font-black text-white mb-8 italic">
              {formatRON(p.priceCents)}
            </div>

            {/* Specificații */}
            {p.category !== 'service' && (
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { label: 'CPU', val: p.cpuBrand, icon: '⚡' },
                  { label: 'GPU', val: p.gpuBrand, icon: '🎮' },
                  { label: 'RAM', val: p.ramGb, icon: '📟' },
                  { label: 'Storage', val: p.storageGb, icon: '💾' }
                ].map((spec, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                    <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-1">{spec.label}</p>
                    <p className="text-sm font-bold text-gray-200 italic">{spec.val || 'N/A'}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="text-gray-400 text-sm leading-relaxed mb-10 italic font-medium border-l-2 border-indigo-500/30 pl-6">
              {p.description || "Acest sistem a fost configurat și testat riguros de echipa Karix pentru a oferi stabilitate maximă în orice scenariu de utilizare."}
            </div>

            {/* Acțiuni */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-auto">
              <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-2 w-full sm:w-auto">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 flex items-center justify-center hover:text-indigo-400 transition-colors">－</button>
                <span className="w-12 text-center font-black">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="w-10 h-10 flex items-center justify-center hover:text-indigo-400 transition-colors">＋</button>
              </div>
              
              <button
                onClick={() => addItem({...p, qty})}
                className="flex-1 w-full py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-pink-600 text-white font-black uppercase tracking-widest text-xs hover:scale-[1.02] transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
              >
                Adaugă în coș
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}