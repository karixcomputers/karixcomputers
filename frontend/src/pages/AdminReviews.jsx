import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active"); // "active" sau "deleted"
  
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });
  const [statusModal, setStatusModal] = useState({ show: false, message: "" });
  
  // NOU: State pentru afișarea pozelor din review-uri în mod Fullscreen (pentru admin)
  const [fullscreenImage, setFullscreenImage] = useState(null);

  const fetchReviews = async () => {
    try {
      // MODIFICAT: din "/api/reviews" în "/reviews"
      const res = await apiFetch("/reviews");
      if (res.ok) setReviews(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, []);

  const handleSoftDelete = async () => {
    const id = deleteConfirm.id;
    setDeleteConfirm({ show: false, id: null });
    try {
      // MODIFICAT: din "/api/reviews/${id}" în "/reviews/${id}"
      const res = await apiFetch(`/reviews/${id}`, { method: "DELETE" });
      if (res.ok) {
        setReviews(prev => prev.map(r => r.id === id ? { ...r, isDeleted: true } : r));
        setStatusModal({ show: true, message: "Review mutat în istoric." });
      }
    } catch (err) { alert("Eroare la procesare."); }
  };

  const handleRestore = async (id) => {
    try {
      // MODIFICAT: din "/api/reviews/${id}/restore" în "/reviews/${id}/restore"
      const res = await apiFetch(`/reviews/${id}/restore`, { method: "PATCH" });
      if (res.ok) {
        setReviews(prev => prev.map(r => r.id === id ? { ...r, isDeleted: false } : r));
        setStatusModal({ show: true, message: "Review restaurat pe site!" });
      }
    } catch (err) { alert("Eroare la restaurare."); }
  };

  const filteredReviews = reviews.filter(r => activeTab === "active" ? !r.isDeleted : r.isDeleted);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-transparent"><div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 md:px-8 bg-transparent text-white relative">
      <div className="max-w-6xl mx-auto relative z-10">
        
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter drop-shadow-2xl">
            <span className="text-indigo-400">Review-uri</span>
            </h1>
          </div>
          <div className="flex gap-2 p-1.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
            <button 
              onClick={() => setActiveTab("active")}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "active" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
            >
              Active
            </button>
            <button 
              onClick={() => setActiveTab("deleted")}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "deleted" ? "bg-pink-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
            >
              Istoric Șterse
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4">
          {filteredReviews.length > 0 ? filteredReviews.map((r) => (
            <div key={r.id} className={`group p-6 md:p-8 rounded-[35px] border transition-all shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 backdrop-blur-md ${r.isDeleted ? 'border-white/5 bg-white/[0.02] grayscale-[0.5]' : 'border-white/10 bg-white/5 hover:border-indigo-500/30'}`}>
              
              <div className="flex-1 space-y-4 w-full">
                <div className="flex flex-wrap items-center gap-4">
                   <div className="flex gap-1 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                     {[...Array(5)].map((_, star) => (
                       <span key={star} className={`text-[10px] ${star < r.rating ? "text-yellow-500" : "text-white/10"}`}>★</span>
                     ))}
                   </div>
                   <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic">{r.user?.name}</span>
                   <span className="text-[10px] text-gray-500 font-bold uppercase">Produs: {r.product?.name}</span>
                   {r.isDeleted && <span className="text-[8px] bg-pink-500/20 text-pink-500 px-2 py-1 rounded-md font-black uppercase">Arhivat</span>}
                </div>
                
                <p className={`italic text-sm leading-relaxed ${r.isDeleted ? 'text-gray-500' : 'text-gray-300'}`}>"{r.comment}"</p>
                
                {r.images && r.images.length > 0 && (
                  <div className="flex gap-3 pt-2 overflow-x-auto no-scrollbar">
                    {r.images.map((imgUrl, imgIdx) => (
                      <img 
                        key={imgIdx} 
                        src={imgUrl} 
                        alt={`Review Image ${imgIdx + 1}`} 
                        className="h-16 w-16 md:h-20 md:w-20 rounded-xl md:rounded-2xl object-cover border border-white/10 shrink-0 cursor-pointer hover:opacity-80 transition-opacity" 
                        onClick={() => setFullscreenImage(imgUrl)}
                        title="Apasă pentru mărire"
                      />
                    ))}
                  </div>
                )}

                <div className="text-[9px] text-gray-600 uppercase font-black tracking-tighter pt-2">
                  {new Date(r.createdAt).toLocaleDateString('ro-RO')} | ID #{r.id}
                </div>
              </div>

              <div className="flex gap-3 shrink-0 w-full md:w-auto justify-end">
                {r.isDeleted ? (
                  <button 
                    onClick={() => handleRestore(r.id)}
                    className="px-6 py-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest"
                  >
                    Restaurare
                  </button>
                ) : (
                  <button 
                    onClick={() => setDeleteConfirm({ show: true, id: r.id })}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-pink-500/10 text-pink-500 border border-pink-500/20 hover:bg-pink-500 hover:text-white transition-all shadow-lg"
                    title="Mută în istoric / Șterge"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )) : (
            <div className="p-20 rounded-[40px] border border-dashed border-white/10 text-center bg-white/[0.02]">
               <p className="text-gray-500 italic uppercase font-black">
                 {activeTab === "active" ? "Niciun review activ." : "Istoricul este gol."}
               </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL ȘTERGERE */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 backdrop-blur-xl bg-black/60">
          <div className="relative w-full max-w-sm bg-[#161e31]/95 border border-pink-500/30 p-10 rounded-[40px] text-center shadow-2xl animate-in zoom-in">
            <h2 className="text-2xl font-black text-white mb-3 italic uppercase">Arhivare</h2>
            <p className="text-gray-400 text-xs mb-8 uppercase font-bold italic">Mutăm acest review în istoric? Nu va mai fi vizibil pentru clienți.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteConfirm({ show: false, id: null })} className="flex-1 py-4 rounded-2xl font-black text-gray-400 bg-white/5 uppercase text-[10px]">Anulează</button>
              <button onClick={handleSoftDelete} className="flex-1 py-4 rounded-2xl font-black text-white bg-pink-600 hover:bg-pink-500 uppercase text-[10px]">Arhivează</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL STATUS */}
      {statusModal.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 backdrop-blur-xl bg-black/40">
          <div className="w-full max-w-xs p-10 rounded-[40px] bg-indigo-950/90 border border-indigo-500/30 text-center shadow-2xl border">
            <p className="text-white font-bold text-sm mb-8 italic uppercase tracking-wider">{statusModal.message}</p>
            <button onClick={() => setStatusModal({ show: false, message: "" })} className="w-full py-4 rounded-2xl font-black text-white bg-white/10 uppercase text-[10px]">Ok</button>
          </div>
        </div>
      )}

      {/* MODAL FULLSCREEN POZE REVIEW */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setFullscreenImage(null)}
        >
          <button 
            className="absolute top-6 right-6 h-12 w-12 flex items-center justify-center rounded-2xl bg-white/5 text-gray-400 hover:text-white hover:bg-rose-500 border border-white/10 transition-all z-10 text-xl"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreenImage(null);
            }}
          >
            ✕
          </button>
          <img 
            src={fullscreenImage} 
            alt="Review Fullscreen Admin" 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

    </div>
  );
}