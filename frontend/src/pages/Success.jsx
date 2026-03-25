import React, { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom"; // Am adăugat useNavigate
import { useCart } from "../context/CartContext";

export default function Success() {
  const [sp] = useSearchParams();
  const sessionId = sp.get("session_id");
  const { clearCart } = useCart();
  const nav = useNavigate();
  
  // State pentru a nu randa pagina până nu facem verificarea
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // 1. Verificăm dacă clientul are biletul VIP primit de la Checkout
    const justPlaced = sessionStorage.getItem("orderJustPlaced");

    if (!justPlaced) {
      // Dacă nu are biletul (a tastat manual /success), îl dăm afară spre Home
      nav("/");
      return;
    }

    // 2. Dacă are biletul, "îl rupem" ca să nu poată da refresh la nesfârșit
    sessionStorage.removeItem("orderJustPlaced");
    
    // 3. Îi dăm voie să vadă pagina
    setIsValid(true);

    // 4. Îi golim coșul
    if (clearCart) {
      clearCart();
    }
  }, [clearCart, nav]);

  // Cât timp face verificarea sau dacă îl dă afară, nu afișăm nimic pe ecran
  if (!isValid) return null;

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-transparent flex items-center justify-center">
      
      {/* Glow-uri de succes discrete peste animație */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-500/5 blur-[120px] rounded-full animate-pulse" />
      </div>

      <div className="max-w-2xl w-full mx-auto relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="p-12 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-3xl text-center shadow-2xl">
          
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
            <Link to="/orders" className="px-8 py-5 rounded-2xl font-black text-white bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-md transition-all uppercase tracking-widest text-[10px] shadow-lg">
              Comenzile mele
            </Link>
            <Link to="/shop" className="px-8 py-5 rounded-2xl font-black text-[#0b1020] bg-white hover:bg-emerald-400 hover:text-white transition-all uppercase tracking-widest text-[10px] shadow-2xl shadow-emerald-500/20 active:scale-95">
              Înapoi la Magazin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}