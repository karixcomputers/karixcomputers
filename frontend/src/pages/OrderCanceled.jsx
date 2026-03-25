import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

export default function OrderCanceled() {
  // 1. Verificăm biletul la încărcarea paginii
  const [isValid] = useState(() => {
    return sessionStorage.getItem("orderJustCanceled") === "true";
  });

  useEffect(() => {
    // 2. Rupem biletul când pleacă de pe pagină
    return () => {
      sessionStorage.removeItem("orderJustCanceled");
    };
  }, []);

  // 3. Dacă a intrat pe ușa din spate (tastând URL-ul), îl trimitem pe prima pagină
  if (!isValid) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-transparent flex items-center justify-center">
      
      {/* Glow-uri de fundal (Rose/Pink pentru anulare) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-rose-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-pink-500/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      <div className="max-w-2xl w-full mx-auto relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="p-12 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-3xl text-center shadow-2xl">
          
          {/* Iconiță Anulare */}
          <div className="h-24 w-24 rounded-[30px] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-8 shadow-inner shadow-rose-500/20">
            <span className="text-5xl drop-shadow-lg">🚫</span>
          </div>
          
          <h1 className="text-5xl font-black text-white tracking-tighter mb-4 italic drop-shadow-2xl">
            Comandă <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-400">Anulată</span>
          </h1>
          
          <p className="text-gray-300 font-medium tracking-tight mb-4 text-lg drop-shadow-md">
            Cererea de anulare a fost procesată cu succes. 
          </p>

          <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6 mb-10 backdrop-blur-md">
            <p className="text-rose-400 font-bold text-sm italic">
              "Banii vor fi returnați în contul tău în maxim 10 zile lucrătoare."
            </p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-3 font-black">
              Procedură Standard de Refund Karix
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* Am adăugat reloadDocument ca să își ia comenzile fresh din baza de date */}
            <Link to="/orders" reloadDocument className="px-8 py-5 rounded-2xl font-black text-white bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-md transition-all uppercase tracking-widest text-[10px] shadow-lg">
              Înapoi la Comenzile mele
            </Link>
            <Link to="/shop" reloadDocument className="px-8 py-5 rounded-2xl font-black text-[#0b1020] bg-white hover:bg-rose-500 hover:text-white transition-all uppercase tracking-widest text-[10px] shadow-2xl shadow-rose-500/20 active:scale-95">
              Continuă Cumpărăturile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}