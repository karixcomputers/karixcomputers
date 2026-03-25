import React, { useState } from "react";
import { Link } from "react-router-dom";
// IMPORTĂM COMPONENTA SEO
import SEO from "../components/SEO";

export default function Support() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(null);

  const faqs = [
    {
      question: "Cât durează asamblarea și livrarea unui sistem Karix?",
      answer: "Asamblarea profesională, cable management-ul și testele de stres durează de obicei 3-5 zile lucrătoare. Livrarea se face prin curier rapid în 24-48h."
    },
    {
      question: "Garanția este valabilă dacă îmi fac singur upgrade la componente?",
      answer: "Da, sistemele Karix nu au sigilii care să restricționeze upgrade-ul. Garanția rămâne valabilă pentru componentele originale, atâta timp cât nu apar defecte cauzate de o instalare necorespunzătoare."
    },
    {
      question: "Componentele folosite sunt noi sau utilizate?",
      answer: "Karix Computers utilizează EXCLUSIV componente noi, sigilate, achiziționate de la furnizori autorizați. Fiecare piesă beneficiază de garanția producătorului, pe lângă garanția oferită de noi pentru întreg sistemul."
    },
    {
      question: "Oferiți servicii de mentenanță pentru laptopuri și console?",
      answer: "Desigur! Realizăm curățări profesionale și schimb de pastă termică pentru laptopuri de gaming și console (PlayStation 5, Xbox Series X/S). Recomandăm mentenanța anuală pentru a preveni supraîncălzirea și scăderea performanței."
    },
    {
      question: "Reparați controllere cu stick drift? Ce sunt senzorii Hall Effect?",
      answer: "Da, rezolvăm problema de stick drift prin înlocuirea joystick-urilor clasice. Instalăm senzori Hall Effect (magnetici), care elimină definitiv riscul de drift, neavând piese care se uzează prin frecare."
    },
    {
      question: "Pot face upgrade la un PC sau laptop vechi la voi?",
      answer: "Absolut. Analizăm sistemul tău actual și îți propunem cele mai eficiente soluții de upgrade (procesor, placă video, RAM sau SSD) pentru a-i reda viteza de care ai nevoie, fără a cumpăra un sistem complet nou."
    },
    {
      question: "Cât durează o diagnosticare și ce presupune reparația?",
      answer: "Diagnosticarea durează de regulă 24-48h și presupune verificarea hardware și software a fiecărei componente. După identificarea defectului, te contactăm cu un deviz de reparație și estimarea timpului necesar pentru remediere."
    },
    {
      question: "Sistemele vin cu programe inutile (Bloatware)?",
      answer: "Absolut NU. Instalăm o versiune curată de Windows 11 Pro, driverele esențiale și aplicațiile necesare pentru controlul iluminării RGB. Fără reclame, fără trial-uri inutile."
    },
    {
      question: "Ce teste de performanță faceți înainte de livrare?",
      answer: "Fiecare PC trece prin ore de teste de stres pentru a ne asigura că temperaturile și stabilitatea sunt optime."
    },
    {
      question: "Cum mă ajutați să aleg componentele ideale pentru un PC custom?",
      answer: "Dacă nu ești sigur ce să alegi în Configurator, echipa noastră îți oferă consultanță gratuită. Analizăm bugetul tău și jocurile/aplicațiile pe care le folosești pentru a echilibra perfect performanța procesorului cu cea a plăcii video. Ne poți contacta la secțiunea: Contact."
    },
    {
      question: "Cum este protejat PC-ul pe durata transportului?",
      answer: "Folosim folie cu bule la interior pentru a imobiliza placa video și cooler-ul, iar la exterior cutie dublă cu polistiren gros. PC-ul ajunge la tine intact, garantat."
    },
    {
      question: "Acceptați plata în rate?",
      answer: "Da, prin partenerii noștri (TBI Bank, Star BT), poți achiziționa orice sistem Karix în 6 până la 60 de rate egale, direct din checkout."
    },
    {
      question: "Cum pot urmări livrarea?",
      answer: "Expediem exclusiv prin curierat rapid. Imediat ce PC-ul tău părăsește laboratorul nostru, vei primi prin email cu codul de AWB pentru a urmări traseul coletului în timp real până la ușa ta."
    },
    {
      question: "Locuiesc în Oradea. Cum se procedează cu livrarea?",
      answer: "Pentru clienții din Oradea, oferim serviciul de livrare și ridicare personală, direct la domiciliul tău. Sediul nostru nu este deschis publicului, însă ne deplasăm noi pentru a prelua sau livra sistemele în siguranță maximă. La livrare, te putem ajuta inclusiv cu mufarea corectă a setup-ului tău."
    },
    {
      question: "Am nevoie de un sfat tehnic sau detalii despre comanda mea. Cine mă poate ajuta rapid?",
      answer: "Pentru răspunsuri instantanee, poți apela la Karix AI, asistentul nostru virtual disponibil 24/7 (butonul din colțul dreapta-jos). Acesta este instruit să îți ofere detalii despre statusul comenzilor, recomandări de configurări în funcție de buget sau soluții pentru diverse probleme tehnice, asigurându-mă suportul necesar în timp real."
    }
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* SEO DINAMIC: Titlul se schimbă dacă userul caută ceva specific */}
      <SEO 
        title={searchTerm ? `Suport: ${searchTerm}` : "Centru Suport & FAQ"}
        description="Ai întrebări despre sistemele Karix, garanție sau service? Găsește răspunsuri rapide despre asamblare, livrare, mentenanță console și reparații stick drift în centrul nostru de suport."
      />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-transparent">
        
        {/* BACKGROUND ANIMATION */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full animate-blob" />
          <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-pink-500/10 blur-[120px] rounded-full animate-blob animation-delay-2000" />
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          
          {/* HERO SECTION */}
          <div className="text-center mb-20">
              <h1 className="text-6xl md:text-7xl font-black text-white tracking-tighter mb-6 italic uppercase">
                  Karix <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-500">Support</span>
              </h1>
              <p className="text-gray-400 text-lg mb-10 font-medium italic text-center">Expertiză tehnică și suport dedicat pentru setup-ul tău.</p>
              
              <div className="relative max-w-2xl mx-auto group">
                  <input 
                  type="text"
                  placeholder="Caută o problemă (ex: garanție, BIOS, benchmark)..."
                  className="w-full bg-white/[0.02] border border-white/10 rounded-[24px] py-6 px-8 pl-16 text-white focus:border-indigo-500/50 outline-none transition-all backdrop-blur-xl shadow-2xl"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                  </div>
              </div>
          </div>

          {/* SECȚIUNE CHECKLIST */}
          <div className="mb-20 text-left">
              <h2 className="text-xl font-black text-white uppercase italic tracking-widest mb-8 ml-2 flex items-center gap-3">
                  <span className="h-2 w-2 bg-pink-500 rounded-full animate-ping"></span>
                  Checklist
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 rounded-[28px] bg-indigo-500/5 border border-indigo-500/10 backdrop-blur-md hover:bg-indigo-500/10 transition-all">
                      <p className="text-indigo-400 font-black text-[9px] uppercase tracking-widest mb-2 italic">Video Signal</p>
                      <p className="text-gray-300 text-xs leading-relaxed">
                          Conectează monitorul în <span className="text-white font-bold">Placa Video</span> (porturile orizontale), nu în placa de bază!
                      </p>
                  </div>
                  <div className="p-6 rounded-[28px] bg-pink-500/5 border border-pink-500/10 backdrop-blur-md hover:bg-pink-500/10 transition-all">
                      <p className="text-pink-400 font-black text-[9px] uppercase tracking-widest mb-2 italic">Cleaning</p>
                      <p className="text-gray-300 text-xs leading-relaxed">
                          Asigură-te că PC-ul nu este încărcat de praf. Menține fluxul de aer optim pentru FPS-uri constante.
                      </p>
                  </div>
                  <div className="p-6 rounded-[28px] bg-emerald-500/5 border border-emerald-500/20 backdrop-blur-md hover:bg-emerald-500/10 transition-all">
                      <p className="text-emerald-400 font-black text-[9px] uppercase tracking-widest mb-2 italic">Packaging</p>
                      <p className="text-gray-300 text-xs leading-relaxed">
                          Păstrează cutiile originale! Sunt cea mai bună variantă pentru transport în siguranță la mentenanță.
                      </p>
                  </div>
              </div>
          </div>

          {/* FAQ ACCORDION */}
          <div className="space-y-3 text-left">
            <div className="flex items-center justify-between mb-8 px-2">
              <h2 className="text-xl font-black text-white uppercase italic tracking-widest">Întrebări Frecvente</h2>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{filteredFaqs.length} Răspunsuri</span>
            </div>
            
            {filteredFaqs.map((faq, index) => (
              <div 
                key={index} 
                className="rounded-[24px] border border-white/5 bg-white/[0.02] backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-white/10"
              >
                <button 
                  onClick={() => setActiveIndex(activeIndex === index ? null : index)}
                  className="w-full p-6 text-left flex items-center justify-between group"
                >
                  <span className="font-bold text-gray-300 group-hover:text-white transition-colors">{faq.question}</span>
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center bg-white/5 text-indigo-400 transition-all duration-300 ${activeIndex === index ? 'rotate-180 bg-indigo-500 text-white' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </button>
                <div className={`overflow-hidden transition-all duration-500 ${activeIndex === index ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="p-6 pt-0 text-gray-400 leading-relaxed text-[15px] border-t border-white/5 mt-2">
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
            {filteredFaqs.length === 0 && (
              <div className="text-center py-20 bg-white/[0.01] rounded-[40px] border border-dashed border-white/10">
                  <p className="text-gray-600 italic">Nu am găsit rezultate pentru "{searchTerm}"...</p>
              </div>
            )}
          </div>

          {/* CONTACT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-20 text-left">
              <div className="p-10 rounded-[40px] bg-white/[0.02] border border-white/5 group hover:border-indigo-500/20 transition-all">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform italic">⚡</div>
                  <h3 className="text-2xl font-black text-white italic uppercase mb-2 leading-none">Asistență Remote</h3>
                  <p className="text-gray-500 text-sm mb-6 leading-relaxed">Configurare drivere sau optimizare software? Tehnicienii noștri se pot conecta via AnyDesk pentru suport rapid.</p>
                  <Link to="/contact" className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-white transition-colors">Solicită Acces →</Link>
              </div>

              <div className="p-10 rounded-[40px] bg-gradient-to-br from-indigo-500 to-pink-500 relative overflow-hidden group shadow-2xl hover:scale-[1.01] transition-all">
                  <div className="relative z-10">
                      <h3 className="text-2xl font-black text-white italic uppercase mb-2 leading-none">Deschide un Ticket</h3>
                      <p className="text-white/80 text-sm mb-6 leading-relaxed">Problemă tehnică complexă? Deschide un tichet oficial și primești răspuns de la un inginer Karix în maxim 6 ore.</p>
                      <Link to="/tickets" className="inline-block px-8 py-4 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-2xl hover:shadow-2xl transition-all">
                          Contact Tehnician
                      </Link>
                  </div>
                  <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                      <svg width="240" height="240" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                  </div>
              </div>
          </div>

        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob {
            animation: blob 10s infinite alternate cubic-bezier(0.45, 0, 0.55, 1);
          }
          .animation-delay-2000 {
            animation-delay: 3s;
          }
        `}} />
      </div>
    </>
  );
}