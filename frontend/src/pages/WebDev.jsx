import React from "react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";

export default function WebDev() {
  return (
    <>
      <SEO 
        title="Dezvoltare Web Custom | Karix Computers"
        description="Construim site-uri web de prezentare și platforme e-commerce performante în Oradea. Design modern, viteză maximă și conversie garantată."
      />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-[#0a0a0a]">
        {/* BACKGROUND DECORATION */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
            <div className="absolute top-0 left-0 w-[50%] h-[50%] bg-indigo-500/10 blur-[150px] rounded-full" />
            <div className="absolute bottom-0 right-0 w-[50%] h-[50%] bg-purple-500/10 blur-[150px] rounded-full" />
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          {/* HEADER */}
          <div className="text-center mb-20">
            <span className="text-indigo-400 font-black tracking-[0.2em] uppercase italic mb-4 block">Web Development</span>
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-8 italic uppercase leading-none">
              Soluții Web <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Performante</span>
            </h1>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto font-medium italic">
              Nu doar codăm, construim experiențe digitale care transformă vizitatorii în clienți fideli.
            </p>
          </div>

          {/* BENEFICII */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
            {[
              { title: "Design Personalizat", desc: "Fără template-uri rigide. Design unic adaptat 100% identității brandului tău." },
              { title: "Viteză și SEO", desc: "Optimizare avansată pentru Google și încărcare aproape instantanee a paginilor." },
              { title: "Mobile First", desc: "Experiență impecabilă pe orice dispozitiv, de la telefoane mobile la ecrane desktop." },
              { title: "Scalabilitate", desc: "Platforme robuste, construite să crească organic odată cu afacerea ta." }
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-[32px] bg-white/[0.03] border border-white/10 backdrop-blur-md hover:bg-white/[0.06] transition-all">
                <h3 className="text-xl font-black text-white uppercase italic mb-3">{item.title}</h3>
                <p className="text-gray-400 font-medium">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA SECTION */}
          <div className="p-12 rounded-[40px] bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/30 backdrop-blur-lg text-center">
            <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-6">
              Gata să începem proiectul tău?
            </h2>
            <p className="text-gray-400 mb-10 max-w-lg mx-auto">
              Povestește-ne despre ideea ta. Suntem aici să o transformăm în realitate digitală chiar acum.
            </p>
            <Link 
              to="/contact" 
              className="inline-flex items-center gap-3 px-10 py-5 bg-white text-black font-black uppercase italic tracking-tighter rounded-full hover:bg-indigo-400 hover:text-white transition-all duration-300"
            >
              Cere O Ofertă Gratuită
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}