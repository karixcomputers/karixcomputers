import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";

export default function Tickets() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Stare pentru notificarea personalizată (Toast)
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" });

  // Form state
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Hardware");
  const [message, setMessage] = useState("");

  // Funcție pentru afișarea notificării
  const showToast = (msg, type = "success") => {
    setNotification({ show: true, message: msg, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "success" }), 4000);
  };

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: async () => {
      const res = await apiFetch("/tickets/my-tickets");
      if (!res.ok) throw new Error("Eroare la încărcarea tichetelor.");
      return res.json();
    }
  });

  const createTicketMutation = useMutation({
    mutationFn: async (newTicket) => {
      const res = await apiFetch("/tickets", {
        method: "POST",
        body: JSON.stringify(newTicket),
      });
      if (!res.ok) throw new Error("Nu s-a putut trimite tichetul.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["my-tickets"]);
      setIsModalOpen(false);
      setSubject("");
      setCategory("Hardware");
      setMessage("");
      showToast("Tichetul a fost deschis cu succes!");
    },
    onError: (err) => {
      showToast(err.message, "error");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      return showToast("Te rugăm să completezi toate câmpurile.", "error");
    }
    
    createTicketMutation.mutate({
      subject,
      category,
      message,
      priority: "normal"
    });
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "deschis": return "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
      case "in_lucru": return "text-amber-400 border-amber-500/20 bg-amber-500/5";
      case "inchis": return "text-gray-500 border-white/10 bg-white/5";
      default: return "text-white border-white/10";
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-transparent text-left">
      
      {/* NOTIFICARE CUSTOM (TOAST) */}
      <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[200] transition-all duration-500 transform ${notification.show ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}>
        <div className={`px-8 py-4 rounded-[20px] backdrop-blur-2xl border flex items-center gap-4 shadow-2xl ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
          <span className="text-xl">{notification.type === 'success' ? '✅' : '⚠️'}</span>
          <span className="text-[11px] font-black uppercase tracking-widest">{notification.message}</span>
        </div>
      </div>

      <div className="absolute top-1/4 -right-20 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <h1 className="text-5xl font-black text-white tracking-tighter mb-2 italic drop-shadow-2xl">
              Tichete <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Suport</span>
            </h1>
            <p className="text-gray-400 font-medium italic drop-shadow-md">Centrul de asistență tehnică Karix Computers.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-4 rounded-2xl bg-white text-[#0b1020] font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-xl active:scale-95"
          >
            + Deschide Tichet Nou
          </button>
        </header>

        {/* Lista de tichete */}
        <div className="space-y-6">
          {isLoading ? (
             <div className="flex justify-center py-20 text-white font-black uppercase tracking-[0.5em] text-[10px] animate-pulse italic">Încărcăm tichetele...</div>
          ) : tickets.length === 0 ? (
            <div className="p-20 rounded-[45px] bg-white/5 border border-white/10 backdrop-blur-xl text-center shadow-2xl border-dashed">
              <div className="text-5xl mb-6 opacity-20 italic">Ticket Empty</div>
              <p className="text-gray-500 font-bold italic uppercase tracking-widest text-sm">Nu ai niciun tichet activ.</p>
            </div>
          ) : (
            tickets.map((t) => (
              <Link key={t.id} to={`/tickets/${t.id}`} className="group block p-[1px] rounded-[35px] bg-gradient-to-br from-white/10 to-transparent hover:from-indigo-500/30 transition-all duration-500">
                <div className="p-8 rounded-[34px] bg-[#0b1020]/70 backdrop-blur-3xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🎫</div>
                    <div>
                      <h3 className="text-xl font-black text-white italic uppercase tracking-tight">{t.subject}</h3>
                      <div className="flex gap-4 mt-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">#{t.id}</span>
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest italic">{t.category}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8 justify-between md:justify-end">
                    {/* DATA REINTROPUSA AICI */}
                    <div className="hidden md:block text-right">
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Creat la</p>
                      <p className="text-xs font-bold text-gray-400">{new Date(t.createdAt).toLocaleDateString('ro-RO')}</p>
                    </div>
                    
                    <span className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${getStatusStyle(t.status)}`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* MODAL CREARE TICHET */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
          <div className="bg-[#0f172a] border border-white/10 p-8 md:p-10 rounded-[40px] max-w-lg w-full shadow-2xl animate-in zoom-in duration-300 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/10 blur-3xl rounded-full"></div>
            <h2 className="text-3xl font-black text-white uppercase italic mb-2 relative z-10">Tichet Nou</h2>
            <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-8 relative z-10">Explică-ne cu ce te putem ajuta</p>
            
            <form onSubmit={handleSubmit} className="space-y-4 text-left relative z-10">
              <div>
                <label className="text-[10px] font-black text-indigo-400 uppercase ml-2 mb-1 block">Subiect</label>
                <input 
                  type="text" 
                  value={subject}
                  required
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-indigo-500 transition-all"
                  placeholder="Ex: Problemă temperatură..." 
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-indigo-400 uppercase ml-2 mb-1 block">Categorie</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#111827] border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-indigo-500 transition-all cursor-pointer"
                >
                  <option value="Hardware">💻 Hardware / PC</option>
                  <option value="Software">💿 Software / Drivere</option>
                  <option value="Garantie">🛡️ Garanție</option>
                  <option value="Altele">❓ Altele</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-indigo-400 uppercase ml-2 mb-1 block">Mesaj Detaliat</label>
                <textarea 
                  rows="4"
                  value={message}
                  required
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-indigo-500 transition-all resize-none"
                  placeholder="Descrie problema ta aici..."
                ></textarea>
              </div>
              <div className="flex gap-4 mt-10">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-gray-500 font-black uppercase text-[10px] hover:text-white transition-colors tracking-widest">Anulare</button>
                <button 
                  type="submit" 
                  disabled={createTicketMutation.isPending}
                  className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase text-[10px] shadow-xl hover:bg-indigo-500 transition-all italic active:scale-95 disabled:opacity-50"
                >
                  {createTicketMutation.isPending ? "Se trimite..." : "Trimite Tichet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}