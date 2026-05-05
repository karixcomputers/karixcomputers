import React, { useState, useEffect } from "react";
import { apiFetch } from "../api/client";

export default function AdminConfigurator() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    category: "cpu",
    brand: "Intel", 
    name: "",
    spec: "",
    price: "0", 
    imageFile: null // 👉 NOU: State pentru fișierul imagine
  });

  // 👉 NOU: State pentru previzualizarea imaginii selectate
  const [imagePreview, setImagePreview] = useState(null);

  const fetchItems = async () => {
    try {
      const res = await apiFetch("/adminconfigurator/all");
      if (res.ok) setItems(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    if (formData.category === "cpu") {
      setFormData(prev => ({ ...prev, brand: "Intel" }));
    } else if (formData.category === "gpu") {
      setFormData(prev => ({ ...prev, brand: "Nvidia" }));
    } else {
      setFormData(prev => ({ ...prev, brand: "" }));
    }
  }, [formData.category]);

  // 👉 NOU: Handler pentru schimbarea imaginii
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, imageFile: file });
      setImagePreview(URL.createObjectURL(file));
    } else {
      setFormData({ ...formData, imageFile: null });
      setImagePreview(null);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const priceToSave = formData.category === 'case' ? parseInt(formData.price || 0) * 100 : 0;

      // 👉 NOU: Folosim FormData pentru a putea trimite fișierul imagine către server
      const submitData = new FormData();
      submitData.append('category', formData.category);
      submitData.append('brand', formData.brand);
      submitData.append('name', formData.name);
      submitData.append('spec', formData.spec);
      submitData.append('price', priceToSave);
      
      if (formData.imageFile) {
        submitData.append('image', formData.imageFile);
      }

      // 🚨 ATENȚIE: Când trimitem FormData, NU mai setăm 'Content-Type': 'application/json' 
      // în apiFetch. Browser-ul va pune automat 'multipart/form-data'.
      // Sper că funcția ta `apiFetch` permite omiterea header-ului `Content-Type` dacă e FormData.
      const res = await apiFetch("/adminconfigurator", {
        method: "POST",
        body: submitData
      });

      if (res.ok) {
        const newItem = await res.json();
        setItems(prev => [...prev, newItem]);
        // Resetăm formularul
        setFormData({ ...formData, name: "", spec: "", price: "0", imageFile: null }); 
        setImagePreview(null);
        // Resetăm și input-ul de file (hack rapid)
        document.getElementById('imageInput').value = '';
      } else {
         const errData = await res.json();
         alert("Eroare backend: " + errData.error);
      }
    } catch (err) { 
        alert("Eroare la adăugare componentă."); 
        console.error(err);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Sigur ștergi această componentă?")) return;
    try {
      const res = await apiFetch(`/adminconfigurator/${id}`, { method: "DELETE" });
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
    psu: "Surse",
    case: "Carcase (Pentru Shop)"
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
                <option value="case" className="text-pink-400 font-bold">Carcasă (Shop Upgrade)</option>
              </select>
            </div>

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

            {formData.category === "case" && (
              <div className="pt-2">
                <label className="text-[10px] uppercase font-bold text-pink-400">Preț Adițional (RON)</label>
                <input 
                  required 
                  type="number" 
                  value={formData.price} 
                  onChange={e => setFormData({...formData, price: e.target.value})} 
                  placeholder="Ex: 300" 
                  className="w-full bg-pink-500/10 border border-pink-500/30 rounded-xl p-3 text-xs mt-1 outline-none text-white" 
                />
                <span className="text-[8px] text-gray-500 block mt-1">Acesta este prețul care se adaugă la sistemul de bază în Shop.</span>
              </div>
            )}

            {/* 👉 NOU: Câmp pentru Upload Imagine */}
            <div className="pt-2">
               <label className="text-[10px] uppercase font-bold text-emerald-400">Imagine (Opțional)</label>
               <input 
                 id="imageInput"
                 type="file" 
                 accept="image/*"
                 onChange={handleImageChange}
                 className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs mt-1 outline-none text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30 cursor-pointer"
               />
               
               {/* Previzualizare imagine */}
               {imagePreview && (
                 <div className="mt-3 relative h-32 w-full rounded-xl overflow-hidden border border-white/10 bg-black/40">
                   <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                 </div>
               )}
            </div>

            <button disabled={isSubmitting} type="submit" className="w-full py-4 mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
              {isSubmitting ? "Se încarcă..." : "Adaugă în Bază"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-10 text-left">
          {Object.keys(categories).map(cat => {
            const catItems = items.filter(i => i.category === cat);
            if(catItems.length === 0) return null;
            return (
              <div key={cat}>
                <h3 className="text-lg font-black italic uppercase tracking-tighter mb-4 text-white border-b border-white/5 pb-2 flex justify-between items-center">
                  <span>{categories[cat]}</span>
                  <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full not-italic tracking-widest">{catItems.length} BUC.</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {catItems.map(item => (
                    <div key={item.id} className={`p-4 rounded-2xl flex justify-between items-center group transition-all ${cat === 'case' ? 'bg-pink-500/5 border border-pink-500/20' : 'bg-white/[0.02] border border-white/10 hover:bg-white/[0.05]'}`}>
                      
                      <div className="flex items-center gap-4">
                        {/* 👉 NOU: Arătăm thumbnail în listă dacă există */}
                        {item.image && (
                          <div className="w-10 h-10 rounded-lg bg-black/50 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                            <img src={item.image.startsWith('http') ? item.image : `https://karixcomputers.ro/uploads/${item.image}`} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        
                        <div>
                          {item.brand && <span className="text-[8px] text-indigo-400 font-black uppercase bg-indigo-400/10 px-2 py-0.5 rounded-full mr-2">{item.brand}</span>}
                          <h4 className="text-xs font-bold text-white leading-tight mt-1">{item.name}</h4>
                          <div className="flex gap-2 items-center mt-1">
                              <p className="text-[9px] text-gray-500 tracking-widest uppercase">{item.spec}</p>
                              {cat === 'case' && item.price > 0 && (
                                  <span className="text-[9px] text-pink-400 font-bold bg-pink-500/10 px-2 py-0.5 rounded-full">+{item.price / 100} RON</span>
                              )}
                          </div>
                        </div>
                      </div>

                      <button onClick={() => handleDelete(item.id)} className="h-8 w-8 rounded-lg bg-pink-500/10 text-pink-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-pink-500 hover:text-white shrink-0 ml-4">✕</button>
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