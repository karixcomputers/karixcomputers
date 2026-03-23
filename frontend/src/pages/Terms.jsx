import React from "react";
import { Link } from "react-router-dom";

const TermsSection = ({ title, children, number }) => (
  <div className="group mb-8 p-8 rounded-[32px] bg-white/[0.01] border border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.03] transition-all duration-500 relative z-10">
    
    <div className="absolute top-8 left-0 w-1 h-10 bg-indigo-500/20 group-hover:bg-indigo-500 rounded-r-full transition-all duration-500" />
    
    <div className="flex items-start gap-4 mb-4">
      <span className="text-sm font-black text-indigo-500/40 group-hover:text-indigo-400 transition-colors mt-1 font-mono">
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

export default function Terms() {
  return (
    <div className="relative isolate min-h-screen pt-32 pb-24 px-4 sm:px-6 overflow-hidden">
      
      <div className="max-w-4xl mx-auto relative z-10">
        
        <header className="mb-20 text-center">
          <h1 className="text-6xl font-black text-white tracking-tighter mb-6 italic">
            Termeni și <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Condiții</span>
          </h1>
          <div className="h-1.5 w-24 bg-gradient-to-r from-indigo-500 to-pink-500 mx-auto rounded-full opacity-40 mb-6" />
          <p className="text-gray-500 uppercase tracking-[0.4em] text-[10px] font-bold">
            Acord de utilizare Karix Computers © 2026
          </p>
        </header>

        <div className="grid gap-2">

          <TermsSection number="01" title="Date Comerciant">
            <p>
              Magazinul online <strong>Karix Computers</strong> este operat de:
            </p>
            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-sm text-indigo-300">
              <p><strong>Cristea Raul Gabriel PFA</strong></p>
              <p>CUI: 54200660</p>
              <p>Nr. Registrul Comerțului: F2026012678004</p>
              <p>Sediu Social: Jud. Bihor, Oradea, Str. Sovata, Nr. 52 , Bloc C6, Ap. 51</p>
              <p>Email: contact@karixcomputers.ro</p>
            </div>
          </TermsSection>

          <TermsSection number="02" title="Produse și Prețuri">
            <p>
              Echipa Karix Computers depune eforturi constante pentru a menține
              acuratețea informațiilor hardware prezentate pe site.
            </p>

            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"/>
                Prețurile sunt exprimate în <strong>RON</strong> și includ toate taxele.
              </li>

              <li className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"/>
                Sistemele PC sunt configurate și testate individual în limita stocului disponibil.
              </li>
              <li className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"/>
                Karix Computers oferă servicii de mentenanță și reparații. Prețul acestora reprezintă manopera și, unde este cazul, materialele consumabile.
              </li>
            </ul>
          </TermsSection>

          <TermsSection number="03" title="Comenzi și Contract">
            <p>
             O comandă plasată pe site reprezintă o ofertă de achiziție. Contractul de vânzare-cumpărare se consideră încheiat în momentul confirmării electronice a comenzii și a confirmării plății. Karix Computers își rezervă dreptul de a anula comenzi în cazul unor erori tehnice de preț.
            </p>
          </TermsSection>

          <TermsSection number="04" title="Livrare și Plată">
            <p>
              Sistemele PC sunt asamblate și testate individual înainte de livrare.
            </p>

            <ul className="space-y-3">
              <li>Procesare comandă: aproximativ 3-5 zile lucrătoare</li>
              <li>Livrarea se realizează prin curier rapid pe teritoriul României</li>
              <li>Plata se poate efectua online cu cardul bancar</li>
              <li>Plata online se realizează prin intermediul serviciilor <strong>Netopia Payments</strong></li>
              <li>Pentru comenzile plătite cu cardul, restituirea banilor se va efectua prin intermediul aceluiași sistem de plată, direct pe cardul de pe care s-a efectuat tranzacția</li>
            </ul>
          </TermsSection>

{/* --- Secțiunea 05 Actualizată --- */}
<TermsSection number="05" title="Dreptul de Retragere / Retur">
  <p>
    Conform OUG 34/2014, <strong>persoanele fizice (consumatorii)</strong> au dreptul de a returna produsele hardware în termen de 14 zile calendaristice de la primirea acestora, fără a invoca un motiv. <strong>Costul transportului pentru returnarea produselor este suportat integral de către client.</strong>
  </p>
  
  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-sm text-amber-200/70 my-4">
    <p>
      <strong>Notă importantă:</strong> Persoanele juridice (firme, PFA, ONG, asociații) nu beneficiază de dreptul de retragere (retur în 14 zile) conform legislației în vigoare, contractul fiind unul comercial între profesioniști. Orice solicitare de retur pentru persoanele juridice va fi analizată individual și poate fi acceptată sau refuzată de Karix Computers.
    </p>
  </div>
  
  <p>
    Rambursarea sumei se face în maximum 14 zile de la recepția și verificarea integrității produsului returnat. Pentru comenzile achitate online, <strong>restituirea banilor se va efectua exclusiv pe același card</strong> utilizat la momentul tranzacției inițiale.
  </p>
</TermsSection>

{/* --- Secțiunea 06 Actualizată --- */}
<TermsSection number="06" title="Garanție">
  <p>
    Produsele beneficiază de garanție conform specificațiilor menționate în certificatul de garanție digital emis la livrare.
  </p>
  <ul className="space-y-3">
    <li className="flex items-center gap-3">
      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"/>
      <span><strong>Persoane fizice:</strong> 24 luni garanție standard.</span>
    </li>
    <li className="flex items-center gap-3">
      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"/>
      <span><strong>Persoane juridice:</strong> 12 luni garanție standard (cu excepția componentelor cu garanție specificată de producător).</span>
    </li>
    <li className="flex items-center gap-3">
      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"/>
      <span>Garanția acoperă defectele de fabricație, nu și daunele cauzate de utilizarea improprie, șocuri electrice sau intervenții neautorizate.</span>
    </li>
  </ul>
</TermsSection>

          <TermsSection number="07" title="Limitarea Răspunderii">
            <p>
              Karix Computers nu își asumă responsabilitatea pentru daune
              rezultate din utilizarea necorespunzătoare a sistemelor PC sau
              pentru pierderi de date.
            </p>
          </TermsSection>

          <TermsSection number="08" title="Legea Aplicabilă">
            <p>
              Prezentul contract este guvernat de legislația română. Orice
              litigiu apărut între părți va fi soluționat de instanțele
              competente din România.
            </p>
          </TermsSection>

        </div>

        <div className="mt-20 text-center relative z-20">
          <Link
            to="/"
            className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white font-bold hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all group backdrop-blur-md"
          >
            Înapoi la site
          </Link>
        </div>

      </div>
    </div>
  );
}