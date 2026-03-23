import React from "react";
import { Link } from "react-router-dom";
import { formatRON } from "../utils/money";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

export default function ProductCard({ p, product }) {
  const { addToCart } = useCart();
  const { toggleWishlist, isFavorite } = useWishlist();

  const data = p || product;

  // --- FUNCȚIE HELPER PENTRU IMAGINI (ADĂUGATĂ) ---
  const getImageUrl = (img) => {
    if (!img) return "https://placehold.co/800x500/0b1020/ffffff?text=Karix+PC";
    if (img.startsWith("http")) return img;
    return `https://karixcomputers.ro/uploads/${img}`;
  };

  if (!data) return null;

  const inStock = (data.stock || 0) > 0;

  const handleAddToCart = (e) => {
    e.preventDefault(); 
    
    const nameLower = (data.name || "").toLowerCase();
    const isService = ['mentenanta', 'service', 'curatare', 'reparatie'].some(kw => nameLower.includes(kw));
    
    let finalWarranty = data.warrantyMonths;
    if (finalWarranty === undefined || finalWarranty === null) {
        finalWarranty = isService ? 0 : 24;
    }

    const productToCart = {
      ...data,
      productName: data.name,
      warrantyMonths: Number(finalWarranty),
      // REPARAT: Ne asigurăm că și în coș ajunge link-ul corect al imaginii
      image: getImageUrl(data.images?.[0]),
      specs: {
        cpu: data.cpuBrand,
        gpu: data.gpuBrand,
        motherboard: data.motherboard,
        ram: data.ramGb,
        storage: data.storageGb,
        case: data.case,
        cooler: data.cooler,
        psu: data.psu
      }
    };

    addToCart(productToCart, 1);
  };

  return (
    <div className="relative flex flex-col rounded-[35px] bg-white/5 border border-white/10 overflow-hidden group hover:border-indigo-500/40 transition-all duration-500 backdrop-blur-md shadow-2xl text-left">
      
      {/* ❤️ BUTON WISHLIST */}
      <button
        onClick={(e) => {
          e.preventDefault();
          toggleWishlist(data.id);
        }}
        className={`absolute top-4 right-4 z-30 h-10 w-10 rounded-xl backdrop-blur-xl border flex items-center justify-center transition-all duration-300 active:scale-90 shadow-2xl ${
          isFavorite(data.id)
            ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' 
            : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
        }`}
      >
        <span className="text-lg leading-none transition-transform duration-300">
          {isFavorite(data.id) ? '❤️' : '🤍'}
        </span>
      </button>

      {/* ZONA IMAGINE */}
      <Link to={`/product/${data.id}`} className="block relative h-64 overflow-hidden">
        <div className="absolute top-5 left-5 z-20">
          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl border ${
            inStock 
              ? 'bg-indigo-500 border-indigo-400 text-white' 
              : 'bg-white/5 border border-white/10 text-gray-400'
          }`}>
            {inStock ? 'În Stoc' : 'La Comandă'}
          </span>
        </div>

        <img
          src={getImageUrl(data.images?.[0])} // REPARAT AICI
          alt={data.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80" />
      </Link>

      <div className="p-8 flex-1 flex flex-col">
        <Link to={`/product/${data.id}`} className="block mb-6 group/title">
          <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
            {data.cpuBrand?.split(' ')[0] || 'Custom'} Edition
          </p>
          <h3 className="text-2xl font-black text-white tracking-tight italic uppercase line-clamp-2 group-hover/title:text-indigo-400 transition-colors leading-tight">
            {data.name}
          </h3>
        </Link>

        {/* SPECIFICAȚII COMPLETE */}
        <div className="grid grid-cols-1 gap-2.5 mb-8">
          <div className="text-[11px] font-medium text-gray-400 italic">
            ⚡ CPU: <span className="text-white not-italic">{data.cpuBrand || 'N/A'}</span>
          </div>
          <div className="text-[11px] font-medium text-gray-400 italic">
            🎮 GPU: <span className="text-white not-italic">{data.gpuBrand || 'N/A'}</span>
          </div>
          <div className="text-[11px] font-medium text-gray-400 italic">
            🧩 PLACA DE BAZA: <span className="text-white not-italic">{data.motherboard || 'N/A'}</span>
          </div>
          <div className="text-[11px] font-medium text-gray-400 italic">
            📟 RAM: <span className="text-white not-italic">{data.ramGb || '0'}GB</span>
          </div>
          <div className="text-[11px] font-medium text-gray-400 italic">
            💾 SSD: <span className="text-white not-italic">{data.storageGb || '0'}GB</span>
          </div>
          <div className="text-[11px] font-medium text-gray-400 italic">
            📦 CARCASA: <span className="text-white not-italic">{data.case || 'N/A'}</span>
          </div>
          <div className="text-[11px] font-medium text-gray-400 italic">
            ❄️ COOLER: <span className="text-white not-italic">{data.cooler || 'N/A'}</span>
          </div>
          <div className="text-[11px] font-medium text-gray-400 italic">
            🔌 PSU: <span className="text-white not-italic">{data.psu || 'N/A'}</span>
          </div>
          
          {data.warrantyMonths !== undefined && (
            <div className="text-[10px] text-indigo-300 font-bold uppercase mt-2 flex items-center gap-2">
              <span className="w-4 h-4 bg-indigo-500/20 rounded flex items-center justify-center">🛡️</span>
              {data.warrantyMonths} Luni Garanție
            </div>
          )}
        </div>

        <div className="mt-auto pt-6 border-t border-white/10 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Preț Sistem</span>
            <span className="text-2xl font-black text-white italic">{formatRON(data.priceCents)}</span>
          </div>

          <div className="flex gap-2 flex-1">
            <Link 
              to={`/product/${data.id}`}
              className="flex-1 h-14 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center justify-center font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg"
            >
              Detalii
            </Link>
            <button
              disabled={!inStock && data.priceCents === 0}
              onClick={handleAddToCart}
              className="flex-1 h-14 rounded-2xl bg-white text-black hover:bg-indigo-500 hover:text-white transition-all duration-300 flex items-center justify-center font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg disabled:opacity-20"
            >
              Adaugă
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}