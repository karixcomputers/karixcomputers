import React, { useState, useEffect } from "react";
import { apiFetch } from "../api/client";

export default function AdminConfigurator() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null); // 👉 NOU: Track pentru ID-ul editat
  
  const [formData, setFormData] = useState({
    category: "cpu",
    brand: "Intel", 
    name: "",
    spec: "",
    price: "0", 
    imageFile: null 
  });

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
    // Resetăm brand-ul doar dacă NU suntem în mod editare (ca să nu suprascriem datele vechi)
    if (!editingId) {
      if (formData.category === "cpu") {
        setFormData(prev => ({ ...prev, brand: "Intel" }));
      } else if (formData.category === "gpu") {
        setFormData(prev => ({ ...prev, brand: "Nvidia" }));
      } else {
        setFormData(prev => ({ ...prev, brand: "" }));
      }
    }
  }, [formData.category, editingId]);

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

  // 👉 NOU: Funcția pentru a intra în modul de editare
  const startEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      category: item.category,
      brand: item.brand || "",
      name: item.name,
      spec: item.spec || "",
      price: (item.price / 100).toString(),
      imageFile: null
    });
    if (item.image) {
      setImagePreview(`https://karixcomputers.ro/uploads/${item.image}`);
    } else {
      setImagePreview(null);
    }
    // Scroll sus la formular
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ category: "cpu", brand: "Intel", name: "", spec: "", price: "0", imageFile: null });
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const priceToSave = parseInt(formData.price || 0) * 100;

      const submitData = new FormData();
      submitData.append('category', formData.category);
      submitData.append('brand', formData.brand);
      submitData.append('name', formData.name);
      submitData.append('spec', formData.spec);
      submitData.append('price', priceToSave);
      
      if (formData.imageFile) {
        submitData.append('image', formData.imageFile);
      }

      // Dacă avem editingId folosim PUT/PATCH, altfel POST
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/adminconfigurator/${editingId}` : "/adminconfigurator";

      const res = await apiFetch(url, {
        method: method,
        body: submitData
      });

      if (res.ok) {
        const updatedItem = await res.json();
        if (editingId) {
          setItems(prev => prev.map(i => i.id === editingId ? updatedItem : i));
        } else {
          setItems(prev => [...prev, updatedItem]);
        }
        cancelEdit();
      } else {
         const errData = await res.json();
         alert("Eroare: " + errData.error);
      }
    } catch (err) { 
        alert("Eroare la salvare."); 
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
    case: "Carcase (Pentru Shop)", // 👉 Mutat sus
    cpu: "Procesoare", 
    gpu: "Plăci Video", 
    motherboard: "Plăci de Bază",
    ram: "Memorii RAM", 
    storage: "Stocare SSD", 
    cooler: "Coolere",
    psu: "Surse"
  };

  // 👉 NOU: Definim ordinea cheilor pentru a forța "case" să fie prima
  const orderedCategoryKeys = Object.keys(categories);

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 md:px-8 bg-transparent text-white relative max-w-6xl mx-auto">
      <h1 className="text-5xl font-black italic uppercase tracking-tighter drop-shadow-2xl mb-12 text-left">
        Admin <span className="text-indigo-400">Configurator</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className={`bg-white/5 border ${editingId ? 'border-amber-500/50' : 'border-white/10'} p-6 rounded-[30px] backdrop-blur-md space-y-4 shadow-xl sticky top-32 text-left transition-colors`}>
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 italic mb-6">
              {editingId ? "Editează Componentă" : "Adaugă Componentă"}
            </h3>
            
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-500">Categorie</label>
              <select 
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value})} 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs mt-1 outline-none text-white appearance-none"
              >
                {Object.entries(categories).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            {(formData.category === "cpu" || formData.brand === "Intel" || formData.brand === "AMD") && (
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500">Brand / Arhitectură</label>
                <select 
                  value={formData.brand} 
                  onChange={e => setFormData({...formData, brand: e.target.value})} 
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs mt-1 outline-none text-white"
                >
                  <option value="Intel">Intel / Nvidia</option>
                  <option value="AMD">AMD</option>
                  <option value="">Altul</option>
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

            <div className="pt-2">
                <label className="text-[10px] uppercase font-bold text-pink-400">Preț (RON)</label>
                <input 
                  required 
                  type="number" 
                  value={formData.price} 
                  onChange={e => setFormData({...formData, price: e.target.value})} 
                  placeholder="Ex: 300" 
                  className="w-full bg-pink-500/10 border border-pink-500/30 rounded-xl p-3 text-xs mt-1 outline-none text-white" 
                />
            </div>

            <div className="pt-2">
               <label className="text-[10px] uppercase font-bold text-emerald-400">Imagine (Copertă)</label>
               <input 
                 id="imageInput"
                 type="file" 
                 accept="image/*"
                 onChange={handleImageChange}
                 className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs mt-1 outline-none text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30 cursor-pointer"
               />
               {imagePreview && (
                 <div className="mt-3 relative h-32 w-full rounded-xl overflow-hidden border border-white/10 bg-black/40">
                   <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                 </div>
               )}
            </div>

            <div className="flex gap-2">
              <button disabled={isSubmitting} type="submit" className={`flex-1 py-4 mt-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${editingId ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
                {isSubmitting ? "Se salvează..." : (editingId ? "Salvează Modificări" : "Adaugă în Bază")}
              </button>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="py-4 mt-4 px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase hover:bg-white/10">✕</button>
              )}
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-10 text-left">
          {orderedCategoryKeys.map(cat => {
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
                    <div key={item.id} className={`p-4 rounded-2xl flex justify-between items-center group transition-all ${editingId === item.id ? 'ring-2 ring-amber-500 bg-amber-500/10' : (cat === 'case' ? 'bg-pink-500/5 border border-pink-500/20' : 'bg-white/[0.02] border border-white/10 hover:bg-white/[0.05]')}`}>
                      
                      <div className="flex items-center gap-4">
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
                              {item.price > 0 && (
                                  <span className="text-[9px] text-pink-400 font-bold bg-pink-500/10 px-2 py-0.5 rounded-full">+{item.price / 100} RON</span>
                              )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => startEdit(item)} className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center hover:bg-indigo-500 hover:text-white shrink-0">✏️</button>
                        <button onClick={() => handleDelete(item.id)} className="h-8 w-8 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center hover:bg-pink-500 hover:text-white shrink-0">✕</button>
                      </div>
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