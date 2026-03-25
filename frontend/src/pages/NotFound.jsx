import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-transparent flex items-center justify-center">
      
      {/* Glow-uri de fundal (Indigo/Blue pentru eroare de sistem) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      <div className="max-w-2xl w-full mx-auto relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="p-12 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-3xl text-center shadow-2xl">
          
          {/* Iconiță 404 Error */}
          <div className="h-24 w-24 rounded-[30px] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-8 shadow-inner shadow-indigo-500/20">
            <span className="text-5xl drop-shadow-lg">🛠️</span>
          </div>
          
          <h1 className="text-7xl font-black text-white tracking-tighter mb-4 italic drop-shadow-2xl">
            Error <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">404</span>
          </h1>
          
          <h2 className="text-2xl font-bold text-gray-200 mb-4 tracking-tight">
            Componenta aceasta lipsește din build-ul nostru!
          </h2>

          <p className="text-gray-400 font-medium mb-10 text-lg drop-shadow-md max-w-md mx-auto">
            Se pare că ai ajuns pe o rută care nu există în baza noastră de date. 
            Verifică URL-ul sau revino la shop.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/" 
              className="px-8 py-5 rounded-2xl font-black text-white bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-md transition-all uppercase tracking-widest text-[10px] shadow-lg"
            >
              Mergi la Home
            </Link>
            <Link 
              to="/shop" 
              className="px-8 py-5 rounded-2xl font-black text-[#0b1020] bg-white hover:bg-indigo-500 hover:text-white transition-all uppercase tracking-widest text-[10px] shadow-2xl shadow-indigo-500/20 active:scale-95"
            >
              Înapoi la Shop
            </Link>
          </div>

          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-10 font-black opacity-50">
            System Status: Page Not Found | Karix Computers
          </p>
        </div>
      </div>
    </div>
  );
}