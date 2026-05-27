import React from "react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";

export default function Automatizari() {
  return (
    <>
      <SEO 
        title="Automatizări Business | Karix Computers"
        description="Optimizăm procesele firmei tale prin soluții de automatizare custom. Reducem munca manuală și eliminăm erorile umane în Oradea."
      />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-[#0a0a0a]">
        {/* BACKGROUND DECORATION */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
            <div className="absolute top-0 left-0 w-[50%] h-[50%] bg-emerald-500/10 blur-[150px] rounded-full" />
            <div className="absolute bottom-0 right-0 w-[50%] h-[50%] bg-teal-500/10 blur-[150px] rounded-full" />
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          {/* HEADER */}
          <div className="text-center mb-20">
            <span className="text-emerald-400 font-black tracking-[0.2em] uppercase italic mb-4 block">Automatizări Smart</span>
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-8 italic uppercase leading-none">
              Eficiență <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Automatizată</span>
            </h1>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto font-medium italic">
              Eliberăm timpul echipei tale. Înlocuim sarcinile repetitive cu fluxuri de lucru inteligente și precise.
            </p>
          </div>

          {/* BENEFICII */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
            {[
              { title: "Reducerea Erorilor", desc: "Automatizarea elimină riscul de eroare umană în gestionarea datelor." },
              { title: "Economie de Timp", desc: "Sarcini care durau ore întregi sunt acum executate în câteva secunde." },
              { title: "Integrare Aplicații", desc: "Conectăm software-urile tale actuale pentru un flux de lucru unitar." },
              { title: "Scalabilitate", desc: "Procesele tale vor gestiona volume mai mari fără a necesita resurse umane extra." }
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-[32px] bg-white/[0.03] border border-white/10 backdrop-blur-md hover:bg-white/[0.06] transition-all">
                <h3 className="text-xl font-black text-white uppercase italic mb-3">{item.title}</h3>
                <p className="text-gray-400 font-medium">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA SECTION */}
          <div className="p-12 rounded-[40px] bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-500/30 backdrop-blur-lg text-center">
            <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-6">
              Ce procese vrei să automatizezi?
            </h2>
            <p className="text-gray-400 mb-10 max-w-lg mx-auto">
              Analizăm fluxul tău de lucru și îți propunem soluții de automatizare care să aducă valoare imediată.
            </p>
            <Link 
              to="/contact" 
              className="inline-flex items-center gap-3 px-10 py-5 bg-white text-black font-black uppercase italic tracking-tighter rounded-full hover:bg-emerald-400 hover:text-white transition-all duration-300"
            >
              Cere O Consultanță
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}