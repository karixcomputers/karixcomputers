import React from "react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";

export default function AnalizaDate() {
  return (
    <>
      <SEO 
        title="Analiză de Date & Raportare | Karix Computers"
        description="Transformă datele în decizii. Oferim dashboard-uri și rapoarte vizuale custom pentru afaceri în Oradea."
      />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-[#0a0a0a]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
            <div className="absolute top-0 left-0 w-[50%] h-[50%] bg-amber-500/10 blur-[150px] rounded-full" />
            <div className="absolute bottom-0 right-0 w-[50%] h-[50%] bg-orange-500/10 blur-[150px] rounded-full" />
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <span className="text-amber-400 font-black tracking-[0.2em] uppercase italic mb-4 block">Data Intelligence</span>
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-8 italic uppercase leading-none">
              Date care <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Vorbesc</span>
            </h1>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto font-medium italic">
              Nu te mai baza pe intuiție. Obține claritate totală asupra performanței afacerii tale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
            {[
              { title: "Dashboard-uri Vizuale", desc: "Grafice intuitive care îți arată exact ce trebuie să știi." },
              { title: "Rapoarte Custom", desc: "Generate automat, exact pe indicatorii care contează pentru tine." },
              { title: "Interpretare Date", desc: "Transformăm numerele brute în recomandări strategice." },
              { title: "Predictibilitate", desc: "Analize bazate pe istoricul tău pentru a anticipa trendurile." }
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-[32px] bg-white/[0.03] border border-white/10 backdrop-blur-md hover:bg-white/[0.06] transition-all">
                <h3 className="text-xl font-black text-white uppercase italic mb-3">{item.title}</h3>
                <p className="text-gray-400 font-medium">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-12 rounded-[40px] bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/30 backdrop-blur-lg text-center">
            <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-6">Vrei să înțelegi mai bine cifrele?</h2>
            <p className="text-gray-400 mb-10 max-w-lg mx-auto">Solicită o consultanță pentru a vedea cum putem vizualiza datele tale.</p>
            <Link to="/contact" className="inline-flex items-center gap-3 px-10 py-5 bg-white text-black font-black uppercase italic tracking-tighter rounded-full hover:bg-amber-400 hover:text-white transition-all duration-300">
              Solicită Raport
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}