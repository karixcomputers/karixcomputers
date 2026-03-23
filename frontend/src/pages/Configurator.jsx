import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";

export default function Configurator() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); 
  const [extraInfo, setExtraInfo] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [caseText, setCaseText] = useState(""); // State pentru textul de la carcasă

  // State pentru componentele încărcate dinamic
  const [dbComponents, setDbComponents] = useState({
    cpu: [], gpu: [], ram: [], storage: [], motherboard: [], cooler: [], psu: []
  });

  const [selected, setSelected] = useState({
    cpu: null,
    gpu: null,
    ram: null,
    storage: null,
    motherboard: null,
    cooler: null,
    psu: null,
  });

  const [cpuBrand, setCpuBrand] = useState("Intel");
  const [gpuBrand, setGpuBrand] = useState("Nvidia");

  useEffect(() => {
    const fetchConfigComponents = async () => {
      try {
        const res = await apiFetch("/api/adminconfigurator");
        if (res.ok) {
          const items = await res.json();
          const grouped = { cpu: [], gpu: [], ram: [], storage: [], motherboard: [], cooler: [], psu: [] };
          items.forEach(item => {
            if (grouped[item.category]) grouped[item.category].push(item);
          });
          setDbComponents(grouped);
        }
      } catch (err) {
        console.error("Eroare incarcare componente configurator:", err);
      }
    };
    
    fetchConfigComponents();
  }, []);

  const handleSelect = (category, item) => {
    setSelected((prev) => ({ ...prev, [category]: item }));
  };

  const handleSendOffer = async () => {
    if (!contactEmail.includes("@")) {
      alert("Te rugăm să introduci o adresă de email validă!");
      return;
    }
    setLoading(true);
    const payload = {
      user_email: contactEmail,
      components: {
        cpu: selected.cpu?.name || "Neselectat",
        gpu: selected.gpu?.name || "Neselectat",
        ram: selected.ram?.name || "Neselectat",
        storage: selected.storage?.name || "Neselectat",
        motherboard: selected.motherboard?.name || "Neselectat",
        cooler: selected.cooler?.name || "Neselectat",
        psu: selected.psu?.name || "Neselectat",
        case: caseText || "Neselectat", // Trimitem textul scris de user
      },
      extra_info: extraInfo || "Fără detalii suplimentare",
    };

    try {
      const response = await fetch("http://192.168.0.162:4000/api/configurator/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStatus("success");
        setExtraInfo("");
        setContactEmail("");
        setCaseText("");
        setSelected({ cpu: null, gpu: null, ram: null, storage: null, motherboard: null, cooler: null, psu: null });
      } else {
        setStatus("error");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setStatus("error");
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 6000);
    }
  };

  const renderComponentList = (category, filterBrand = null) => {
    let data = dbComponents[category] || [];
    if (filterBrand) {
      data = data.filter(item => item.brand?.toLowerCase() === filterBrand.toLowerCase());
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.map((item) => (
          <button
            key={item.id}
            onClick={() => handleSelect(category, item)}
            className={`p-5 rounded-2xl border transition-all text-left group relative overflow-hidden backdrop-blur-sm ${
              selected[category]?.id === item.id
                ? "bg-indigo-500/20 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.05]"
            }`}
          >
            <h3 className={`font-bold text-sm mb-1 transition-colors ${selected[category]?.id === item.id ? "text-indigo-400" : "text-white"}`}>
              {item.name}
            </h3>
            <p className="text-[11px] text-gray-500 uppercase tracking-widest">{item.spec}</p>
            {selected[category]?.id === item.id && (
              <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            )}
          </button>
        ))}
        {data.length === 0 && (
          <p className="text-xs text-gray-500 italic col-span-full">Nicio componentă disponibilă în această categorie.</p>
        )}
      </div>
    );
  };

  const BrandSwitcher = ({ current, setBrand, options }) => (
    <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5 w-fit mb-6 backdrop-blur-md">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => setBrand(opt)}
          className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
            current === opt ? "bg-indigo-600 text-white shadow-lg" : "text-gray-500 hover:text-white"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-transparent relative overflow-hidden font-sans">
      
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full animate-blob" />
        <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-pink-500/10 blur-[120px] rounded-full animate-blob animation-delay-2000" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-12">
          <h1 className="text-5xl md:text-6xl font-black text-white italic tracking-tighter uppercase mb-2">
            Custom <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-500">Build</span>
          </h1>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em]">Configurează sistemul tău de performanță</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          <div className="lg:col-span-8 space-y-16 text-left">
            <section>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🧠</span>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">Procesor</h2>
              </div>
              <BrandSwitcher current={cpuBrand} setBrand={setCpuBrand} options={["Intel", "AMD"]} />
              {renderComponentList("cpu", cpuBrand)}
            </section>

            <section>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🎮</span>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">Placă Video</h2>
              </div>
              <BrandSwitcher current={gpuBrand} setBrand={setGpuBrand} options={["Nvidia", "AMD"]} />
              {renderComponentList("gpu", gpuBrand)}
            </section>

            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">⚡</span>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">Memorie RAM</h2>
              </div>
              {renderComponentList("ram")}
            </section>

            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">💾</span>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">Stocare SSD</h2>
              </div>
              {renderComponentList("storage")}
            </section>

            {/* SECȚIUNE NOUĂ: PLACĂ DE BAZĂ */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🧩</span>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">Placă de bază</h2>
              </div>
              {renderComponentList("motherboard")}
            </section>

            {/* SECȚIUNE NOUĂ: COOLER */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">❄️</span>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">Sistem de răcire</h2>
              </div>
              {renderComponentList("cooler")}
            </section>

            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🔌</span>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">Sursă Alimentare</h2>
              </div>
              {renderComponentList("psu")}
            </section>

            {/* SECȚIUNE NOUĂ: CARCASĂ (CU TEXT) */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">📦</span>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight italic">Carcasă</h2>
              </div>
              <div className="p-1 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                <textarea 
                  value={caseText}
                  onChange={(e) => setCaseText(e.target.value)}
                  placeholder="Introdu numele carcasei dorite sau un link către ea..."
                  className="w-full h-24 bg-transparent border-none p-4 text-xs text-white placeholder:text-gray-600 focus:ring-0 resize-none"
                />
              </div>
              <p className="text-[9px] text-gray-500 uppercase mt-2 ml-1">Vom verifica compatibilitatea carcasei cu restul componentelor alese.</p>
            </section>
          </div>

          <aside className="lg:col-span-4 sticky top-28 text-left">
            <div className="p-8 rounded-[32px] bg-white/[0.03] border border-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
              
              <h3 className="text-lg font-black text-white uppercase italic tracking-tighter mb-6 border-b border-white/5 pb-4">
                Configurația Ta
              </h3>
              
              <div className="space-y-4 mb-8">
                {[
                  { label: "Procesor", val: selected.cpu },
                  { label: "Placă Video", val: selected.gpu },
                  { label: "RAM", val: selected.ram },
                  { label: "Stocare", val: selected.storage },
                  { label: "Placă Bază", val: selected.motherboard },
                  { label: "Cooler", val: selected.cooler },
                  { label: "Sursă", val: selected.psu },
                  { label: "Carcasă", val: caseText ? { name: caseText } : null },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-start text-[11px]">
                    <span className="text-gray-600 uppercase font-bold tracking-widest shrink-0 mr-4">{item.label}:</span>
                    <span className={item.val ? "text-indigo-400 font-bold text-right break-words max-w-[150px]" : "text-gray-800 italic"}>
                      {item.val ? item.val.name : "Neselectat"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mb-6">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 ml-1">Email de contact</label>
                <input 
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="client@gmail.com"
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-4 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all backdrop-blur-md"
                />
              </div>

              <div className="mb-8">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 ml-1">Detalii suplimentare</label>
                <textarea 
                  value={extraInfo}
                  onChange={(e) => setExtraInfo(e.target.value)}
                  placeholder="Utilizare, buget, etc ..."
                  className="w-full h-32 bg-white/[0.05] border border-white/10 rounded-2xl p-4 text-xs text-white placeholder:text-gray-700 focus:outline-none focus:border-indigo-500/50 transition-all resize-none backdrop-blur-md"
                />
              </div>

              <div className="pt-6 border-t border-white/5 text-center">
                <button 
                  onClick={handleSendOffer}
                  disabled={!selected.cpu || !selected.gpu || loading}
                  className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] italic transition-all flex items-center justify-center gap-3 ${
                    status === "success" 
                      ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]" 
                      : "bg-white text-black hover:bg-indigo-600 hover:text-white hover:shadow-[0_0_30px_rgba(79,70,229,0.4)]"
                  } disabled:opacity-5`}
                >
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : status === "success" ? (
                    "CERERE TRIMISĂ!"
                  ) : (
                    "SOLICITĂ OFERTĂ"
                  )}
                </button>

                {status === "error" && (
                  <p className="text-pink-500 text-[10px] mt-4 font-bold uppercase tracking-widest">Eroare server.</p>
                )}
                
                <p className="text-[9px] text-gray-600 mt-6 leading-relaxed italic uppercase tracking-wider">
                  {status === "success" 
                    ? "Te vom contacta în cel mai scurt timp!"
                    : "Analizăm configurația și revenim cu prețul final."
                  }
                </p>
              </div>
            </div>
          </aside>
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
          animation: blob 12s infinite alternate ease-in-out;
        }
        .animation-delay-2000 {
          animation-delay: 4s;
        }
      `}} />
    </div>
  );
}