import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { formatRON } from "../utils/money";

export default function AdminInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });
  const [statusModal, setStatusModal] = useState({ show: false, message: "", type: "error" });

  const [form, setForm] = useState({ 
    name: "", priceRon: "", description: "", longDescription: "", category: "pc",
    imageUrl: "", cpuBrand: "", gpuBrand: "", ramGb: "", storageGb: "",
    motherboard: "", case: "", cooler: "", psu: "", 
    warrantyMonths: "24",
    benchmarks: [],
    isVisible: true 
  });

  const fetchProducts = async () => {
    try {
      const res = await apiFetch("/api/products/admin-all");
      if (res.ok) setProducts(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, []);

  // --- FUNCȚIE COPIERE LINK (REPARATĂ) ---
  const copyProductLink = async (e, id) => {
    e.preventDefault(); // Prevenim orice comportament default
    e.stopPropagation(); // Oprim propagarea catre elementele parinte

    // Generăm link-ul complet bazat pe URL-ul curent al site-ului
    const productUrl = `${window.location.origin}/product/${id}`;

    try {
      // Metoda modernă de copiere
      await navigator.clipboard.writeText(productUrl);
      
      // Afișăm confirmarea în modal
      setStatusModal({ 
        show: true, 
        message: `LINK COPIAT: ${productUrl}`, 
        type: "success" 
      });

      // Închidem automat mesajul după 2 secunde pentru a nu bloca adminul
      setTimeout(() => {
        setStatusModal(prev => ({ ...prev, show: false }));
      }, 2000);
      
    } catch (err) {
      console.error("Eroare la copiere:", err);
      // Fallback dacă clipboard-ul e blocat
      alert(`Nu s-a putut copia automat. Link-ul este: ${productUrl}`);
    }
  };

  const addBenchmark = () => {
    setForm({ ...form, benchmarks: [...form.benchmarks, { game: "", fps: "" }] });
  };

  const removeBenchmark = (index) => {
    const newBenches = form.benchmarks.filter((_, i) => i !== index);
    setForm({ ...form, benchmarks: newBenches });
  };

  const handleBenchmarkChange = (index, field, value) => {
    const newBenches = [...form.benchmarks];
    newBenches[index][field] = value;
    setForm({ ...form, benchmarks: newBenches });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        priceCents: Math.round(parseFloat(form.priceRon) * 100),
        description: form.description,
        longDescription: form.longDescription,
        category: form.category,
        images: form.imageUrl ? [form.imageUrl] : [],
        cpuBrand: form.cpuBrand || null,
        gpuBrand: form.gpuBrand || null,
        ramGb: form.ramGb || null,
        storageGb: form.storageGb || null,
        motherboard: form.motherboard || null,
        "case": form.case || null,
        cooler: form.cooler || null, 
        psu: form.psu || null,      
        warrantyMonths: form.category === "pc" ? parseInt(form.warrantyMonths, 10) : 0,
        benchmarks: form.benchmarks,
        isVisible: form.isVisible 
      };

      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/products/${editingId}` : "/api/products";

      const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Eroare la procesare.");
      
      resetForm();
      fetchProducts();
      setStatusModal({ show: true, message: "Inventar actualizat!", type: "success" });
    } catch (err) { 
      setStatusModal({ show: true, message: err.message, type: "error" });
    }
  };

  const resetForm = () => {
    setForm({ 
      name: "", priceRon: "", description: "", longDescription: "", category: "pc", 
      imageUrl: "", cpuBrand: "", gpuBrand: "", ramGb: "", storageGb: "",
      motherboard: "", case: "", cooler: "", psu: "", warrantyMonths: "24",
      benchmarks: [],
      isVisible: true
    });
    setEditingId(null);
  };

  const handleEditClick = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      priceRon: (p.priceCents / 100).toString(),
      description: p.description || "",
      longDescription: p.longDescription || "",
      category: p.category,
      imageUrl: p.images?.[0] || "",
      cpuBrand: p.cpuBrand || "",
      gpuBrand: p.gpuBrand || "",
      ramGb: p.ramGb || "",
      storageGb: p.storageGb || "",
      motherboard: p.motherboard || "", 
      case: p.case || "", 
      cooler: p.cooler || "", 
      psu: p.psu || "",      
      warrantyMonths: (p.warrantyMonths || 24).toString(),
      benchmarks: p.benchmarks || [],
      isVisible: p.isVisible !== undefined ? p.isVisible : true 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const executeDelete = async () => {
    const id = deleteConfirm.id;
    setDeleteConfirm({ show: false, id: null });
    try {
      const res = await apiFetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchProducts();
        setStatusModal({ show: true, message: "Produs eliminat definitiv.", type: "success" });
      }
    } catch (err) { setStatusModal({ show: true, message: "Eroare server.", type: "error" }); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-transparent"><div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 md:px-8 bg-transparent text-white relative text-left font-sans">
      <div className="max-w-6xl mx-auto relative z-10">
        
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter drop-shadow-2xl">
              Gestiune <span className="text-indigo-400">Inventar</span>
            </h1>
          </div>
          <Link to="/admin" className="text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-6 py-3 rounded-2xl hover:bg-white/10 transition-all backdrop-blur-md">← Panou Control</Link>
        </header>

        {/* FORMULAR ADAUGARE / EDITARE */}
        <form onSubmit={handleSubmit} className={`transition-all duration-500 p-10 rounded-[40px] border mb-16 shadow-2xl backdrop-blur-xl ${editingId ? 'bg-indigo-500/10 border-indigo-500/40' : 'bg-white/5 border-white/10'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="md:col-span-3 flex items-center justify-between border-b border-white/5 pb-4 mb-2">
               <h3 className="text-white font-black uppercase text-xs tracking-widest italic">{editingId ? "⚡ Editare Produs" : "➕ Adăugare Produs Nou"}</h3>
               {editingId && <button type="button" onClick={resetForm} className="text-[9px] font-black uppercase text-pink-500 hover:underline">Renunță la editare</button>}
            </div>

            <input type="text" placeholder="Nume Produs" className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-indigo-500 transition-all" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <input type="number" step="0.01" placeholder="Preț (RON)" className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-indigo-500" value={form.priceRon} onChange={e => setForm({...form, priceRon: e.target.value})} required />
            
            <select className="bg-[#0b1020] border border-white/10 p-4 rounded-2xl outline-none text-sm font-bold" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              <option value="pc">Sistem PC</option>
              <option value="service">Serviciu / Mentenanță</option>
            </select>

            <input type="text" placeholder="URL Imagine" className="md:col-span-2 bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-indigo-500" value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} />
            
            <div className="flex flex-col gap-4">
              <select className="bg-[#0b1020] border border-white/10 p-4 rounded-2xl outline-none text-sm" value={form.warrantyMonths} onChange={e => setForm({...form, warrantyMonths: e.target.value})}>
                <option value="12">🛡️ 12 Luni Garanție</option>
                <option value="24">🛡️ 24 Luni Garanție</option>
                <option value="36">🛡️ 36 Luni Garanție</option>
              </select>

              <label className="flex items-center gap-3 px-4 py-2 cursor-pointer group bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                <input 
                  type="checkbox" 
                  checked={form.isVisible} 
                  onChange={e => setForm({...form, isVisible: e.target.checked})}
                  className="w-5 h-5 rounded border-white/10 bg-white/5 accent-indigo-500"
                />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white italic">Afișează în Shop</span>
                  <span className="text-[8px] text-gray-500 uppercase font-bold">Dacă e debifat, produsul e privat.</span>
                </div>
              </label>
            </div>

            {form.category === "pc" && (
              <>
                <div className="md:col-span-3 h-[1px] bg-white/10 my-4" />
                <input type="text" placeholder="Procesor" className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none text-sm" value={form.cpuBrand} onChange={e => setForm({...form, cpuBrand: e.target.value})} />
                <input type="text" placeholder="Placă Video" className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none text-sm" value={form.gpuBrand} onChange={e => setForm({...form, gpuBrand: e.target.value})} />
                <input type="text" placeholder="Placă de bază" className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none text-sm" value={form.motherboard} onChange={e => setForm({...form, motherboard: e.target.value})} />
                <input type="text" placeholder="Memorie RAM" className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none text-sm" value={form.ramGb} onChange={e => setForm({...form, ramGb: e.target.value})} />
                <input type="text" placeholder="Stocare" className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none text-sm" value={form.storageGb} onChange={e => setForm({...form, storageGb: e.target.value})} />
                <input type="text" placeholder="Carcasă" className="bg-white/5 border border-white/10 p-4 rounded-2xl outline-none text-sm" value={form.case} onChange={e => setForm({...form, case: e.target.value})} />

                <div className="md:col-span-3 mt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-indigo-400 font-black uppercase text-[10px] tracking-widest">📈 Performanță Jocuri (FPS)</h4>
                        <button type="button" onClick={addBenchmark} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-500 transition-all">＋ Adaugă Joc</button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {form.benchmarks.map((bench, idx) => (
                            <div key={idx} className="flex gap-2 p-3 bg-white/5 border border-white/5 rounded-2xl items-center">
                                <input type="text" placeholder="Joc" className="bg-transparent border-b border-white/10 flex-1 outline-none text-xs font-bold py-1" value={bench.game} onChange={(e) => handleBenchmarkChange(idx, "game", e.target.value)} />
                                <input type="text" placeholder="FPS" className="bg-transparent border-b border-white/10 w-16 outline-none text-xs font-black text-indigo-400 py-1" value={bench.fps} onChange={(e) => handleBenchmarkChange(idx, "fps", e.target.value)} />
                                <button type="button" onClick={() => removeBenchmark(idx)} className="text-pink-500 text-lg px-2">✕</button>
                            </div>
                        ))}
                    </div>
                </div>
              </>
            )}

            <textarea placeholder="Rezumat scurt..." className="md:col-span-3 bg-white/5 border border-white/10 p-4 rounded-2xl h-20 outline-none text-sm italic" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            <textarea placeholder="Descriere detaliată produs..." className="md:col-span-3 bg-white/5 border border-white/10 p-4 rounded-3xl h-40 outline-none text-sm italic" value={form.longDescription} onChange={e => setForm({...form, longDescription: e.target.value})} />

            <button type="submit" className="md:col-span-3 py-5 bg-gradient-to-r from-indigo-600 to-pink-600 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl hover:scale-[1.01] active:scale-95 transition-all">
              {editingId ? "Salvează Modificările" : "Lansează în Catalog"}
            </button>
          </div>
        </form>

        {/* LISTA DE PRODUSE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {products.map(p => (
            <div key={p.id} className={`group flex items-center gap-6 p-6 rounded-[35px] border backdrop-blur-md transition-all ${editingId === p.id ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
              <div className="w-20 h-20 rounded-2xl bg-black/20 overflow-hidden flex-shrink-0 border border-white/10">
                <img src={p.images?.[0] || "https://placehold.co/100"} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <div className="flex-1 text-left overflow-hidden">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-black italic uppercase truncate text-sm">{p.name}</p>
                  {!p.isVisible && (
                    <span className="bg-pink-500/20 text-pink-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-pink-500/30">Privat</span>
                  )}
                </div>
                <p className="text-[11px] text-indigo-400 font-black">{(p.priceCents/100).toFixed(2)} RON <span className="text-gray-600 font-normal ml-2">#{p.id}</span></p>
              </div>

              <div className="flex gap-2">
                {/* BUTON COPY LINK REPARAT */}
                {!p.isVisible && (
                  <button 
                    onClick={(e) => copyProductLink(e, p.id)} 
                    className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center text-lg shadow-lg active:scale-90"
                    title="Copiază Link"
                  >
                    🔗
                  </button>
                )}
                <button onClick={() => handleEditClick(p)} className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center">✏️</button>
                <button onClick={() => setDeleteConfirm({ show: true, id: p.id })} className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-500 border border-pink-500/20 hover:bg-pink-500 hover:text-white transition-all flex items-center justify-center">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODALELE DE STATUS ȘI ȘTERGERE */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 backdrop-blur-xl bg-black/60">
          <div className="relative w-full max-w-sm bg-[#161e31]/95 border border-pink-500/30 p-10 rounded-[40px] text-center shadow-2xl animate-in zoom-in">
            <h2 className="text-2xl font-black text-white mb-3 italic uppercase">Eliminare</h2>
            <p className="text-gray-400 text-xs mb-8 uppercase font-bold italic">Ștergi definitiv produsul #{deleteConfirm.id}?</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteConfirm({ show: false, id: null })} className="flex-1 py-4 rounded-2xl font-black text-gray-400 bg-white/5 uppercase text-[10px]">Nu</button>
              <button onClick={executeDelete} className="flex-1 py-4 rounded-2xl font-black text-white bg-pink-600 hover:bg-pink-500 uppercase text-[10px]">Da, Șterge</button>
            </div>
          </div>
        </div>
      )}

      {statusModal.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 backdrop-blur-xl bg-black/40">
          <div className={`w-full max-w-sm p-10 rounded-[40px] text-center shadow-2xl border ${statusModal.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30' : 'bg-pink-950/90 border-pink-500/30'}`}>
            {statusModal.type === 'success' && <div className="text-4xl mb-4">✅</div>}
            <p className="text-white font-bold text-xs mb-8 italic uppercase tracking-wider leading-relaxed">{statusModal.message}</p>
            <button onClick={() => setStatusModal({ ...statusModal, show: false })} className="w-full py-4 rounded-2xl font-black text-white bg-white/10 uppercase text-[10px] hover:bg-white/20 transition-all">Închide</button>
          </div>
        </div>
      )}
    </div>
  );
}