import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client"; 
import SEO from "../components/SEO"; 

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Formular
  const [formData, setFormData] = useState({
    text: "",
    link: "",
    type: "info",
    targetPage: "all"
  });

  // Lista paginilor din site-ul tău pentru dropdown
  const sitePages = [
    { value: "all", label: "Toate Paginile (Global)" },
    { value: "/", label: "Acasă (Home)" },
    { value: "/shop", label: "Magazin (Shop)" },
    { value: "/cart", label: "Coș de cumpărături" },
    { value: "/checkout", label: "Finalizare Comandă" },
    { value: "/contact", label: "Contact" },
    { value: "/support", label: "Suport Tehnic (FAQ)" },
    { value: "/warranty", label: "Garanție Extinsă" },
    { value: "/terms", label: "Termeni și Condiții" },
    { value: "/confidentialitate", label: "Politica de Confidențialitate" }
  ];

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/announcements/admin-all");
      if (!res.ok) throw new Error("Eroare la preluarea anunțurilor. Ai dat restart la backend?");
      const data = await res.json();
      setAnnouncements(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    
    if (!formData.text.trim()) {
      setError("Textul anunțului este obligatoriu.");
      return;
    }

    try {
      const res = await apiFetch("/announcements", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Eroare la adăugarea anunțului.");
      
      setFormData({ text: "", link: "", type: "info", targetPage: "all" });
      setSuccessMsg("Anunțul a fost adăugat cu succes!");
      fetchAnnouncements();
      
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      const res = await apiFetch(`/announcements/${id}/toggle`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) fetchAnnouncements();
    } catch (err) {
      setError("Eroare la modificarea statusului.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Ești sigur că vrei să ștergi acest anunț definitiv?")) return;
    
    try {
      const res = await apiFetch(`/announcements/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccessMsg("Anunțul a fost șters!");
        fetchAnnouncements();
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setError("Eroare la ștergerea anunțului.");
    }
  };

  return (
    <>
      <SEO title="Gestiune Anunțuri - Admin Karix" />

      <div className="min-h-screen pt-32 pb-24 px-4 md:px-8 bg-transparent text-white relative text-left font-sans">
        <div className="max-w-6xl mx-auto relative z-10">
          
          {/* HEADER */}
          <header className="mb-12 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
            <div>
              <h1 className="text-5xl font-black italic uppercase tracking-tighter drop-shadow-2xl">
                Gestiune <span className="text-pink-400">Anunțuri</span>
              </h1>
              <p className="text-gray-400 font-medium uppercase text-[10px] tracking-[0.2em] mt-2">
                Controlează bannerele de pe site
              </p>
            </div>
            <Link 
              to="/admin" 
              className="text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-6 py-3 rounded-2xl hover:bg-white/10 transition-all backdrop-blur-md w-fit"
            >
              ← Panou Control
            </Link>
          </header>

          {error && <div className="mb-6 p-4 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-bold uppercase tracking-widest text-center">{error}</div>}
          {successMsg && <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-widest text-center">{successMsg}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* FORMULAR ADAUGARE */}
            <div className="lg:col-span-4">
              <div className="p-8 rounded-[35px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl sticky top-32">
                <h2 className="text-lg font-black text-white uppercase italic tracking-widest mb-6">Adaugă Anunț Nou</h2>
                
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase ml-1 italic">Text Anunț *</label>
                    <textarea 
                      required
                      className="w-full bg-[#0b1020]/50 border border-white/10 rounded-2xl p-4 text-white focus:border-pink-500/50 outline-none transition-all placeholder-gray-600 font-medium min-h-[100px] resize-none" 
                      placeholder="Ex: Livrare gratuită la comenzi peste 5000 RON!"
                      value={formData.text}
                      onChange={e => setFormData({ ...formData, text: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase ml-1 italic">Link (Opțional)</label>
                    <input 
                      type="text"
                      className="w-full bg-[#0b1020]/50 border border-white/10 rounded-2xl p-4 text-white focus:border-pink-500/50 outline-none transition-all placeholder-gray-600 font-medium" 
                      placeholder="Ex: /shop sau https://..."
                      value={formData.link}
                      onChange={e => setFormData({ ...formData, link: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase ml-1 italic">Tip Banner</label>
                      <select 
                        className="w-full bg-[#0b1020]/50 border border-white/10 rounded-2xl p-4 text-white focus:border-pink-500/50 outline-none transition-all font-bold text-[10px] uppercase tracking-widest cursor-pointer"
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="info">Albastru (Info)</option>
                        <option value="promo">Roz (Promo)</option>
                        <option value="warning">Galben (Atenție)</option>
                      </select>
                    </div>

                    {/* 👉 AICI ESTE DROPDOWN-UL NOU PENTRU PAGINI */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase ml-1 italic">Pagină Țintă</label>
                      <select 
                        className="w-full bg-[#0b1020]/50 border border-white/10 rounded-2xl p-4 text-white focus:border-pink-500/50 outline-none transition-all font-bold text-[10px] uppercase tracking-widest cursor-pointer"
                        value={formData.targetPage}
                        onChange={e => setFormData({ ...formData, targetPage: e.target.value })}
                      >
                        {sitePages.map(page => (
                          <option key={page.value} value={page.value}>
                            {page.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 mt-4 rounded-2xl bg-pink-600 hover:bg-pink-500 text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-pink-600/20 active:scale-[0.98] transition-all"
                  >
                    + Salvează Anunțul
                  </button>
                </form>
              </div>
            </div>

            {/* TABEL ANUNȚURI */}
            <div className="lg:col-span-8">
              <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl">
                <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 px-2">Anunțuri Configurate</h2>
                
                {loading ? (
                   <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin"></div></div>
                ) : announcements.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-white/10 rounded-[30px] bg-black/20">
                    <p className="text-gray-500 font-black italic uppercase tracking-widest text-xs">Niciun anunț creat.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {announcements.map((a) => {
                      
                      let typeLabel = "Info";
                      let typeColor = "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
                      if (a.type === "promo") { typeLabel = "Promo"; typeColor = "text-pink-400 bg-pink-500/10 border-pink-500/20"; }
                      if (a.type === "warning") { typeLabel = "Atenție"; typeColor = "text-amber-400 bg-amber-500/10 border-amber-500/20"; }

                      // Găsim label-ul frumos pentru pagina afișată
                      const pageLabel = sitePages.find(p => p.value === a.targetPage)?.label || a.targetPage;

                      return (
                        <div key={a.id} className={`p-6 rounded-[25px] border transition-all ${a.isActive ? 'bg-white/[0.03] border-white/10' : 'bg-black/40 border-white/5 opacity-60'}`}>
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <span className={`px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-widest ${typeColor}`}>
                                  {typeLabel}
                                </span>
                                <span className="px-2 py-0.5 rounded-md border border-white/10 bg-white/5 text-gray-400 text-[8px] font-black uppercase tracking-widest">
                                  {pageLabel}
                                </span>
                                {!a.isActive && (
                                  <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-black uppercase tracking-widest">Inactiv</span>
                                )}
                              </div>
                              <p className="text-white font-bold text-sm leading-relaxed mb-2">
                                {a.text}
                              </p>
                              {a.link && (
                                <p className="text-xs text-indigo-300 font-medium italic">
                                  🔗 Link: {a.link}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-row sm:flex-col gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t border-white/10 sm:border-0">
                              <button 
                                onClick={() => handleToggle(a.id, a.isActive)}
                                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${a.isActive ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'}`}
                              >
                                {a.isActive ? "Dezactivează" : "Activează"}
                              </button>
                              <button 
                                onClick={() => handleDelete(a.id)}
                                className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-colors"
                              >
                                Șterge
                              </button>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}