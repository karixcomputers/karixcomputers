import React from "react";
import { Link } from "react-router-dom";

const ReturSection = ({ title, children, number, isWarning }) => (
  <div className={`group mb-8 p-8 rounded-[32px] border transition-all duration-500 relative z-10 text-left ${
    isWarning 
    ? "bg-pink-500/[0.02] border-pink-500/20 hover:border-pink-500/40" 
    : "bg-white/[0.01] border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.03]"
  }`}>
    
    <div className={`absolute top-8 left-0 w-1 h-10 rounded-r-full transition-all duration-500 ${
      isWarning ? "bg-pink-500/20 group-hover:bg-pink-500" : "bg-indigo-500/20 group-hover:bg-indigo-500"
    }`} />
    
    <div className="flex items-start gap-4 mb-4">
      <span className={`text-sm font-black transition-colors mt-1 font-mono ${
        isWarning ? "text-pink-500/40 group-hover:text-pink-400" : "text-indigo-500/40 group-hover:text-indigo-400"
      }`}>
        {number}
      </span>
      <h2 className="text-xl font-bold text-white italic tracking-tight uppercase group-hover:translate-x-1 transition-transform">
        {title}
      </h2>
    </div>
    
    <div className="text-gray-400 leading-relaxed space-y-4 text-sm sm:text-base font-medium pl-9">
      {children}
    </div>
  </div>
);

export default function Retur() {
  return (
    <div className="relative isolate min-h-screen pt-32 pb-24 px-4 sm:px-6 overflow-hidden">
      
      <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-pink-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        
        <header className="mb-20 text-center">
          <h1 className="text-6xl font-black text-white tracking-tighter mb-6 italic">
            Politică de <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Retur</span>
          </h1>
          <div className="h-1.5 w-24 bg-gradient-to-r from-indigo-500 to-pink-500 mx-auto rounded-full opacity-40 mb-6" />
          <p className="text-gray-500 uppercase tracking-[0.4em] text-[10px] font-bold">
            Karix Computers © 2026
          </p>
        </header>

        {/* Notă introductivă actualizată pentru PF */}
        <div className="mb-12 p-8 rounded-[32px] bg-indigo-500/5 border border-indigo-500/10 backdrop-blur-md">
           <p className="text-indigo-300 text-center font-medium italic">
             Conform OUG 34/2014, clienții <strong>persoane fizice</strong> au dreptul de a returna produsele achiziționate online în termen de 
             <span className="text-white font-black mx-1 underline decoration-indigo-500">14 zile calendaristice</span> 
             de la primirea acestora, fără penalități și fără necesitatea unei justificări.
           </p>
        </div>

        <div className="grid gap-2">

          <ReturSection number="01" title="Verifică Eligibilitatea">
            <p>
              Pentru a fi acceptat, produsul trebuie returnat în aceeași stare în care a fost livrat, în ambalajul original, cu toate accesoriile și etichetele intacte.
            </p>
            <p className="p-4 rounded-2xl bg-white/5 border border-white/5 text-xs italic">
              * Produsele hardware care prezintă urme de uzură, lovituri sau modificări hardware (ex: ruperea sigiliilor) nu pot fi acceptate pentru retur integral.
            </p>
          </ReturSection>

          {/* NOU: Secțiune dedicată Persoanelor Juridice (B2B) */}
          <ReturSection number="!!" title="Politica pentru Persoane Juridice" isWarning>
            <p className="text-pink-200/80">
              Dreptul de retur în 14 zile conform OUG 34/2014 se aplică <strong>exclusiv persoanelor fizice</strong>.
            </p>
            <p>
              În cazul <strong>persoanelor juridice (Firme, PFA, ONG)</strong>, contractele sunt considerate comerciale și nu beneficiază de dreptul de denunțare unilaterală a contractului. Orice cerere de retur din partea unei persoane juridice este supusă acceptării prealabile a Karix Computers și poate fi refuzată sau acceptată cu plata unei taxe de restocare (repunere în vânzare).
            </p>
          </ReturSection>

          <ReturSection number="02" title="Anunță Returul">
            <p>Procesul este digitalizat și poate fi inițiat din contul tău:</p>
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 transition-all hover:bg-white/[0.08]">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-xs border border-indigo-500/20">1</div>
                <p className="text-[13px]">Accesează pagina <Link to="/orders" className="text-indigo-400 font-bold italic">Comenzile mele</Link></p>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 transition-all hover:bg-white/[0.08]">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-xs border border-indigo-500/20">2</div>
                <p className="text-[13px]">Apasă butonul <span className="text-white font-bold italic">"Inițiază retur nou"</span></p>
              </div>
            </div>
          </ReturSection>

          <ReturSection number="03" title="Ambalare și Expediere">
            <p>
              Produsul trebuie ambalat corespunzător pentru a preveni deteriorarea. Costurile de transport pentru retur sunt suportate integral de către client (atât PF cât și PJ).
            </p>
            <p className="font-bold text-white italic">
              În cazul în care produsul ajunge deteriorat din cauza ambalării necorespunzătoare, responsabilitatea revine expeditorului.
            </p>
          </ReturSection>

          <ReturSection number="04" title="Rambursarea Banilor">
            <p>
              După recepționarea și verificarea produsului, contravaloarea acestuia va fi rambursată în maximum 14 zile calendaristice.
            </p>
            <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-sm">
              <span className="font-black block mb-1 uppercase text-[10px] tracking-widest">Reguli de plată</span>
              <ul className="list-disc pl-4 space-y-2">
                <li>Pentru card: Rambursarea se face pe același card prin <strong>Netopia Payments</strong>.</li>
                <li>Pentru firme (B2B): Rambursarea se face <strong>doar în contul bancar al societății</strong> care a efectuat achiziția.</li>
              </ul>
            </div>
          </ReturSection>

          <ReturSection number="✕" title="Excepții de la retur" isWarning>
            <p className="mb-4">Nu pot fi returnate conform legii:</p>
            <ul className="space-y-4">
              {[
                "Sistemele PC Custom Build asamblate la cerere, conform specificațiilor alese de client (produse personalizate).",
                "Licențele software care au fost deja activate.",
                "Serviciile care au fost deja prestate (manoperă asamblare, diagnosticare).",
                "Produse desigilate care nu pot fi revândute din motive de igienă sau securitate."
              ].map((text) => (
                <li key={text} className="flex items-start gap-4 p-4 rounded-2xl bg-pink-500/[0.03] border border-pink-500/10 text-gray-400 text-sm">
                   <span className="text-pink-500 font-black">✕</span>
                   <span>{text}</span>
                </li>
              ))}
            </ul>
          </ReturSection>

        </div>

        <div className="mt-20 text-center relative z-20">
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/orders"
              className="inline-flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
            >
              Cere un Retur →
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white font-bold hover:bg-white/[0.08] transition-all"
            >
              Înapoi la site
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}