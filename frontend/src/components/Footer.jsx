import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-14 border-t border-white/5 bg-[#0b1020]/80 backdrop-blur-md">
      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col items-center">
        
        {/* Logo Karix */}
        <Link 
          to="/" 
          className="flex items-center gap-2 shrink-0 group transition-transform duration-300 ease-out hover:scale-105 mb-8"
        >
          <img 
            src="/logo.png" 
            alt="Karix Computers Logo" 
            className="h-12 w-auto object-contain"
          />
          <div className="leading-none text-left">
            <div className="font-black tracking-tighter text-white text-lg uppercase">Karix</div>
            <div className="text-[11px] font-medium text-gray-400 tracking-[0.2em] mt-1 uppercase">Computers</div>
          </div>
        </Link>

        {/* Navigare Principală & Legală */}
        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-10 text-[14px] font-medium text-center">
          <Link className="text-gray-500 hover:text-gray-300 transition-colors" to="/terms">Termeni și condiții</Link>
          <Link className="text-gray-500 hover:text-gray-300 transition-colors" to="/warranty">Politică de garanție</Link>
          <Link className="text-gray-500 hover:text-gray-300 transition-colors" to="/retur">Politică de retur</Link>
          <Link className="text-gray-500 hover:text-gray-300 transition-colors" to="/confidentialitate">Politica de confidențialitate (GDPR)</Link>
        </nav>

        {/* Secțiune Plăți & Autorități (ANPC/SOL MODIFICAT) */}
        <div className="flex flex-col items-center gap-8 mb-10 w-full">
          {/* Plăți */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-600">Plăți securizate prin Netopia</p>
            <div className="flex items-center gap-6">
               <img 
                 src="https://www.logo.wine/a/logo/Visa_Inc./Visa_Inc.-Logo.wine.svg" 
                 alt="Visa" 
                 className="h-10 md:h-12 -my-2 opacity-70 hover:opacity-100 transition-opacity object-contain" 
               />
               <img 
                 src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png" 
                 alt="Mastercard" 
                 className="h-6 md:h-7 opacity-70 hover:opacity-100 transition-opacity" 
               />
                <img 
                 src="https://karixcomputers.ro/netopia.png" 
                 alt="Netopia" 
                 className="h-6 md:h-7 opacity-70 hover:opacity-100 transition-opacity" 
               />
            </div>
          </div>

          {/* Autorități cu poze PNG */}
          <div className="flex flex-wrap justify-center gap-6 items-center"> {/* Am mărit puțin gap-ul la 6 pentru un aspect mai aerisit */}
  <a
    href="https://anpc.ro/"
    target="_blank"
    rel="noreferrer"
    className="block transition-all group"
  >
    <img
      src="https://grecupartners.ro/wp-content/uploads/2023/04/anpc-sal.png"
      alt="ANPC"
      className="h-8 md:h-14 w-auto object-contain transition-opacity" 
    />
  </a>
  <a
    href="https://ec.europa.eu/consumers/odr"
    target="_blank"
    rel="noreferrer"
    className="block transition-all group"
  >
    <img
      src="https://www.davaldi.ro/wp-content/uploads/2025/06/solutionarea_online_a_litigiilor.png"
      alt="SOL"
      className="h-14 md:h-16 w-auto object-contain transition-opacity"
    />
  </a>
</div>
        </div>

        {/* Date Fiscale Firma */}
        <div className="text-center mb-10 px-4">
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
              Cristea Raul Gabriel PFA <span className="mx-2 text-white/10">|</span> 
              CUI: 54200660 <span className="mx-2 text-white/10">|</span> 
              F2026012678004
            </p>
            <p className="text-[10px] text-gray-600 mt-1 italic">
              Sediu Social: Str. Sovata, Nr. 52, Bl. C6, Ap. 51, Oradea, Bihor
            </p>
        </div>

        {/* Social Media Section */}
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          <a
            href="https://www.instagram.com/karixcomputers/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-[13px] text-gray-400 hover:text-white hover:bg-gradient-to-tr hover:from-[#f9ce34] hover:via-[#ee2a7b] hover:to-[#6228d7] transition-all"
          >
            Instagram
          </a>

          <a
            href="https://www.tiktok.com/@karixcomputers"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-[13px] text-gray-400 hover:text-white hover:bg-black transition-all"
          >
            TikTok
          </a>

          <a
            href="https://wa.me/40770619935"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-[13px] text-gray-400 hover:text-white hover:bg-[#25D366] transition-all"
          >
            WhatsApp
          </a>

          <a
            href="https://discord.gg/FV7DgzyTJk"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-[13px] text-gray-400 hover:text-white hover:bg-[#5865F2] transition-all"
          >
            Discord Community
          </a>
        </div>

        {/* Copyright */}
        <div className="w-full border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-[12px] text-gray-500">
          <p>© {new Date().getFullYear()} KARIX Computers. Toate drepturile rezervate.</p>
          <div className="flex items-center gap-1.5 font-medium italic text-[11px]">
            Creat pentru performanță 
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></span>
          </div>
        </div>

      </div>
    </footer>
  );
}