import React from "react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import NetworkBackground from "../components/NetworkBackground"; // Asigură-te că ruta importului este corectă

export default function WebDev() {
  return (
    <>
      <SEO 
        title="Dezvoltare Web Custom & Backend | Karix Computers"
        description="Dezvoltăm soluții web complexe: Frontend modern, Backend scalabil (Node.js), Baze de date și infrastructură virtuală în Oradea."
      />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-[#0a0a0a]">
        
        {/* NetworkBackground integrat aici */}
        <NetworkBackground />

        <div className="max-w-6xl mx-auto relative z-10">
          {/* HEADER */}
          <div className="text-center mb-24">
            <span className="text-indigo-400 font-black tracking-[0.2em] uppercase italic mb-4 block">Full-Stack Development</span>
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-8 italic uppercase leading-none">
              Soluții Web <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Performante</span>
            </h1>
            <p className="text-gray-400 text-xl max-w-3xl mx-auto font-medium italic">
              De la arhitectură de baze de date la infrastructură virtuală (VPS). Construim tot stack-ul tehnologic necesar afacerii tale.
            </p>
          </div>

          {/* DETALII TEHNICE - GRILĂ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
            {[
              { title: "Frontend Modern", desc: "Interfețe ultra-rapide și responsive folosind React.js, Tailwind CSS și tehnologii de ultimă oră." },
              { title: "Backend Scalabil", desc: "API-uri robuste dezvoltate cu Node.js și Express, optimizate pentru sarcini complexe." },
              { title: "Baze de Date", desc: "Arhitecturi SQL și NoSQL (PostgreSQL, MongoDB) sigure, rapide și ușor de interogat." },
              { title: "Virtual Servers (VPS)", desc: "Configurăm și administrăm servere virtuale pentru găzduire stabilă și securizată." },
              { title: "Integrare API", desc: "Conectăm aplicația ta cu servicii terțe (Plăți, CRM, Facturare) prin fluxuri automatizate." },
              { title: "Mentenanță 24/7", desc: "Monitorizare proactivă a serverelor și actualizări constante pentru securitate maximă." }
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-[32px] bg-white/[0.03] border border-white/10 backdrop-blur-md hover:bg-white/[0.06] hover:border-indigo-500/50 transition-all group">
                <h3 className="text-xl font-black text-white uppercase italic mb-3 group-hover:text-indigo-400 transition-colors">{item.title}</h3>
                <p className="text-gray-400 font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA SECTION */}
          <div className="p-16 rounded-[40px] bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 backdrop-blur-lg text-center shadow-2xl">
            <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter mb-6">
              Ai nevoie de un sistem complex?
            </h2>
            <p className="text-gray-300 mb-10 max-w-xl mx-auto text-lg">
              Nu ne limităm la site-uri simple. Gestionăm proiecte software complexe, de la ideea inițială până la deployment pe servere dedicate.
            </p>
            <Link 
              to="/contact" 
              className="inline-flex items-center gap-3 px-12 py-6 bg-white text-black font-black uppercase italic tracking-tighter rounded-full hover:bg-indigo-400 hover:text-white transition-all duration-300 text-lg"
            >
              Consultă Echipa Tehnică
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}