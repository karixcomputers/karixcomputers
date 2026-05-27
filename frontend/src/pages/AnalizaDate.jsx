import React from "react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import NetworkBackground from "../components/NetworkBackground";

export default function AnalizaDate() {
  return (
    <>
      <SEO 
        title="Analiză de Date & Raportare | Karix Computers"
        description="Transformă datele în decizii. Oferim dashboard-uri și rapoarte vizuale custom pentru afaceri în Oradea."
      />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-[#0a0a0a]">
        
        {/* Fundal Animat */}
        <NetworkBackground />

        <div className="max-w-6xl mx-auto relative z-10">
          {/* HEADER */}
          <div className="text-center mb-24">
            <span className="text-amber-400 font-black tracking-[0.2em] uppercase italic mb-4 block">Data Intelligence</span>
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-8 italic uppercase leading-none">
              Date care <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Vorbesc</span>
            </h1>
            <p className="text-gray-400 text-xl max-w-3xl mx-auto font-medium italic">
              Nu te mai baza pe intuiție. Transformăm volume mari de date brute în insight-uri clare, dashboard-uri interactive și strategii bazate pe dovezi matematice.
            </p>
          </div>

          {/* DETALII TEHNICE */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
            {[
              { title: "Dashboard-uri BI", desc: "Interfețe interactive în timp real (PowerBI/Tableau/Custom) pentru monitorizarea KPI-urilor esențiale." },
              { title: "Rapoarte Automate", desc: "Elimină munca manuală prin generarea automată a rapoartelor zilnice/lunare trimise direct în inbox." },
              { title: "Interpretare Avansată", desc: "Analizăm corelațiile dintre datele tale pentru a identifica oportunități de creștere neexploatate." },
              { title: "Analiză Predictivă", desc: "Modele statistice care anticipează trendurile pieței și cererea clienților pe baza istoricului." },
              { title: "Data Cleaning", desc: "Curățăm și structurăm datele dezorganizate pentru a asigura acuratețea deciziilor luate pe baza lor." },
              { title: "Audit de Performanță", desc: "Evaluăm eficiența operațională a proceselor curente prin metrici clare și obiective." }
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-[32px] bg-white/[0.03] border border-white/10 backdrop-blur-md hover:bg-white/[0.06] hover:border-amber-500/50 transition-all group">
                <h3 className="text-xl font-black text-white uppercase italic mb-3 group-hover:text-amber-400 transition-colors">{item.title}</h3>
                <p className="text-gray-400 font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA SECTION */}
          <div className="p-16 rounded-[40px] bg-gradient-to-br from-amber-900/40 to-orange-900/40 border border-amber-500/30 backdrop-blur-lg text-center shadow-2xl">
            <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter mb-6">
              Vrei să înțelegi mai bine cifrele?
            </h2>
            <p className="text-gray-300 mb-10 max-w-xl mx-auto text-lg">
              Claritatea vine din date bine organizate. Hai să discutăm despre cum putem transforma cifrele afacerii tale într-un avantaj competitiv real.
            </p>
            <Link 
              to="/contact" 
              className="inline-flex items-center gap-3 px-12 py-6 bg-white text-black font-black uppercase italic tracking-tighter rounded-full hover:bg-amber-400 hover:text-white transition-all duration-300 text-lg"
            >
              Solicită Raport Strategic
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}