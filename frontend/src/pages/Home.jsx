import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Home() {
  // 1. Varianta pentru intrare din STÂNGA
  const slideInLeft = {
    hidden: { opacity: 0, x: -100 },
    visible: { 
      opacity: 1, 
      x: 0, 
      transition: { duration: 0.8, ease: "easeOut" } 
    }
  };

  // 2. Varianta pentru intrare din DREAPTA
  const slideInRight = {
    hidden: { opacity: 0, x: 100 },
    visible: { 
      opacity: 1, 
      x: 0, 
      transition: { duration: 0.8, ease: "easeOut" } 
    }
  };

  // 3. Varianta standard de Fade-In
  const fadeInVariant = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.8, ease: "easeOut" } 
    }
  };

  return (
    <div className="min-h-screen text-gray-200 relative overflow-x-hidden">
      
      {/* Hero Section */}
      <motion.section 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className="relative pt-24 pb-16 px-4 flex flex-col items-center justify-center min-h-[70vh] z-10"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-500/10 to-pink-500/10 blur-[120px] rounded-full pointer-events-none z-0" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 leading-tight drop-shadow-lg">
            Performanță dusă la <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Următorul Nivel.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 font-medium leading-relaxed drop-shadow-md">
            Sisteme PC construite cu pasiune, testate riguros și optimizate pentru gaming, streaming sau productivitate la standarde profesionale.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/shop" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold text-[15px] shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:-translate-y-0.5 transition-all duration-300 backdrop-blur-sm text-center">
              Vezi Sistemele
            </Link>
            <Link to="/servicii" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-[15px] hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-sm text-center">
              Descoperă Serviciile
            </Link>
          </div>
        </div>
      </motion.section>

      {/* --- SECTION: TRUST BAR --- */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInVariant}
        className="relative z-10 px-4 mb-24"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
            {[
              { icon: "🛡️", text: "24 luni garanție" },
              { icon: "🔁", text: "retur 14 zile" },
              { icon: "🚚", text: "livrare rapidă" },
              { icon: "💳", text: "plăți securizate" }
            ].map((item, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-md shadow-xl"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-xs md:text-sm font-black uppercase tracking-widest text-gray-300">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* --- SECTION 1: LOGISTICA SERVICE ORADEA (Vine din STÂNGA) --- */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={slideInLeft}
        className="max-w-6xl mx-auto px-4 py-12 relative z-10"
      >
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[40px] blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
          
          <div className="relative p-8 md:p-12 rounded-[40px] bg-white/[0.02] border border-white/10 backdrop-blur-xl flex flex-col md:flex-row items-center gap-12 overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-600/10 blur-[80px] rounded-full"></div>
            
            <div className="flex-1 text-left relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6">
                <span className="animate-pulse w-2 h-2 bg-indigo-400 rounded-full"></span>
                Exclusiv Oradea
              </div>
              
              <h2 className="text-3xl md:text-4xl font-black text-white italic uppercase tracking-tighter mb-4 leading-tight">
                Service de Elită, <br />
                <span className="text-indigo-400">Direct la Ușa Ta.</span>
              </h2>
              
              <p className="text-gray-400 text-base md:text-lg font-medium leading-relaxed mb-8 max-w-xl">
                Suntem primul service din Oradea care elimină stresul transportului. Nu te mai chinui cu găsirea unui service de încredere sau căutarea locației pe Maps: <span className="text-white">venim noi, ridicăm device-ul și ți-l aducem înapoi reparat.</span> În plus, dacă alegi un sistem nou de la noi, <span className="text-white">îți livrăm viitorul tău PC personal direct la tine acasă.</span>
              </p>
              
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-xl border border-white/10">📦</div>
                  <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Ridicare <br/> Gratuita</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-xl border border-white/10">🏠</div>
                  <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Livrare <br/> Personală</span>
                </div>
              </div>
            </div>

            <div className="w-full md:w-1/3 flex justify-center relative z-10">
              <div className="text-[120px] filter drop-shadow-[0_0_30px_rgba(99,102,241,0.3)] animate-float">
                🚚
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* --- SECTION 2: SOLUȚII B2B (Vine din DREAPTA) --- */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={slideInRight}
        className="max-w-6xl mx-auto px-4 py-12 relative z-10"
      >
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-600 rounded-[40px] blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
          
          <div className="relative p-8 md:p-12 rounded-[40px] bg-white/[0.02] border border-white/10 backdrop-blur-xl flex flex-col md:flex-row-reverse items-center gap-12 overflow-hidden shadow-2xl">
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-emerald-600/10 blur-[80px] rounded-full"></div>
            
            <div className="flex-1 text-left relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-6">
                🚀 Karix for Business
              </div>
              
              <h2 className="text-3xl md:text-4xl font-black text-white italic uppercase tracking-tighter mb-4 leading-tight">
                Putere pentru <br />
                <span className="text-emerald-400">Echipa Ta.</span>
              </h2>
              
              <p className="text-gray-400 text-base md:text-lg font-medium leading-relaxed mb-8 max-w-xl">
                Ai o firmă în Oradea și angajații tăi folosesc numeroase PC-uri sau laptopuri? Productivitatea lor depinde de sănătatea sistemelor. <span className="text-white">Nu lăsa praful sau erorile să îți încetinească afacerea.</span> Ne ocupăm noi de mentenanța completă a parcului tău informatic, direct la sediul tău.
              </p>
              
              <Link to="/contact" className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[13px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20 group/btn">
                Contactează-ne pentru ofertă personalizată
                <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
              </Link>
            </div>

            <div className="w-full md:w-1/3 flex justify-center relative z-10">
              <div className="text-[120px] filter drop-shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-float-slow">
                🏢
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Secțiunea de Avantaje Detaliate */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.2
            }
          }
        }}
        className="max-w-6xl mx-auto px-4 py-24 border-t border-white/5 relative z-10"
      >
        <motion.div variants={fadeInVariant} className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-4 uppercase italic">De ce să alegi Karix?</h2>
          <p className="text-gray-400 font-medium">Calitatea nu este o opțiune, este standardul nostru.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {[
            { icon: "⚡", title: "Asamblare Premium", text: "Cable management impecabil și atenție la fiecare detaliu. Sistemul tău va arăta la fel de bine pe cât funcționează.", color: "indigo" },
            { icon: "🛡️", title: "Testare Riguroasă", text: "Fiecare PC trece prin ore de teste de stres pentru componente pentru a garanta stabilitate 100%.", color: "purple" },
            { icon: "🎧", title: "Suport Dedicat", text: "Echipa noastră tehnică îți stă la dispoziție. Dacă ai o problemă sau vrei un sfat pentru upgrade, suntem aici.", color: "pink" }
          ].map((adv, idx) => (
            <motion.div 
              key={idx}
              variants={{
                hidden: { opacity: 0, y: 40, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0.4 } }
              }}
              className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 group backdrop-blur-sm"
            >
              <div className={`h-14 w-14 rounded-2xl bg-${adv.color}-500/10 flex items-center justify-center mb-6 border border-${adv.color}-500/20 group-hover:scale-110 transition-transform duration-300`}>
                <span className="text-2xl">{adv.icon}</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-wide italic uppercase">{adv.title}</h3>
              <p className="text-gray-400 text-[15px] leading-relaxed">{adv.text}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}