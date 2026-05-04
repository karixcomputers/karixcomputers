import React from "react";
import SEO from "../components/SEO";

export default function Maintenance() {
  return (
    <>
      <SEO title="Mentenanță - Karix Computers" description="Site-ul este în mentenanță." />
      <div className="min-h-screen bg-[#0b1020] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        
        {/* Background Effects */}
        <div className="absolute inset-0 z-0 pointer-events-none">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 blur-[120px] rounded-full"></div>
        </div>

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          {/* Poți pune logo-ul tău aici */}
          <div className="mb-8 flex justify-center">
            <span className="text-6xl animate-pulse drop-shadow-2xl">🔧</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white italic uppercase tracking-tighter mb-4">
            Site în <span className="text-indigo-400">Lucru</span>
          </h1>
          
          <p className="text-gray-400 text-sm md:text-base font-medium tracking-widest uppercase mb-8 leading-relaxed">
            Facem niște upgrade-uri majore pentru a duce performanța la următorul nivel. <br className="hidden md:block"/> Revenim online în cel mai scurt timp!
          </p>

          <div className="inline-block px-8 py-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <p className="text-xs text-white font-bold tracking-widest uppercase">
              Pentru urgențe: <a href="mailto:contact@karixcomputers.ro" className="text-pink-400 hover:text-pink-300">contact@karixcomputers.ro</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}