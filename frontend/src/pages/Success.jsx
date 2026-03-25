import React, { useEffect, useState } from "react";
import { Link, useSearchParams, Navigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
// IMPORTĂM COMPONENTA SEO
import SEO from "../components/SEO";

export default function Success() {
  const [sp] = useSearchParams();
  const sessionId = sp.get("session_id");
  const { clearCart } = useCart();
  
  // Citim biletul o singură dată
  const [isValid] = useState(() => {
    return sessionStorage.getItem("orderJustPlaced") === "true";
  });

  useEffect(() => {
    if (isValid && clearCart) {
      // Golim coșul cu o mică întârziere (100ms) ca să nu blocăm încărcarea vizuală a paginii
      setTimeout(() => {
        clearCart();
      }, 100);
    }

    // Rupem biletul la plecare
    return () => {
      sessionStorage.removeItem("orderJustPlaced");
    };
  }, [isValid, clearCart]);

  // Metoda NATIVĂ și sigură din React Router pentru a redirecționa intrusii
  if (!isValid) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      {/* SEO: PENTRU PAGINA DE SUCCES */}
      <SEO 
        title="Comandă Înregistrată cu Succes" 
        description="Comanda ta a fost plasată cu succes la Karix Computers. Îți mulțumim pentru încredere! Verifică email-ul pentru confirmare."
      />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-transparent flex items-center justify-center text-center">
        
        {/* Glow-uri de succes discrete */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/5 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-500/5 blur-[120px] rounded-full animate-pulse" />
        </div>

        <div className="max-w-2xl w-full mx-auto relative z-10 animate-in fade-in zoom-in duration-500">
          <div className="p-12 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-3xl shadow-2xl">
            
            <div className="h-24 w-24 rounded-[30px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-8 shadow-inner shadow-emerald-500/20">
              <span className="text-5xl drop-shadow-lg">✅</span>
            </div>
            
            <h1 className="text-5xl font-black text-white tracking-tighter mb-4 italic drop-shadow-2xl">
              Comandă <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Înregistrată</span>
            </h1>
            
            <p className="text-gray-300 font-medium tracking-tight mb-8 text-lg drop-shadow-md">
              Mulțumim! Detaliile comenzii au fost salvate. Vei primi un email de confirmare în scurt timp.
            </p>

            {sessionId && (
              <div className="mb-10 p-4 rounded-2xl bg-white/5 border border-white/10 inline-block backdrop-blur-md">
                <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black mb-1">ID Sesiune Plată</p>
                <p className="text-sm font-mono text-emerald-400/80 font-bold">{sessionId}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/orders" reloadDocument className="px-8 py-5 rounded-2xl font-black text-white bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-md transition-all uppercase tracking-widest text-[10px] shadow-lg">
                Comenzile mele
              </Link>
              <Link to="/shop" reloadDocument className="px-8 py-5 rounded-2xl font-black text-[#0b1020] bg-white hover:bg-emerald-400 hover:text-white transition-all uppercase tracking-widest text-[10px] shadow-2xl shadow-emerald-500/20 active:scale-95">
                Înapoi la Magazin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}