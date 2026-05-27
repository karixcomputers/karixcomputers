import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import { toast } from "react-hot-toast";

export default function AdminReturns() {
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("active");
  const [showAwbModal, setShowAwbModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [awbValue, setAwbValue] = useState("");
  const [reportingIssuesFor, setReportingIssuesFor] = useState(null);
  const [issueDescription, setIssueDescription] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [confirmRejectId, setConfirmRejectId] = useState(null);

  const { data: returns, isLoading } = useQuery({
    queryKey: ["adminReturns"],
    queryFn: async () => {
      // MODIFICAT: din "/api/returns/admin/all" în "/returns/admin/all"
      const res = await apiFetch("/returns/admin/all");
      return res.json();
    },
  });

  const activeReturns = returns?.filter(r => r.status !== 'completat' && r.status !== 'respins') || [];
  const historyReturns = returns?.filter(r => r.status === 'completat' || r.status === 'respins') || [];
  const currentReturns = activeTab === "active" ? activeReturns : historyReturns;

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }) => {
      // MODIFICAT: din "/api/returns/admin/${id}/status" în "/returns/admin/${id}/status"
      const res = await apiFetch(`/returns/admin/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Eroare la actualizare");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["adminReturns"]);
      toast.success("Status actualizat!");
      setConfirmRejectId(null);
    },
    onError: (err) => toast.error(err.message)
  });

  const reportIssuesMutation = useMutation({
    mutationFn: async ({ id, description, images }) => {
      const formData = new FormData();
      formData.append("description", description);
      images.forEach((img) => formData.append("images", img));

      // MODIFICAT: Folosim apiFetch direct. 
      // apiFetch din client.js este configurat să detecteze FormData și să nu pună header JSON.
      const res = await apiFetch(`/returns/admin/${id}/report-issues`, {
        method: "PATCH",
        body: formData,
      });

      if (!res.ok) throw new Error("Eroare la trimiterea raportului.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["adminReturns"]);
      toast.success("Raport trimis!");
      setReportingIssuesFor(null);
      setIssueDescription("");
      setSelectedImages([]);
    },
    onError: (err) => toast.error(err.message)
  });

  const sendAwbMutation = useMutation({
    mutationFn: async ({ id, awb }) => {
      // MODIFICAT: din "/api/returns/admin/${id}/send-awb" în "/returns/admin/${id}/send-awb"
      const res = await apiFetch(`/returns/admin/${id}/send-awb`, {
        method: "PATCH",
        body: JSON.stringify({ awb }),
      });
      if (!res.ok) throw new Error("Eroare la trimitere AWB.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["adminReturns"]);
      toast.success("AWB trimis!");
      closeAwbModal();
    },
    onError: (err) => toast.error(err.message)
  });

  const closeAwbModal = () => {
    setShowAwbModal(false);
    setSelectedReturn(null);
    setAwbValue("");
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'pending': return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
      case 'received_ok': return 'text-blue-400 border-blue-500/20 bg-blue-500/5';
      case 'received_issues': return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
      case 'completat': return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
      case 'respins': return 'text-rose-600 border-rose-600/20 bg-rose-600/10';
      default: return 'text-gray-400 border-white/10 bg-white/5';
    }
  };

  if (isLoading) return <div className="p-20 text-center text-white italic animate-pulse">Se încarcă...</div>;

  return (
    <div className="min-h-screen pt-20 pb-20 px-4 bg-transparent text-left relative z-10">
      <div className="max-w-7xl mx-auto">
        
        {confirmRejectId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setConfirmRejectId(null)}></div>
            <div className="bg-[#0b1020] border border-white/10 p-8 rounded-[40px] shadow-2xl relative z-10 max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">⚠️</div>
              <h3 className="text-white font-black text-xl italic uppercase mb-2">Respingi Returul?</h3>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">Această acțiune va notifica clientul prin e-mail că cererea de retur a fost refuzată.</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setConfirmRejectId(null)} className="flex-1 py-3 rounded-2xl bg-white/5 text-gray-400 font-bold text-xs uppercase hover:bg-white/10 transition-all">Anulează</button>
                <button type="button" onClick={() => updateStatus.mutate({ id: confirmRejectId, status: 'respins' })} className="flex-1 py-3 rounded-2xl bg-rose-600 text-white font-black text-xs uppercase hover:bg-rose-500 shadow-lg shadow-rose-600/20 transition-all">Da, Respinge</button>
              </div>
            </div>
          </div>
        )}

        {showAwbModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={closeAwbModal}></div>
            <div className="bg-[#0b1020] border border-white/10 p-10 rounded-[40px] shadow-2xl relative z-10 max-w-md w-full text-center animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
                <div className="text-4xl mb-6">🚚</div>
                <h2 className="text-2xl font-black text-white uppercase italic mb-2">Expediere Retur</h2>
                <p className="text-gray-400 text-xs mb-8">
                  Introdu AWB-ul de expediere pentru pachetul destinat lui <br/>
                  <span className="text-indigo-400 font-bold">{selectedReturn?.user?.name || selectedReturn?.titular}</span>.
                </p>
                <div className="space-y-4">
                   <input 
                    autoFocus
                    type="text"
                    placeholder="Introdu numărul AWB..."
                    value={awbValue}
                    onChange={(e) => setAwbValue(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white outline-none focus:border-indigo-500/50 transition-all font-mono text-sm tracking-widest placeholder:text-gray-600"
                  />
                  <div className="flex gap-3">
                    <button type="button" onClick={closeAwbModal} className="flex-1 py-4 rounded-2xl bg-white/5 text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/10">Anulează</button>
                    <button 
                      type="button"
                      disabled={!awbValue.trim() || sendAwbMutation.isPending}
                      onClick={() => sendAwbMutation.mutate({ id: selectedReturn.id, awb: awbValue })} 
                      className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 shadow-lg shadow-indigo-600/40 transition-all disabled:opacity-50"
                    >
                      {sendAwbMutation.isPending ? "Se trimite..." : "Confirmă & Trimite"}
                    </button>
                  </div>
                </div>
            </div>
          </div>
        )}

        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Gestiune <span className="text-rose-500">Retururi</span></h1>
            <div className="flex gap-4 mt-4">
              <button onClick={() => setActiveTab("active")} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-rose-500 text-white shadow-lg' : 'bg-white/5 text-gray-500 border border-white/10 hover:bg-white/10'}`}>⚡ Cereri Active ({activeReturns.length})</button>
              <button onClick={() => setActiveTab("history")} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-gray-500 border border-white/10 hover:bg-white/10'}`}>📜 Istoric Retururi ({historyReturns.length})</button>
            </div>
          </div>
        </header>

        <div className="grid gap-6">
          {currentReturns.length === 0 ? (
            <div className="p-20 border-2 border-dashed border-white/5 rounded-[40px] text-center"><p className="text-gray-600 italic">Nu există cereri în această secțiune.</p></div>
          ) : (
            currentReturns.map((req) => (
              <div key={req.id} className={`bg-[#0b1020]/80 border p-6 rounded-[35px] backdrop-blur-xl flex flex-col xl:flex-row justify-between gap-8 items-start xl:items-center transition-all ${activeTab === 'history' ? 'border-white/5 opacity-80' : 'border-white/10 hover:border-white/20'}`}>
                
                <div className="space-y-2 min-w-[200px]">
                  <div className="flex items-center gap-3">
                    <span className="text-rose-500 font-black text-xl italic">#{req.orderNumber}</span>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${getStatusStyle(req.status)}`}>{req.status.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <div className="text-white font-bold text-lg">{req.user?.name || req.titular}</div>
                    <div className="text-gray-500 text-xs italic">{req.user?.email}</div>
                    <div className="text-indigo-400 text-xs font-black mt-1">{req.phoneNumber}</div>
                  </div>
                </div>

                <div className="bg-white/5 p-5 rounded-[25px] border border-white/5 flex-1 w-full xl:w-auto">
                  <div className="text-[9px] font-black text-gray-500 uppercase mb-2 tracking-widest italic">Date Restituire</div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-mono text-indigo-400 font-black tracking-wider">{req.iban?.replace(/(.{4})/g, '$1 ') || "IBAN LIPSA"}</div>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(req.iban || ""); toast.success("IBAN Copiat!"); }} className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl hover:bg-indigo-500/20 transition-all">📋</button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 w-full xl:w-80 border-t xl:border-t-0 xl:border-l border-white/10 pt-6 xl:pt-0 xl:pl-8">
                  {reportingIssuesFor === req.id ? (
                    <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl space-y-3 relative z-20">
                      <textarea className="w-full bg-[#0b1020] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500/40 transition-all" placeholder="Descrie problemele constatate (ex: zgârieturi, accesorii lipsă)..." rows="3" value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} />
                      
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase font-black px-1">Dovezi Foto:</label>
                        <input type="file" multiple accept="image/*" onChange={(e) => setSelectedImages(Array.from(e.target.files))} className="block w-full text-[10px] text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20 cursor-pointer"/>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button type="button" onClick={() => setReportingIssuesFor(null)} className="flex-1 py-2 text-[9px] font-black uppercase text-gray-500 hover:text-white transition-all">Anulează</button>
                        <button 
                          type="button"
                          disabled={reportIssuesMutation.isPending || !issueDescription.trim()}
                          onClick={() => reportIssuesMutation.mutate({ id: req.id, description: issueDescription, images: selectedImages })} 
                          className="flex-[2] bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {reportIssuesMutation.isPending ? "Se trimite..." : "Trimite Raport"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {activeTab === "active" && (
                        <>
                          {req.status === 'pending' && (
                            <>
                              <button type="button" onClick={() => updateStatus.mutate({ id: req.id, status: 'received_ok' })} className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-[9px] uppercase rounded-xl transition-all">📦 OK</button>
                              <button type="button" onClick={() => setReportingIssuesFor(req.id)} className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white font-black text-[9px] uppercase rounded-xl transition-all">⚠️ Probleme</button>
                            </>
                          )}
                          <button 
                            type="button"
                            disabled={updateStatus.isPending}
                            onClick={() => updateStatus.mutate({ id: req.id, status: 'completat' })}
                            className={`flex-1 px-4 py-3 font-black text-[9px] uppercase rounded-xl transition-all ${req.status === 'received_ok' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 text-gray-500 border border-white/10'}`}
                          >💰 Plătește</button>
                          <button type="button" onClick={() => setConfirmRejectId(req.id)} className="px-4 py-3 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all">✕</button>
                        </>
                      )}

                      {activeTab === "history" && (
                        <div className="w-full space-y-2">
                          <div className={`w-full py-3 px-4 rounded-xl text-center text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(req.status)}`}>
                            {req.status === 'completat' ? '✓ Tranzacție Finalizată' : '✕ Cerere Respinsă'}
                          </div>
                          {req.status === 'respins' && (
                             <button 
                               type="button"
                               onClick={() => { setSelectedReturn(req); setAwbValue(req.returnAwb || ""); setShowAwbModal(true); }} 
                               className="w-full py-2 bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase rounded-xl border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
                             >
                               🚚 {req.returnAwb ? `AWB: ${req.returnAwb}` : "Trimite AWB înapoi"}
                             </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}