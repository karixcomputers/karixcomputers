import React, { useState, useEffect } from "react";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Verificăm dacă există consimțământul salvat permanent
    const consent = localStorage.getItem("karix_cookie_consent");
    if (!consent) {
      // Afișăm banner-ul după 2 secunde
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    // Salvăm acceptul permanent în browser
    localStorage.setItem("karix_cookie_consent", "true");
    setIsVisible(false);
  };

  const handleCloseQuickly = () => {
    // Închidem doar pentru sesiunea curentă (fără să salvăm în localStorage)
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed bottom-6 left-6 right-6 md:right-auto md:left-10 z-[300] transition-all duration-500 ease-in-out ${
        showDetails ? "md:max-w-2xl w-full" : "md:max-w-md"
      } animate-in fade-in slide-in-from-left-10`}
    >
      <div className="relative overflow-hidden rounded-[32px] bg-[#0b1020]/95 backdrop-blur-3xl border border-white/10 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        
        {/* Glow de fundal */}
        <div className="absolute -top-10 -left-10 h-32 w-32 bg-indigo-500/10 blur-3xl rounded-full" />

        {/* Buton X - Închidere rapidă (fără acceptare) */}
        <button 
          onClick={handleCloseQuickly}
          className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors z-20"
          title="Închide temporar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="relative z-10 text-left">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl shadow-inner">
                🍪
              </div>
              <h3 className="text-white font-black uppercase italic tracking-wider text-sm">
                Privacy Settings
              </h3>
            </div>
            {showDetails && (
              <button 
                onClick={() => setShowDetails(false)}
                className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors mr-8"
              >
                ← Înapoi
              </button>
            )}
          </div>

          {!showDetails ? (
            <>
              <p className="text-gray-400 text-xs leading-relaxed mb-8 font-medium max-w-[90%]">
                Karix Computers utilizează tehnologii de stocare pentru a asigura funcționarea coșului, securitatea contului și procesarea plăților prin Netopia.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleAccept}
                  className="flex-1 py-4 rounded-2xl bg-white text-black font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 hover:text-white transition-all duration-300 shadow-xl active:scale-95"
                >
                  Acceptă Tot
                </button>
                <button
                  onClick={() => setShowDetails(true)}
                  className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all"
                >
                  Detalii Politică
                </button>
              </div>
            </>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <div className="max-h-[300px] overflow-y-auto pr-4 custom-scrollbar space-y-6 mb-8">
                <div>
                  <h4 className="text-indigo-400 text-[10px] font-black uppercase mb-2 tracking-widest">1. Cookies Strict Necesare</h4>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    Sunt esențiale pentru logare și securitate. Fără acestea, nu poți rămâne autentificat în contul Karix sau accesa zona de service.
                  </p>
                </div>
                <div>
                  <h4 className="text-indigo-400 text-[10px] font-black uppercase mb-2 tracking-widest">2. Coș de Cumpărături (Funcțional)</h4>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    Utilizăm LocalStorage pentru a reține produsele adăugate în coș. Astfel, poți finaliza comanda chiar dacă închizi browserul și revii mai târziu.
                  </p>
                </div>
                <div>
                  <h4 className="text-indigo-400 text-[10px] font-black uppercase mb-2 tracking-widest">3. Plăți și Prevenție Fraudă</h4>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    Partenerul nostru Netopia Payments utilizează date temporare pentru a securiza tranzacția ta și a preveni utilizarea neautorizată a cardurilor.
                  </p>
                </div>
                <p className="text-[10px] text-gray-500 italic border-t border-white/5 pt-4">
                  Prin apăsarea butonului de accept, confirmi că ești de acord cu stocarea datelor strict necesare funcționării magazinului.
                </p>
              </div>
              <button
                onClick={handleAccept}
                className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 transition-all duration-300 shadow-xl"
              >
                Confirm și Accept
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}