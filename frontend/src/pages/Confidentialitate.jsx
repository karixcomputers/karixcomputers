import React from "react";
import { Link } from "react-router-dom";
// IMPORTĂM COMPONENTA SEO
import SEO from "../components/SEO";

const PrivacySection = ({ title, children, number, accentColor = "pink" }) => {
  const isPink = accentColor === "pink";

  return (
    <div className="group mb-8 p-8 rounded-[32px] bg-white/[0.01] border border-white/5 hover:border-pink-500/30 hover:bg-white/[0.03] transition-all duration-500 relative z-10 backdrop-blur-sm text-left">
      
      {/* Accentul vertical specific Karix */}
      <div className={`absolute top-8 left-0 w-1 h-10 rounded-r-full transition-all duration-500 ${isPink ? 'bg-pink-500/20 group-hover:bg-pink-500' : 'bg-indigo-500/20 group-hover:bg-indigo-500'}`} />
      
      <div className="flex items-start gap-4 mb-4">
        <span className={`text-sm font-black transition-colors mt-1 font-mono ${isPink ? 'text-pink-500/40 group-hover:text-pink-400' : 'text-indigo-500/40 group-hover:text-indigo-400'}`}>
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
};

export default function Privacy() {
  return (
    <>
      {/* SEO: CONFIGURARE PENTRU PAGINA LEGALĂ */}
      <SEO 
        title="Politică de Confidențialitate & GDPR" 
        description="Află cum Karix Computers protejează datele tale personale. Informații transparente despre colectarea datelor, securitate și drepturile tale conform GDPR."
      />

      <div className="relative isolate min-h-screen pt-32 pb-24 px-4 sm:px-6 overflow-hidden bg-transparent">
        
        {/* Background Glows */}
        <div className="absolute top-1/4 -right-20 w-[500px] h-[500px] bg-pink-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 -left-20 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10">
          
          <header className="mb-20 text-center">
            <h1 className="text-6xl font-black text-white tracking-tighter mb-6 italic">
              Politica de <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-400">Confidențialitate</span>
            </h1>
            <div className="h-1.5 w-24 bg-gradient-to-r from-pink-500 to-indigo-500 mx-auto rounded-full opacity-40 mb-6" />
            <p className="text-gray-500 uppercase tracking-[0.4em] text-[10px] font-bold">
              Protejăm datele tale conform standardelor europene GDPR
            </p>
          </header>

          <div className="grid gap-2">

            <PrivacySection number="01" title="Datele pe care le colectăm" accentColor="pink">
              <p>
                Pentru a procesa comenzile și pentru a furniza serviciile magazinului Karix Computers, colectăm următoarele date personale necesare facturării și livrării:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {[
                  "Nume și prenume (pentru facturare)",
                  "Adresă de email (confirmări și status)",
                  "Număr de telefon (contact curier)",
                  "Adresă completă de livrare",
                  "CUI / CIF (doar pentru persoane juridice)"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs bg-white/[0.03] p-3 rounded-xl border border-white/5">
                    <span className="text-pink-500">✦</span> {item}
                  </li>
                ))}
              </ul>
            </PrivacySection>

            <PrivacySection number="02" title="Colectarea Automată (B2B)" accentColor="indigo">
              <p>
                În cazul în care optezi pentru facturarea pe <strong>persoană juridică</strong>, platforma noastră utilizează un sistem de preluare automată a datelor prin interogarea bazei de date a <strong>ANAF (Ministerul Finanțelor)</strong>.
              </p>
              <p className="text-sm italic">
                Prin introducerea codului unic de înregistrare (CUI/CIF), sistemul nostru extrage automat denumirea societății, numărul de la registrul comerțului și adresa sediului social pentru a asigura conformitatea fiscală a facturilor emise.
              </p>
            </PrivacySection>

            <PrivacySection number="03" title="Cum folosim informațiile tale" accentColor="pink">
              <p>Informațiile colectate sunt utilizate strict pentru scopuri operaționale:</p>
              <div className="space-y-4 mt-2">
                {[
                  { t: "Procesare", d: "Emiterea facturilor fiscale și gestionarea plăților." },
                  { t: "Logistică", d: "Pregătirea coletelor și predarea către firmele de curierat." },
                  { t: "Suport", d: "Comunicarea privind stadiul comenzii sau intervențiile în service." },
                  { t: "Securitate", d: "Prevenirea tentativelor de fraudă și protejarea contului tău." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 border-l border-pink-500/20 pl-4">
                    <span className="text-pink-500 font-black text-xs mt-1">0{i+1}</span>
                    <p className="text-sm leading-snug"><strong className="text-white italic">{item.t}:</strong> {item.d}</p>
                  </div>
                ))}
              </div>
            </PrivacySection>

            <PrivacySection number="04" title="Partajarea Datelor" accentColor="pink">
              <p>Karix Computers <strong>nu vinde</strong> datele tale personale către terți. Datele sunt partajate exclusiv cu partenerii esențiali:</p>
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
                 <p>🚚 <strong>Companii de Curierat:</strong> pentru livrarea fizică a comenzii.</p>
                 <p>💳 <strong>Netopia Payments:</strong> pentru procesarea securizată a tranzacțiilor.</p>
                 <p>🏢 <strong>Autorități Publice:</strong> în scopuri de raportare fiscală obligatorie (ANAF).</p>
              </div>
            </PrivacySection>

            <PrivacySection number="05" title="Securitatea Datelor" accentColor="indigo">
              <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-4">
                 <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                 </div>
                 <p className="text-xs leading-relaxed italic">
                   Toate datele sunt transmise prin conexiuni securizate <strong>HTTPS (SSL)</strong>, iar parolele sunt stocate folosind tehnologii de hashing ireversibile.
                 </p>
              </div>
            </PrivacySection>

            <PrivacySection number="06" title="Drepturile Tale" accentColor="pink">
              <p>Conform GDPR, ai dreptul de acces, rectificare, ștergere a datelor și portabilitate. Pentru exercitarea acestor drepturi, poți deschide un tichet în secțiunea <strong>Suport</strong> din contul tău de utilizator.</p>
            </PrivacySection>

          </div>

          {/* Footer Buton */}
          <div className="mt-20 text-center relative z-20">
            <Link
              to="/"
              className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white font-bold hover:bg-pink-500/20 hover:border-pink-500/50 transition-all group backdrop-blur-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7 7-7" />
              </svg>
              Înapoi la site
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}