import React from "react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import NetworkBackground from "../components/NetworkBackground";

export default function Aplicatii() {
  return (
    <>
      <SEO 
        title="Aplicații Personalizate | Karix Computers"
        description="Dezvoltăm aplicații software custom, baze de date și unelte de business adaptate exact nevoilor tale operaționale."
      />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-[#0a0a0a]">
        
        {/* Fundal Animat */}
        <NetworkBackground />

        <div className="max-w-6xl mx-auto relative z-10">
          {/* HEADER */}
          <div className="text-center mb-24">
            <span className="text-pink-400 font-black tracking-[0.2em] uppercase italic mb-4 block">Custom Apps</span>
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-8 italic uppercase leading-none">
              Software <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400">Croit pe Măsură</span>
            </h1>
            <p className="text-gray-400 text-xl max-w-3xl mx-auto font-medium italic">
              Transformăm procesele complexe în soluții digitale intuitive. Dezvoltăm arhitecturi software robuste care cresc odată cu afacerea ta.
            </p>
          </div>

          {/* DETALII TEHNICE */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
            {[
              { title: "Baze de Date Custom", desc: "Modelare de date complexă (SQL/NoSQL) optimizată pentru viteza de interogare și integritate." },
              { title: "Automatizare (RPA)", desc: "Creăm scripturi și boți care preiau sarcinile repetitive, economisind zeci de ore lunar." },
              { title: "Unelte de Business", desc: "Dashboards și aplicații interne de gestionare, securizate prin autentificare multi-nivel." },
              { title: "Integrare Sisteme", desc: "Conectăm aplicațiile tale cu API-uri externe, CRM-uri și servicii cloud pentru un flux unificat." },
              { title: "Arhitectură Scalabilă", desc: "Design orientat spre viitor, capabil să susțină volume mari de date și utilizatori simultani." },
              { title: "Mentenanță și Audit", desc: "Monitorizare proactivă a performanței și optimizarea codului pentru stabilitate maximă." }
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-[32px] bg-white/[0.03] border border-white/10 backdrop-blur-md hover:bg-white/[0.06] hover:border-pink-500/50 transition-all group">
                <h3 className="text-xl font-black text-white uppercase italic mb-3 group-hover:text-pink-400 transition-colors">{item.title}</h3>
                <p className="text-gray-400 font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA SECTION */}
          <div className="p-16 rounded-[40px] bg-gradient-to-br from-pink-900/40 to-rose-900/40 border border-pink-500/30 backdrop-blur-lg text-center shadow-2xl">
            <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter mb-6">
              Ai un concept unic?
            </h2>
            <p className="text-gray-300 mb-10 max-w-xl mx-auto text-lg">
              Nu te mai limita la uneltele standard. Hai să construim împreună arhitectura software care se potrivește perfect fluxului tău de lucru.
            </p>
            <Link 
              to="/contact" 
              className="inline-flex items-center gap-3 px-12 py-6 bg-white text-black font-black uppercase italic tracking-tighter rounded-full hover:bg-pink-400 hover:text-white transition-all duration-300 text-lg"
            >
              Hai să Construim
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}