import React from "react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";

export default function Aplicatii() {
  return (
    <>
      <SEO 
        title="Aplicații Personalizate | Karix Computers"
        description="Dezvoltăm aplicații software custom, baze de date și unelte de business adaptate exact nevoilor tale operaționale."
      />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-[#0a0a0a]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
            <div className="absolute top-0 left-0 w-[50%] h-[50%] bg-pink-500/10 blur-[150px] rounded-full" />
            <div className="absolute bottom-0 right-0 w-[50%] h-[50%] bg-rose-500/10 blur-[150px] rounded-full" />
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <span className="text-pink-400 font-black tracking-[0.2em] uppercase italic mb-4 block">Custom Apps</span>
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-8 italic uppercase leading-none">
              Software <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400">Croit pe Măsură</span>
            </h1>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto font-medium italic">
              Ai nevoie de o unealtă care nu există pe piață? O creăm noi, special pentru fluxul tău de lucru.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
            {[
              { title: "Baze de Date", desc: "Arhitecturi sigure pentru gestionarea eficientă a informațiilor tale." },
              { title: "Scripturi de Automatizare", desc: "Elimină sarcinile manuale plictisitoare prin cod personalizat." },
              { title: "Unelte de Business", desc: "Aplicații interne care pun toate resursele tale la un click distanță." },
              { title: "Mentenanță", desc: "Suport continuu pentru ca aplicația ta să funcționeze fără cusur." }
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-[32px] bg-white/[0.03] border border-white/10 backdrop-blur-md hover:bg-white/[0.06] transition-all">
                <h3 className="text-xl font-black text-white uppercase italic mb-3">{item.title}</h3>
                <p className="text-gray-400 font-medium">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-12 rounded-[40px] bg-gradient-to-br from-pink-900/20 to-rose-900/20 border border-pink-500/30 backdrop-blur-lg text-center">
            <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-6">Ai un concept unic?</h2>
            <p className="text-gray-400 mb-10 max-w-lg mx-auto">Hai să discutăm despre arhitectura ideală pentru proiectul tău.</p>
            <Link to="/contact" className="inline-flex items-center gap-3 px-10 py-5 bg-white text-black font-black uppercase italic tracking-tighter rounded-full hover:bg-pink-400 hover:text-white transition-all duration-300">
              Hai să Construim
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}