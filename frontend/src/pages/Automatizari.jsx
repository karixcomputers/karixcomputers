import React from "react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import NetworkBackground from "../components/NetworkBackground";

export default function Automatizari() {
  return (
    <>
      <SEO 
        title="Automatizări Business | Karix Computers"
        description="Optimizăm procesele firmei tale prin soluții de automatizare custom. Reducem munca manuală și eliminăm erorile umane în Oradea."
      />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-[#0a0a0a]">
        
        {/* Fundal Animat */}
        <NetworkBackground />

        <div className="max-w-6xl mx-auto relative z-10">
          {/* HEADER */}
          <div className="text-center mb-24">
            <span className="text-emerald-400 font-black tracking-[0.2em] uppercase italic mb-4 block">Automatizări Smart</span>
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-8 italic uppercase leading-none">
              Eficiență <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Automatizată</span>
            </h1>
            <p className="text-gray-400 text-xl max-w-3xl mx-auto font-medium italic">
              Eliberăm timpul echipei tale prin integrarea inteligentă a fluxurilor de lucru. Înlocuim sarcinile manuale și repetitive cu sisteme digitale rapide și infailibile.
            </p>
          </div>

          {/* DETALII TEHNICE */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
            {[
              { title: "Reducerea Erorilor", desc: "Algoritmi de validare automată care elimină complet erorile umane în procesarea datelor critice." },
              { title: "Economie de Timp", desc: "Transformăm procese care durau zile întregi în execuții instantanee, rulând în fundal 24/7." },
              { title: "Integrare Aplicații", desc: "Conectăm nativ CRM-ul, ERP-ul și uneltele tale de comunicare pentru un flux de lucru unitar (Workflow Automation)." },
              { title: "Scalabilitate", desc: "Arhitecturi capabile să gestioneze creșteri bruște de volum fără a adăuga costuri cu personal suplimentar." },
              { title: "Notificări Smart", desc: "Sisteme care te alertează doar când este necesară intervenția umană, filtrând zgomotul informațional." },
              { title: "Mentenanță Proactivă", desc: "Monitorizăm și optimizăm constant fluxurile pentru a asigura o funcționare fără întreruperi." }
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-[32px] bg-white/[0.03] border border-white/10 backdrop-blur-md hover:bg-white/[0.06] hover:border-emerald-500/50 transition-all group">
                <h3 className="text-xl font-black text-white uppercase italic mb-3 group-hover:text-emerald-400 transition-colors">{item.title}</h3>
                <p className="text-gray-400 font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA SECTION */}
          <div className="p-16 rounded-[40px] bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-500/30 backdrop-blur-lg text-center shadow-2xl">
            <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter mb-6">
              Ce procese vrei să automatizezi?
            </h2>
            <p className="text-gray-300 mb-10 max-w-xl mx-auto text-lg">
              Analizăm minuțios fluxul tău operațional și propunem soluții personalizate care generează valoare imediată și reduc costurile.
            </p>
            <Link 
              to="/contact" 
              className="inline-flex items-center gap-3 px-12 py-6 bg-white text-black font-black uppercase italic tracking-tighter rounded-full hover:bg-emerald-400 hover:text-white transition-all duration-300 text-lg"
            >
              Cere O Consultanță
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}