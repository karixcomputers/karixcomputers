import React, { useState, useEffect } from "react";
import { apiFetch } from "../api/client";

export default function AdminConfigurator() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    category: "cpu",
    brand: "Intel", 
    name: "",
    spec: "",
    price: "0"
  });

  const fetchItems = async () => {
    try {
      const res = await apiFetch("/api/adminconfigurator/all");
      if (res.ok) setItems(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  // Setăm brand-ul automat doar pentru CPU și GPU
  useEffect(() => {
    if (formData.category === "cpu") {
      setFormData(prev => ({ ...prev, brand: "Intel" }));
    } else if (formData.category === "gpu") {
      setFormData(prev => ({ ...prev, brand: "Nvidia" }));
    } else {
      // Pentru Placă de bază, RAM, SSD, Sursă, Cooler - câmpul brand rămâne gol
      setFormData(prev => ({ ...prev, brand: "" }));
    }
  }, [formData.category]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/api/adminconfigurator", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          price: parseInt(formData.price || 0)
        })
      });
      if (res.ok) {
        const newItem = await res.json();
        setItems(prev => [...prev, newItem]);
        setFormData({ ...formData, name: "", spec: "", price: "0" }); 
      }
    } catch (err) { alert("Eroare la adăugare"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Sigur ștergi această componentă?")) return;
    try {
      const res = await apiFetch(`/api/adminconfigurator/${id}`, { method: "DELETE" });
      if (res.ok) setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) { alert("Eroare la ștergere"); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-transparent"><div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" /></div>;

  const categories = {
    cpu: "Procesoare", 
    gpu: "Plăci Video", 
    motherboard: "Plăci de Bază",
    ram: "Memorii RAM", 
    storage: "Stocare SSD", 
    cooler: "Coolere",
    psu: "Surse"
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 md:px-8 bg-transparent text-white relative max-w-6xl mx-auto">
      <h1 className="text-5xl font-black italic uppercase tracking-tighter drop-shadow-2xl mb-12 text-left">
        Admin <span className="text-indigo-400">Configurator</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1">
          <form onSubmit={handleAdd} className="bg-white/5 border border-white/10 p-6 rounded-[30px] backdrop-blur-md space-y-4 shadow-xl sticky top-32 text-left">
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 italic mb-6">Adaugă Componentă</h3>
            
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500">Categorie</label>
              <select 
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value})} 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs mt-1 outline-none text-white appearance-none"
              >
                <option value="cpu">Procesor (CPU)</option>
                <option value="gpu">Placă Video (GPU)</option>
                <option value="motherboard">Placă de bază</option>
                <option value="ram">Memorie RAM</option>
                <option value="storage">Stocare (SSD)</option>
                <option value="cooler">Cooler</option>
                <option value="psu">Sursă (PSU)</option>
              </select>
            </div>

            {/* APARE DOAR PENTRU CPU */}
            {formData.category === "cpu" && (
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500">Brand Procesor</label>
                <select 
                  value={formData.brand} 
                  onChange={e => setFormData({...formData, brand: e.target.value})} 
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs mt-1 outline-none text-white"
                >
                  <option value="Intel">Intel</option>
                  <option value="AMD">AMD</option>
                </select>
              </div>
            )}

            {/* APARE DOAR PENTRU GPU */}
            {formData.category === "gpu" && (
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500">Arhitectură Video</label>
                <select 
                  value={formData.brand} 
                  onChange={e => setFormData({...formData, brand: e.target.value})} 
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs mt-1 outline-none text-white"
                >
                  <option value="Nvidia">Nvidia</option>
                  <option value="AMD">AMD</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500">Nume (Model)</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: ASUS ROG Strix Z790" className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs mt-1 outline-none text-white" />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500">Specificații scurte</label>
              <input required type="text" value={formData.spec} onChange={e => setFormData({...formData, spec: e.target.value})} placeholder="Ex: DDR5, Wi-Fi 6E" className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs mt-1 outline-none text-white" />
            </div>

            <button type="submit" className="w-full py-4 mt-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
              Adaugă în Configurator
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-10 text-left">
          {Object.keys(categories).map(cat => {
            const catItems = items.filter(i => i.category === cat);
            if(catItems.length === 0) return null;
            return (
              <div key={cat}>
                <h3 className="text-lg font-black italic uppercase tracking-tighter mb-4 text-white border-b border-white/5 pb-2">
                  {categories[cat]}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {catItems.map(item => (
                    <div key={item.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex justify-between items-center group hover:bg-white/[0.05] transition-all">
                      <div>
                        {item.brand && <span className="text-[8px] text-indigo-400 font-black uppercase bg-indigo-400/10 px-2 py-0.5 rounded-full mr-2">{item.brand}</span>}
                        <h4 className="text-xs font-bold text-white leading-tight mt-1">{item.name}</h4>
                        <p className="text-[9px] text-gray-500 tracking-widest uppercase">{item.spec}</p>
                      </div>
                      <button onClick={() => handleDelete(item.id)} className="h-8 w-8 rounded-lg bg-pink-500/10 text-pink-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-pink-500 hover:text-white">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}