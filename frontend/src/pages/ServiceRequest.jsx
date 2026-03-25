import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
// IMPORTĂM COMPONENTA SEO
import SEO from "../components/SEO";

const JUDETE = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani", "Brașov", "Brăila", "Buzău",
  "Caraș-Severin", "Călărași", "Cluj", "Constanța", "Covasna", "Dâmbovița", "Dolj", "Galați", "Giurgiu",
  "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov", "Maramureș", "Mehedinți", "Mureș",
  "Neamț", "Olt", "Prahova", "Satu Mare", "Sălaj", "Sibiu", "Suceava", "Teleorman", "Timiș", "Tulcea",
  "Vaslui", "Vâlcea", "Vrancea", "București"
].sort();

export default function ServiceRequest() {
  const { state } = useLocation();
  const navigate = useNavigate();
  
  const [method, setMethod] = useState("curier"); 
  const [isSubmitted, setIsSubmitted] = useState(false); 
  const [formData, setFormData] = useState({
    issueDescription: "",
    judet: "",
    oras: "",
    pickupAddress: "",
    phoneNumber: "",
    preferredDate: ""
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiFetch("/api/service-orders", {
        method: "POST",
        body: JSON.stringify({
          method: method,
          productName: state?.product || "Sistem Karix",
          orderId: state?.orderId,
          issueDescription: data.issueDescription,
          judet: method === "curier" ? data.judet : "Bihor",
          oras: method === "curier" ? data.oras : "Oradea",
          address: method === "curier" ? data.pickupAddress : "Predare Sediu",
          phoneNumber: data.phoneNumber,
          preferredDate: data.preferredDate
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Eroare la procesarea solicitării.");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  // --- ECRAN DE SUCCES STILIZAT ---
  if (isSubmitted) {
    return (
      <>
        <SEO title="Cerere Service Trimisă" description="Solicitarea ta pentru service a fost primită. Echipa Karix te va contacta în cel mai scurt timp." />
        <div className="min-h-screen pt-40 pb-20 px-4 flex items-start justify-center animate-in fade-in zoom-in duration-500">
          <div className="max-w-md w-full bg-[#0b1020]/90 border border-emerald-500/30 p-10 rounded-[40px] backdrop-blur-3xl text-center shadow-[0_0_50px_-12px_rgba(16,185,129,0.2)]">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
              ✨
            </div>
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4">Solicitare Primită!</h2>
            <p className="text-gray-400 italic text-sm mb-8 leading-relaxed">
              Echipa tehnică <span className="text-indigo-400 font-bold">Karix Computers</span> a preluat cererea ta. 
              Verificăm detaliile și te vom contacta în curând pentru procesarea garanției.
            </p>
            <div className="space-y-3">
              <Link 
                to="/account/warranties" 
                className="block w-full py-4 rounded-2xl bg-white text-[#0b1020] font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-xl"
              >
                Înapoi la Garanții
              </Link>
              <Link 
                to="/" 
                className="block w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-500 font-black uppercase text-[10px] tracking-widest hover:text-white transition-all"
              >
                Mergi la Pagina Principală
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO 
        title="Solicitare Service & Garanție" 
        description="PC-ul tău are nevoie de atenție? Solicită service profesional la Karix Computers Oradea. Oferim diagnosticare rapidă, reparații și ridicare de la domiciliu."
      />

      <div className="min-h-screen pt-32 pb-20 px-4 flex justify-center bg-transparent">
        <div className="max-w-2xl w-full relative z-10">
          <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-2 text-left drop-shadow-2xl">
            Solicitare <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600">Service</span>
          </h1>
          <p className="text-gray-400 text-sm mb-10 italic text-left border-l-2 border-indigo-500 pl-4">
            Solicitare reparație pentru: <strong>{state?.product || "Produs Karix"}</strong>
          </p>

          <form onSubmit={handleSubmit} className="space-y-6 bg-[#0b1020]/80 p-8 md:p-12 rounded-[40px] border border-white/10 backdrop-blur-3xl shadow-2xl text-left">
            
            {mutation.isError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-xs font-bold italic animate-in slide-in-from-top-2 text-center">
                ⚠️ Eroare: {mutation.error.message}
              </div>
            )}

            {/* SELECTOR METODĂ */}
            <div className="grid grid-cols-2 gap-4 p-1 bg-white/5 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setMethod("curier")}
                className={`py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${method === 'curier' ? 'bg-white text-[#0b1020] shadow-xl' : 'text-gray-500 hover:text-white'}`}
              >
                🚚 Curier Rapid
              </button>
              <button
                type="button"
                onClick={() => setMethod("oradea")}
                className={`py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${method === 'oradea' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'text-gray-500 hover:text-white'}`}
              >
                📍 Predare Oradea
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-2">Ce problemă are sistemul?</label>
              <textarea 
                required
                placeholder="Descrie pe scurt defectul..."
                className="w-full bg-white/5 border border-white/10 rounded-3xl px-6 py-5 text-white outline-none focus:border-indigo-500 transition-all min-h-[120px] resize-none shadow-inner italic font-medium"
                onChange={(e) => setFormData({...formData, issueDescription: e.target.value})}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-2">Telefon Contact</label>
                <input 
                  type="tel" required
                  placeholder="07xx xxx xxx"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition-all font-medium"
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-2">Data dorită</label>
                <input 
                  type="date" required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition-all [color-scheme:dark] font-medium"
                  onChange={(e) => setFormData({...formData, preferredDate: e.target.value})}
                />
              </div>
            </div>

            {/* CAMPURI DINAMICE CURIER */}
            {method === "curier" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-2">Județ</label>
                    <select 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer shadow-inner font-medium italic"
                      onChange={(e) => setFormData({...formData, judet: e.target.value})}
                    >
                      <option value="" className="bg-[#0b1020]">Alege Județul</option>
                      {JUDETE.map(j => <option key={j} value={j} className="bg-[#0b1020]">{j}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-2">Oraș</label>
                    <input 
                      type="text" required
                      placeholder="Ex: București"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition-all shadow-inner font-medium"
                      onChange={(e) => setFormData({...formData, oras: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-2">Adresa de ridicare (Strada, Nr, Detalii)</label>
                  <input 
                    type="text" required
                    placeholder="Ex: Str. Florilor Nr. 12, Bl. 3, Ap. 45"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition-all shadow-inner font-medium"
                    onChange={(e) => setFormData({...formData, pickupAddress: e.target.value})}
                  />
                </div>
              </div>
            )}

            {method === "oradea" && (
              <div className="p-8 rounded-[30px] bg-indigo-500/5 border border-indigo-500/20 text-indigo-300 text-sm italic animate-in zoom-in duration-300 flex items-center gap-4">
                <span className="text-3xl">📍</span>
                <p>Te așteptăm la sediul Karix din <strong>Oradea</strong> după confirmarea solicitării. Diagnosticarea se face pe loc sau în maxim 24h.</p>
              </div>
            )}

            <button 
              type="submit"
              disabled={mutation.isPending}
              className="w-full py-5 rounded-3xl bg-indigo-600 text-white font-black uppercase text-[11px] tracking-[0.4em] hover:bg-white hover:text-[#0b1020] transition-all shadow-2xl active:scale-95 italic disabled:opacity-50"
            >
              {mutation.isPending ? "Se procesează..." : "Trimite Solicitarea de Service →"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}