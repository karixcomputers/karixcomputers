import React from "react";
import { Link } from "react-router-dom";

const WarrantySection = ({ title, children, number }) => (
  <div className="group mb-8 p-8 rounded-[32px] bg-white/[0.01] border border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.03] transition-all duration-500 relative z-10">
    
    {/* Accentul vertical care se aprinde la hover */}
    <div className="absolute top-8 left-0 w-1 h-10 bg-indigo-500/20 group-hover:bg-indigo-500 rounded-r-full transition-all duration-500" />
    
    <div className="flex items-start gap-4 mb-4">
      <span className="text-sm font-black text-indigo-500/40 group-hover:text-indigo-400 transition-colors mt-1 font-mono">
        {number}
      </span>
      <h2 className="text-xl font-bold text-white italic tracking-tight uppercase group-hover:translate-x-1 transition-transform">
        {title}
      </h2>
    </div>
    
    <div className="text-gray-400 leading-relaxed space-y-4 text-sm sm:text-base font-medium pl-9">
      {children}
    </div>
  </div>
);

export default function Warranty() {
  return (
    <div className="relative isolate min-h-screen pt-32 pb-24 px-4 sm:px-6 overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-pink-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        
        <header className="mb-20 text-center">
          <h1 className="text-6xl font-black text-white tracking-tighter mb-6 italic">
            Politica de <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Garanție</span>
          </h1>
          <div className="h-1.5 w-24 bg-gradient-to-r from-indigo-500 to-pink-500 mx-auto rounded-full opacity-40 mb-6" />
          <p className="text-gray-500 uppercase tracking-[0.4em] text-[10px] font-bold">
            Karix Computers © 2026
          </p>
        </header>

        <div className="grid gap-2">

          <WarrantySection number="01" title="Perioada de Garanție">
            <p>
              Conform legislației din România, garanția este diferențiată în funcție de tipul cumpărătorului:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                <span className="block text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-2">Persoane Fizice</span>
                <p className="text-white font-bold text-lg">24 Luni</p>
                <p className="text-xs text-gray-500 mt-1 italic">Garanție legală de conformitate</p>
              </div>
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                <span className="block text-gray-400 font-black text-[10px] uppercase tracking-widest mb-2">Persoane Juridice (B2B)</span>
                <p className="text-white font-bold text-lg">12 Luni</p>
                <p className="text-xs text-gray-500 mt-1 italic">Garanție comercială pentru profesioniști</p>
              </div>
            </div>

            <p className="text-xs italic opacity-70 mt-4">
              * Excepție fac produsele unde este specificată o altă perioadă (ex: promoții, componente cu garanție extinsă de producător de 36-60 luni).
            </p>
          </WarrantySection>

          <WarrantySection number="02" title="Ce Acoperă Garanția">
  <p>
    Garanția acoperă defectele de fabricație și defecțiunile hardware apărute în condiții normale de utilizare pentru următoarele segmente:
  </p>
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
    {[
      "Procesor (CPU)", 
      "Placă video (GPU)", 
      "Memorie RAM", 
      "Placă de bază", 
      "SSD / HDD", 
      "Sursă (PSU)",
      "Cooler Procesor",
      "Carcasă"
    ].map((item) => (
      <div key={item} className="flex items-center gap-3 text-sm">
        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
        {item}
      </div>
    ))}
  </div>
  <p className="pt-4 font-bold text-white italic">
    Karix Computers asigură gratuit diagnosticarea, repararea sau înlocuirea componentelor defecte.
  </p>
</WarrantySection>

          <WarrantySection number="03" title="Excluderi din Garanție">
            <p>Garanția se anulează sau nu se aplică în următoarele situații:</p>
            <ul className="space-y-3">
              {[
                "Probleme cauzate de software piratat, viruși sau setări incorecte de BIOS/Overclocking",
                "Modificări hardware, upgrade-uri sau intervenții realizate de personal neautorizat Karix",
                "Contactul cu lichide, depuneri masive de praf sau utilizarea în medii umede/corozive",
                "Defecțiuni cauzate de rețeaua electrică (șocuri, prize fără împământare, fulgere)",
                "Deteriorări fizice vizibile (componente ciobite, pini îndoiți, mufe forțate)",
                "Ruperea sau modificarea sigiliilor de garanție aplicate pe carcasă sau componente"
              ].map((text) => (
                <li key={text} className="flex items-start gap-3 text-sm">
                   <div className="h-1.5 w-1.5 rounded-full bg-pink-500 mt-2 shrink-0" />
                   <span>{text}</span>
                </li>
              ))}
            </ul>
          </WarrantySection>

<WarrantySection number="04" title="Procedura de Service">
            <p>
              Pentru a beneficia de garanție, trebuie să deschideți un tichet de suport din Panoul de Control.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
               <div className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-center leading-relaxed">
                  <span className="block font-black text-white mb-2 uppercase tracking-tighter text-[10px]">Expediere</span>
                  Utilizăm curieratul rapid pentru colectare națională. Pentru <strong>persoanele fizice</strong>, costul transportului în garanție (tur-retur) este suportat integral de Karix Computers. Pentru <strong>firme (PJ)</strong>, costul este suportat de client, dacă nu s-a stabilit altfel prin contract.
               </div>
               <div className="flex-1 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-center leading-relaxed">
                  <span className="block font-black text-indigo-400 mb-2 uppercase tracking-tighter text-[10px]">Service Oradea</span>
                  Clienții din Oradea beneficiază de ridicare și livrare personală <strong>gratuită</strong>, serviciu exclusiv oferit de Karix Computers.
               </div>
            </div>
          </WarrantySection>

        </div>

        <div className="mt-20 p-10 rounded-[40px] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 text-center relative z-20 backdrop-blur-md">
          <h3 className="text-white font-bold mb-6 italic">Ai întâmpinat o problemă cu un sistem?</h3>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/tickets"
              className="inline-flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
            >
              Trimite în Garanție →
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white font-bold hover:bg-white/[0.08] transition-all"
            >
              Înapoi la site
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}