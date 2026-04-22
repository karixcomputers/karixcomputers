import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import SEO from "../components/SEO";

export default function Failed() {
  const [sp] = useSearchParams();
  const errorMessage = sp.get("error") || "Plata a fost respinsă sau anulată de către utilizator.";

  return (
    <>
      <SEO 
        title="Tranzacție Eșuată" 
        description="A apărut o problemă la procesarea plății tale. Te rugăm să reîncerci."
      />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-transparent flex items-center justify-center text-center">
        
        {/* Glow-uri de eroare */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-rose-500/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-pink-500/5 blur-[120px] rounded-full animate-pulse" />
        </div>

        <div className="max-w-2xl w-full mx-auto relative z-10 animate-in fade-in zoom-in duration-500">
          <div className="p-12 rounded-[40px] bg-white/5 border border-rose-500/20 backdrop-blur-3xl shadow-2xl">
            
            <div className="h-24 w-24 rounded-[30px] bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-8 shadow-inner shadow-rose-500/20">
              <span className="text-5xl drop-shadow-lg">⚠️</span>
            </div>
            
            <h1 className="text-5xl font-black text-white tracking-tighter mb-4 italic drop-shadow-2xl uppercase">
              Tranzacție <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-400">Eșuată</span>
            </h1>
            
            <p className="text-gray-300 font-medium tracking-tight mb-8 text-lg drop-shadow-md">
              Ne pare rău, dar tranzacția nu a putut fi finalizată.
              <br/>
              <span className="text-sm text-rose-400 mt-2 block">{errorMessage}</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/cart" className="px-8 py-5 rounded-2xl font-black text-white bg-rose-600 hover:bg-rose-500 transition-all uppercase tracking-widest text-[10px] shadow-lg shadow-rose-600/20">
                Înapoi la Coș (Reîncearcă)
              </Link>
              <Link to="/shop" className="px-8 py-5 rounded-2xl font-black text-gray-400 bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 transition-all uppercase tracking-widest text-[10px]">
                Înapoi la Magazin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}