import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client"; 
import SEO from "../components/SEO"; 

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Stări pentru Editare
  const [editingId, setEditingId] = useState(null);

  // Stări pentru Modale
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, text: "" });

  const [formData, setFormData] = useState({
    text: "",
    link: "",
    type: "info",
    targetPage: "all"
  });

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
      if (!res.ok) throw new Error("Eroare la preluarea anunțurilor.");
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

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    
    if (!formData.text.trim()) {
      setError("Textul anunțului este obligatoriu.");
      return;
    }

    try {
      const isEditing = editingId !== null;
      const endpoint = isEditing ? `/announcements/${editingId}` : "/announcements";
      const method = isEditing ? "PUT" : "POST";

      const res = await apiFetch(endpoint, {
        method: method,
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) throw new Error("Eroare la salvarea anunțului.");
      
      // Reset formular
      setFormData({ text: "", link: "", type: "info", targetPage: "all" });
      setEditingId(null);
      setSuccessMsg(isEditing ? "Anunț modificat cu succes!" : "Anunț adăugat cu succes!");
      fetchAnnouncements();
      
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditClick = (announcement) => {
    setFormData({
      text: announcement.text,
      link: announcement.link || "",
      type: announcement.type,
      targetPage: announcement.targetPage
    });
    setEditingId(announcement.id);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // ducem view-ul sus la formular
  };

  const cancelEdit = () => {
    setFormData({ text: "", link: "", type: "info", targetPage: "all" });
    setEditingId(null);
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

  const confirmDeleteAction = async () => {
    if (!deleteConfirm.id) return;
    try {
      const res = await apiFetch(`/announcements/${deleteConfirm.id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccessMsg("Anunțul a fost șters definitiv!");
        fetchAnnouncements();
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setError("Eroare la ștergerea anunțului.");
    } finally {
      setDeleteConfirm({ show: false, id: null, text: "" });
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

          {/* ALERTE */}
          <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
             {error && (
                <div className="animate-in slide-in-from-right-full p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-widest shadow-2xl backdrop-blur-xl">
                    ⚠️ {error}
                </div>
             )}
             {successMsg && (
                <div className="animate-in slide-in-from-right-full p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-widest shadow-2xl backdrop-blur-xl">
                    ✓ {successMsg}
                </div>
             )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* FORMULAR ADAUGARE / EDITARE */}
            <div className="lg:col-span-4">
              <div className={`p-8 rounded-[35px] border backdrop-blur-xl shadow-2xl sticky top-32 transition-colors duration-500 ${editingId ? 'bg-amber-500/5 border-amber-500/30' : 'bg-white/5 border-white/10'}`}>
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-lg font-black text-white uppercase italic tracking-widest">
                     {editingId ? "Editează Anunțul" : "Adaugă Anunț Nou"}
                   </h2>
                   {editingId && <button onClick={cancelEdit} className="text-xs text-gray-500 hover:text-white underline font-bold uppercase tracking-widest">Anulează</button>}
                </div>
                
                <form onSubmit={handleSave} className="space-y-4">
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
                    className={`w-full py-4 mt-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg active:scale-[0.98] transition-all ${editingId ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20 text-white' : 'bg-pink-600 hover:bg-pink-500 shadow-pink-600/20 text-white'}`}
                  >
                    {editingId ? "💾 Salvează Modificările" : "+ Adaugă Anunțul"}
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

                      const pageLabel = sitePages.find(p => p.value === a.targetPage)?.label || a.targetPage;

                      return (
                        <div key={a.id} className={`p-6 rounded-[25px] border transition-all ${a.isActive ? 'bg-white/[0.03] border-white/10' : 'bg-black/40 border-white/5 opacity-60'} ${editingId === a.id ? 'ring-2 ring-amber-500/50' : ''}`}>
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

                            <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t border-white/10 sm:border-0">
                              <button 
                                onClick={() => handleEditClick(a)}
                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-colors"
                              >
                                ✏️ Editează
                              </button>
                              
                              <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleToggle(a.id, a.isActive)}
                                    className={`flex-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${a.isActive ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'}`}
                                  >
                                    {a.isActive ? "Oprește" : "Pornește"}
                                  </button>
                                  <button 
                                    onClick={() => setDeleteConfirm({ show: true, id: a.id, text: a.text })}
                                    className="flex-1 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-colors"
                                  >
                                    Șterge
                                  </button>
                              </div>
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

      {/* MODAL ȘTERGERE FRUMOS (Înlocuiește window.confirm) */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 backdrop-blur-md bg-black/60">
          <div className="relative w-full max-w-sm bg-[#161e31]/90 backdrop-blur-2xl border border-rose-500/20 p-10 rounded-[40px] text-center shadow-2xl animate-in zoom-in">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🗑️</div>
            <h2 className="text-2xl font-black text-white mb-2 italic uppercase">Ștergere Anunț</h2>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed font-medium italic">
              Ești sigur că vrei să ștergi definitiv acest anunț? <br/><br/> <span className="text-white font-bold opacity-80">"{deleteConfirm.text}"</span>
            </p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteConfirm({ show: false, id: null, text: "" })} className="flex-1 py-4 rounded-2xl font-black text-gray-400 bg-white/5 hover:bg-white/10 uppercase tracking-widest text-[10px] transition-all">Anulează</button>
              <button onClick={confirmDeleteAction} className="flex-1 py-4 rounded-2xl font-black text-white bg-rose-600 hover:bg-rose-500 uppercase tracking-widest text-[10px] shadow-lg shadow-rose-600/20 transition-all">Da, Șterge</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}