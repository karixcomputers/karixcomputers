import React from "react";
import { Link } from "react-router-dom";
// IMPORTĂM COMPONENTA SEO
import SEO from "../components/SEO";

const SOFTWARE_SERVICES = [
  {
    title: "Dezvoltare Web Custom",
    description: "Site-uri de prezentare, landing page-uri și platforme e-commerce performante, optimizate pentru viteză și conversie.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    gradient: "from-indigo-500/20 to-purple-500/20",
    border: "border-indigo-500/30",
    tag: "WEB DEV"
  },
  {
    title: "Automatizări Business",
    description: "Optimizăm procesele interne ale firmei tale prin scripturi și unelte custom care reduc munca manuală și elimină erorile.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    gradient: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/30",
    tag: "AUTO"
  },
  {
    title: "Aplicații Personalizate",
    description: "Soluții software adaptate nevoilor tale: baze de date simple, scripturi de automatizare sau unelte specifice de business.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    gradient: "from-pink-500/20 to-rose-500/20",
    border: "border-pink-500/30",
    tag: "APPS"
  },
  {
    title: "Analiză de Date & Raportare",
    description: "Transformăm datele tale brute în informații clare. Dashboard-uri și rapoarte vizuale pentru a lua decizii de business bazate pe fapte.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    gradient: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/30",
    tag: "DATA"
  }
];

export default function Software() {
  return (
    <>
      <SEO 
        title="Servicii Software & Dezvoltare Web Oradea"
        description="Karix Computers oferă soluții software complete în Oradea: de la dezvoltare web și aplicații custom, până la automatizări și analiză de date pentru afaceri."
      />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden">
        {/* BACKGROUND DECORATION */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-500/10 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h1 className="text-6xl md:text-7xl font-black text-white tracking-tighter mb-4 italic uppercase">
              Software <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Solutions</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium italic">
              De la linii de cod la experiențe digitale complete. Construim viitorul tău software chiar aici, în Oradea.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {SOFTWARE_SERVICES.map((service, idx) => (
              <div 
                key={idx} 
                className={`p-1 rounded-[32px] bg-gradient-to-br ${service.gradient} border ${service.border} backdrop-blur-xl group hover:scale-[1.01] transition-all duration-500`}
              >
                <div className="bg-[#0a0a0a]/80 rounded-[30px] p-8 h-full flex flex-col justify-between overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                      <span className="text-4xl font-black italic tracking-tighter text-white">{service.tag}</span>
                  </div>

                  <div>
                    <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 group-hover:text-white transition-all duration-500">
                      {service.icon}
                    </div>
                    <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">
                      {service.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed font-medium">
                      {service.description}
                    </p>
                  </div>

                  <div className="mt-8 flex items-center gap-2 text-white/50 group-hover:text-white transition-colors">
                    <span className="text-sm font-bold uppercase tracking-widest">Află mai multe</span>
                    <svg className="w-5 h-5 translate-x-0 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA SECTION */}
          <div className="mt-20 p-10 rounded-[40px] bg-white/[0.02] border border-white/10 backdrop-blur-md text-center">
            <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-6">
              Ai un proiect <span className="text-indigo-400">special</span> în minte?
            </h2>
            <p className="text-gray-400 mb-10 max-w-xl mx-auto">
              Suntem gata să transformăm ideile tale în realitate digitală. Contactează-ne pentru o consultanță gratuită.
            </p>
            <Link 
              to="/contact" 
              className="inline-flex items-center gap-3 px-10 py-5 bg-white text-black font-black uppercase italic tracking-tighter rounded-full hover:bg-indigo-400 hover:text-white transition-all duration-300"
            >
              Cere O Ofertă
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}