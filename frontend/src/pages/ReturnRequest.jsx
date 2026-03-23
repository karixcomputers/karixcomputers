import React, { useState, useMemo } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";

/**
 * LISTA OFICIALĂ A JUDEȚELOR DIN ROMÂNIA
 */
const JUDETE_ROMANIA = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani", "Brașov", "Brăila", "Buzău", 
  "Caraș-Severin", "Călărași", "Cluj", "Constanța", "Covasna", "Dâmbovița", "Dolj", "Galați", "Giurgiu", 
  "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov", "Maramureș", "Mehedinți", "Mureș", "Neamț", 
  "Olt", "Prahova", "Satu Mare", "Sălaj", "Sibiu", "Suceava", "Teleorman", "Timiș", "Tulcea", "Vaslui", 
  "Vâlcea", "Vrancea", "București"
].sort();

export default function ReturnRequest() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const order = state?.order;
  const orderRef = order ? String(order.id).slice(-8).toUpperCase() : "";

  /**
   * 1. LOGICA PENTRU RETURURI PARȚIALE
   */
  const alreadyReturnedItemNames = useMemo(() => {
    if (!order?.returnRequests) return [];
    return order.returnRequests.flatMap(req => req.returnedItems || []);
  }, [order]);

  /**
   * 2. FILTRARE PRODUSE FIZICE
   */
  const returnableItems = useMemo(() => {
    if (!order?.items) return [];
    const serviceKeywords = ['service', 'mentenanta', 'curatare', 'reparatie', 'montaj', 'diagnosticare', 'upgrade'];
    
    return order.items.filter(item => {
      const name = item.productName.toLowerCase();
      return !serviceKeywords.some(kw => name.includes(kw));
    });
  }, [order]);

  /**
   * 3. STATE FORMULAR
   */
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]); 
  const [formData, setFormData] = useState({
    method: "curier", // "curier" | "personal"
    reason: "",
    iban: "",
    titular: "",
    phoneNumber: order?.shippingPhone || "",
    judet: "",
    oras: "",
    strada: order?.shippingAddress || "",
    comments: ""
  });

  // Funcție pentru schimbarea metodei (Dacă e personal, forțăm Oradea/Bihor)
  const handleMethodChange = (m) => {
    if (m === 'personal') {
      setFormData({
        ...formData,
        method: 'personal',
        judet: 'Bihor',
        oras: 'Oradea'
      });
    } else {
      setFormData({
        ...formData,
        method: 'curier',
        judet: '',
        oras: ''
      });
    }
  };

  const toggleItem = (productName) => {
    if (alreadyReturnedItemNames.includes(productName)) return;

    setSelectedItems(prev => 
      prev.includes(productName) 
        ? prev.filter(i => i !== productName) 
        : [...prev, productName]
    );
  };

  /**
   * 4. MUTAȚIE TRIMITERE DATE
   */
  const mutation = useMutation({
    mutationFn: async (data) => {
      const pickupAddressFull = `${data.judet}, ${data.oras}, ${data.strada}`;
      const methodLabel = data.method === 'personal' ? 'RIDICARE PERSONALĂ ORADEA' : 'CURIER STANDARD';
      
      const res = await apiFetch("/api/returns", {
        method: "POST",
        body: JSON.stringify({
          orderId: order?.id,
          orderNumber: orderRef,
          selectedItems,
          pickupAddress: pickupAddressFull,
          comments: `[METODĂ: ${methodLabel}] | ${data.comments}`,
          ...data
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Eroare la procesarea cererii.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["myOrders"]); 
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) return; 
    mutation.mutate(formData);
  };

  /**
   * ECRAN SUCCES
   */
  if (isSubmitted) {
    return (
      <div className="min-h-screen pt-40 pb-20 px-4 flex items-start justify-center animate-in fade-in zoom-in duration-500">
        <div className="max-w-md w-full bg-[#0b1020]/90 border border-rose-500/30 p-10 rounded-[40px] backdrop-blur-3xl text-center shadow-2xl">
          <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
            {formData.method === 'personal' ? '🚗' : '📦'}
          </div>
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4">Solicitare Primisă!</h2>
          <p className="text-gray-400 italic text-sm mb-8 leading-relaxed">
            {formData.method === 'personal' 
              ? `Echipa Karix va veni personal la adresa indicată din Oradea pentru a ridica produsele.` 
              : `Cererea a fost înregistrată. Un curier va fi trimis la adresa din ${formData.oras}, ${formData.judet}.`}
          </p>
          <Link to="/orders" className="block w-full py-4 rounded-2xl bg-white text-[#0b1020] font-black uppercase text-[10px] tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-xl">
            Înapoi la Comenzi
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen pt-40 text-center text-white font-black italic uppercase tracking-widest opacity-40">
        <p className="mb-4">Nicio comandă selectată.</p>
        <Link to="/orders" className="text-rose-500 hover:underline">Comenzile mele</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 flex justify-center bg-transparent">
      <div className="max-w-3xl w-full relative z-10">
        
        <header className="mb-10 text-left">
          <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-2 drop-shadow-2xl">
            Configurare <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-rose-600">Retur</span>
          </h1>
          <p className="text-gray-400 text-sm italic border-l-2 border-rose-500 pl-4">
            Inițiere procedură pentru comanda <strong className="text-white">#{orderRef}</strong>
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8 bg-[#0b1020]/80 p-8 md:p-14 rounded-[50px] border border-white/10 backdrop-blur-3xl shadow-2xl text-left">
          
          {mutation.isError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-xs font-bold italic">
              ⚠️ {mutation.error.message}
            </div>
          )}

          {/* --- SECȚIUNEA 1: PRODUSE --- */}
          <section className="space-y-6">
            <header className="flex items-center gap-4 mb-4">
               <span className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-500 font-black text-xs italic">01</span>
               <label className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">Selectează produsele pentru retur</label>
            </header>
            
            <div className="grid gap-3">
              {returnableItems.length > 0 ? (
                returnableItems.map(item => {
                  const isAlreadyReturned = alreadyReturnedItemNames.includes(item.productName);

                  return (
                    <div 
                      key={item.id}
                      onClick={() => !isAlreadyReturned && toggleItem(item.productName)}
                      className={`group relative p-6 rounded-[25px] border transition-all flex items-center justify-between ${
                        isAlreadyReturned 
                          ? 'opacity-30 cursor-not-allowed border-white/5 bg-white/[0.02]' 
                          : selectedItems.includes(item.productName) 
                            ? 'bg-rose-500/10 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.15)] cursor-pointer' 
                            : 'bg-white/5 border-white/10 hover:border-white/20 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-5">
                        <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${
                          isAlreadyReturned ? 'bg-gray-800 border-gray-700' :
                          selectedItems.includes(item.productName) ? 'bg-rose-500 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 'border-white/10'
                        }`}>
                          {selectedItems.includes(item.productName) && !isAlreadyReturned && <span className="text-white text-[10px] font-black">✓</span>}
                          {isAlreadyReturned && <span className="text-gray-500 text-[10px]">✕</span>}
                        </div>
                        <div>
                          <div className={`text-base font-black uppercase tracking-tight italic ${isAlreadyReturned ? 'text-gray-500 line-through' : 'text-white'}`}>
                            {item.productName}
                          </div>
                          <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-1">
                            {isAlreadyReturned ? "Indisponibil (deja solicitat)" : `Cantitate: ${item.qty}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-10 text-center bg-rose-500/5 border border-rose-500/10 rounded-[30px]">
                  <p className="text-rose-500 text-xs font-black uppercase italic tracking-widest">
                    Nu există produse fizice returnabile.
                  </p>
                </div>
              )}
            </div>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-10" />

          {/* --- SECȚIUNEA 2: LOCAȚIE RIDICARE --- */}
          <section className={`space-y-6 transition-all duration-500 ${selectedItems.length === 0 ? "opacity-20 pointer-events-none blur-[2px]" : "opacity-100"}`}>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
               <div className="flex items-center gap-4">
                  <span className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-xs italic">02</span>
                  <label className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">Locație ridicare colet</label>
               </div>
               
               {/* TOGGLE METODĂ RIDICARE */}
               <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                  <button 
                    type="button"
                    onClick={() => handleMethodChange('curier')}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.method === 'curier' ? 'bg-indigo-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Curier
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleMethodChange('personal')}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.method === 'personal' ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Ridicare Personală Oradea
                  </button>
               </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* JUDEȚ */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-4">Județ</label>
                <select 
                  required={selectedItems.length > 0}
                  value={formData.judet}
                  disabled={formData.method === 'personal'}
                  className={`w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer text-sm font-bold italic ${formData.method === 'personal' ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                  onChange={(e) => setFormData({...formData, judet: e.target.value})}
                >
                  <option value="" className="bg-[#0b1020]">Selectează județul</option>
                  {JUDETE_ROMANIA.map(j => (
                    <option key={j} value={j} className="bg-[#0b1020]">{j}</option>
                  ))}
                </select>
              </div>

              {/* ORAȘ */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-4">Oraș / Localitate</label>
                <input 
                  type="text" 
                  required={selectedItems.length > 0}
                  disabled={formData.method === 'personal'}
                  placeholder="Ex: Oradea"
                  value={formData.oras}
                  className={`w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition-all text-sm font-bold italic ${formData.method === 'personal' ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                  onChange={(e) => setFormData({...formData, oras: e.target.value})}
                />
              </div>

              {/* STRADA ȘI NR */}
              <div className="md:col-span-2 space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-4">Adresă detaliată (Stradă, Nr, Bloc, Scara, Ap)</label>
                <textarea 
                  required={selectedItems.length > 0}
                  placeholder="Introdu adresa completă pentru ridicare..."
                  value={formData.strada}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white outline-none focus:border-indigo-500 transition-all text-sm font-bold italic min-h-[100px] resize-none"
                  onChange={(e) => setFormData({...formData, strada: e.target.value})}
                />
              </div>
            </div>

            {formData.method === 'personal' && (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl animate-in slide-in-from-top-2">
                <p className="text-[10px] text-emerald-400 font-bold italic text-center uppercase tracking-widest">
                   ⚡ Opțiune Premium Oradea: Vom veni personal să ridicăm pachetul.
                </p>
              </div>
            )}
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-10" />

          {/* --- SECȚIUNEA 3: DETALII FINANCIARE ȘI MOTIV --- */}
          <section className={`space-y-8 transition-all duration-700 ${selectedItems.length === 0 ? "opacity-20 pointer-events-none blur-[2px]" : "opacity-100"}`}>
            <header className="flex items-center gap-4 mb-6">
               <span className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xs italic">03</span>
               <label className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">Informații rambursare</label>
            </header>

            <div className="space-y-6">
              {/* MOTIV */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-4">Motivul Returului</label>
                <select 
                  required={selectedItems.length > 0}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-rose-500 transition-all appearance-none cursor-pointer text-sm font-bold italic"
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                >
                  <option value="" className="bg-[#0b1020]">Alege un motiv</option>
                  <option value="m_am_razgandit" className="bg-[#0b1020]">M-am răzgândit / Nu mai doresc produsul</option>
                  <option value="produs_defect" className="bg-[#0b1020]">Produsul a ajuns defect / nefuncțional</option>
                  <option value="produs_gresit" className="bg-[#0b1020]">Am primit alt produs decât cel comandat</option>
                  <option value="nu_corespunde_descrierii" className="bg-[#0b1020]">Produsul nu corespunde descrierii</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* IBAN */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-4">Cont IBAN (Pentru restituire)</label>
                  <input 
                    type="text" required={selectedItems.length > 0}
                    placeholder="RO00 XXXX XXXX XXXX XXXX XXXX"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-rose-500 transition-all font-mono text-xs uppercase font-bold tracking-widest"
                    onChange={(e) => setFormData({...formData, iban: e.target.value})}
                  />
                </div>

                {/* TITULAR */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-4">Titular Cont</label>
                  <input 
                    type="text" required={selectedItems.length > 0}
                    placeholder="Nume Prenume"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-rose-500 transition-all text-sm font-bold italic"
                    onChange={(e) => setFormData({...formData, titular: e.target.value})}
                  />
                </div>
              </div>

              {/* COMENTARII */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-4">Comentarii Suplimentare (Opțional)</label>
                <textarea 
                  placeholder="Dorești să ne mai spui ceva despre starea produsului?"
                  className="w-full bg-white/5 border border-white/10 rounded-[25px] px-6 py-5 text-white outline-none focus:border-rose-500 transition-all min-h-[100px] resize-none text-sm font-medium"
                  onChange={(e) => setFormData({...formData, comments: e.target.value})}
                />
              </div>
            </div>
          </section>

          {/* FOOTER ACȚIUNE */}
          <div className="pt-10 flex flex-col gap-6">
            <div className="p-6 rounded-[30px] bg-rose-500/5 border border-rose-500/10 text-rose-300 text-[10px] italic leading-relaxed text-center font-medium">
              Atenție: Rambursarea se efectuează exclusiv pentru componentele hardware returnate intacte.
            </div>

            <button 
              type="submit"
              disabled={mutation.isPending || selectedItems.length === 0}
              className="group relative w-full py-6 rounded-[25px] bg-rose-600 text-white font-black uppercase text-xs tracking-[0.4em] hover:bg-white hover:text-[#0b1020] transition-all duration-500 shadow-[0_15px_30px_rgba(244,63,94,0.3)] active:scale-[0.98] italic disabled:opacity-20 disabled:grayscale"
            >
              {mutation.isPending ? "Se procesează datele..." : "Trimite Solicitarea Karix →"}
              <div className="absolute inset-0 rounded-[25px] bg-white opacity-0 group-hover:opacity-10 blur-xl transition-opacity" />
            </button>

            {selectedItems.length === 0 && (
              <p className="text-center text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse italic">
                * Selectează produsele pentru a debloca configuratorul
              </p>
            )}
          </div>

        </form>
      </div>
    </div>
  );
}