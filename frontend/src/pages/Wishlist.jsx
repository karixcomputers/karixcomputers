import React from "react";
import { Link } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext"; 
import ProductCard from "../components/ProductCard"; 
// IMPORTĂM COMPONENTA SEO
import SEO from "../components/SEO";

export default function Wishlist() {
  const { wishlist } = useWishlist();

  return (
    <>
      {/* SEO: CONFIGURARE PENTRU PAGINA DE FAVORITE */}
      <SEO 
        title="Sisteme Favorite" 
        description="Salvează configurațiile care îți plac și compară-le mai târziu. Lista ta de dorințe pentru setup-ul perfect la Karix Computers."
      />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-transparent">
        
        {/* GLOW-URI DE FUNDAL ANIMATE (Stil Karix Consistent) */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/4 -right-20 w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full animate-blob" />
          <div className="absolute bottom-1/4 -left-20 w-[500px] h-[500px] bg-pink-500/10 blur-[120px] rounded-full animate-blob animation-delay-2000" />
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <header className="mb-12">
            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-2 italic uppercase drop-shadow-2xl text-left leading-none">
              Sisteme <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-500">Favorite</span>
            </h1>
            <p className="text-gray-400 font-medium italic drop-shadow-md text-left text-sm md:text-base uppercase tracking-widest opacity-60">
              Lista ta de dorințe pentru setup-ul perfect.
            </p>
          </header>

          {wishlist && wishlist.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {wishlist.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            /* EMPTY STATE CU INIMĂ ❤️ */
            <div className="p-16 md:p-24 rounded-[45px] bg-white/[0.02] border border-white/10 backdrop-blur-xl text-center shadow-2xl border-dashed">
              <div className="text-7xl mb-6 opacity-20 animate-pulse">❤️</div>
              <h2 className="text-2xl font-black text-white mb-2 italic uppercase tracking-tighter">
                Momentan nu ai favorite.
              </h2>
              <p className="text-gray-500 text-sm max-w-xs mx-auto italic mb-10 leading-relaxed font-medium">
                Explorează magazinul și apasă pe <span className="text-rose-400 font-bold">inimioară</span> pentru a salva sistemele care îți plac.
              </p>
              <Link 
                to="/shop" 
                className="inline-block px-10 py-5 rounded-2xl bg-white text-black font-black uppercase text-[11px] tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all shadow-2xl hover:-translate-y-1 active:scale-95"
              >
                Mergi la Magazin
              </Link>
            </div>
          )}
        </div>

        {/* CSS PENTRU ANIMAȚIA DE FUNDAL */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob {
            animation: blob 10s infinite alternate ease-in-out;
          }
          .animation-delay-2000 {
            animation-delay: 3s;
          }
        `}} />
      </div>
    </>
  );
}