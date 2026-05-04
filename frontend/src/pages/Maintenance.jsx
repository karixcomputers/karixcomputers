import React from "react";
import SEO from "../components/SEO";

export default function Maintenance() {
  return (
    <>
      <SEO title="Mentenanță - Karix Computers" description="Site-ul este în mentenanță. Ne întoarcem în curând!" />
      <div className="min-h-screen bg-[#0b1020] flex flex-col items-center justify-center p-4 relative overflow-hidden text-left font-sans">
        
        {/* Background Ambient Glow */}
        <div className="absolute inset-0 z-0 pointer-events-none">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] bg-indigo-600/20 blur-[120px] rounded-full"></div>
        </div>

        <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center">
          
          {/* SECȚIUNEA SUPERIOARĂ: Mesaj principal */}
          <div className="text-center mb-12">
            <div className="mb-6 flex justify-center">
              <span className="text-5xl sm:text-6xl animate-pulse drop-shadow-2xl">🔧</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white italic uppercase tracking-tighter mb-4">
              Site în <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Lucru</span>
            </h1>
            
            <p className="text-gray-400 text-xs sm:text-sm md:text-base font-medium tracking-widest uppercase leading-relaxed max-w-2xl mx-auto">
              Facem niște upgrade-uri majore pentru a duce performanța la următorul nivel. <br className="hidden md:block"/> Ne întoarcem online în cel mai scurt timp!
            </p>
          </div>

          {/* SECȚIUNEA INFERIOARĂ: Metode de Contact (Stil Karix) */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Email Oficial", val: "contact@karixcomputers.ro", icon: "📧", color: "indigo" },
              { label: "Suport Telefon", val: "0770 619 935", icon: "📞", color: "pink" },
              { label: "Sediu", val: "Oradea, Bihor, România", icon: "📍", color: "emerald" },
              { label: "Program", val: "L-V: 08:00 - 20:00 | S-D: Variabil", icon: "🕒", color: "amber" }
            ].map((item, idx) => (
              <div 
                key={idx} 
                className="p-5 rounded-[24px] bg-white/[0.03] border border-white/10 backdrop-blur-xl flex items-center gap-4 group hover:bg-white/[0.06] transition-all"
              >
                <div className={`h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center text-xl group-hover:scale-110 transition-transform shrink-0`}>
                  {item.icon}
                </div>
                <div className="text-left overflow-hidden">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">{item.label}</p>
                  <p className="text-white font-bold text-sm sm:text-base truncate">{item.val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Social Media Link / Text mic sub casete */}
          <p className="mt-12 text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] italic">
            Ne poți găsi și pe <a href="https://wa.me/40770619935" target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-white transition-colors">WhatsApp</a>, Instagram sau TikTok.
          </p>

        </div>
      </div>
    </>
  );
}