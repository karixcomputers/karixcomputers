import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/tickets/${id}`);
      if (!res.ok) throw new Error("Nu am putut încărca conversația.");
      return res.json();
    },
    refetchInterval: 5000, 
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (formData) => {
      // Folosim apiFetch dar avem grijă la headers
      const res = await apiFetch(`/api/tickets/${id}/messages`, {
        method: "POST",
        // Trimitem formData direct. apiFetch-ul tău trebuie să fie apelat 
        // astfel încât să NU adauge "Content-Type: application/json"
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Eroare la trimitere.");
      }
      return res.json();
    },
    onSuccess: () => {
      setNewMessage("");
      setSelectedFile(null);
      setPreviewUrl(null);
      queryClient.invalidateQueries(["ticket", id]);
    },
    onError: (err) => {
      alert("Eroare: " + err.message);
    }
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ticket?.messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || sendMessageMutation.isPending) return;

    const formData = new FormData();
    // Adăugăm textul - chiar dacă e gol, backend-ul îl procesează
    formData.append("text", newMessage.trim());
    if (selectedFile) {
      formData.append("image", selectedFile);
    }

    sendMessageMutation.mutate(formData);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-white italic animate-pulse">Karix Support - Se încarcă...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-rose-500">{error.message}</div>;

  return (
    <div className="min-h-screen pt-32 pb-10 px-4 relative bg-transparent flex flex-col items-center">
      <div className="max-w-4xl w-full flex flex-col h-[75vh] relative z-10 text-left">
        
        {/* HEADER */}
        <header className="flex justify-between items-center mb-6 bg-[#0b1020]/80 p-6 rounded-[30px] border border-white/10 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link to="/tickets" className="text-gray-500 hover:text-white transition-all text-xl">←</Link>
              <h1 className="text-xl font-black text-white italic uppercase tracking-tight">{ticket.subject}</h1>
            </div>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-8">
              #TICHET {ticket.id} • Karix Computers
            </p>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${ticket.status === 'inchis' ? 'border-white/10 text-gray-500' : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'}`}>
            {ticket.status}
          </div>
        </header>

        {/* CHAT BOX */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar mb-6 px-2">
          {ticket.messages.map((msg) => {
            const isAdminMsg = msg.senderRole === 'admin';
            // Preluăm IP-ul tău corect din consolă pentru a afișa pozele
            const baseUrl = "http://192.168.0.162:4000";
            const imageUrl = msg.image ? `${baseUrl}${msg.image}` : null;

            return (
              <div key={msg.id} className={`flex ${isAdminMsg ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[75%] p-5 rounded-[25px] shadow-2xl border ${
                  isAdminMsg 
                    ? 'bg-indigo-600 text-white rounded-tl-none border-indigo-400/30' 
                    : 'bg-white/10 text-gray-100 rounded-tr-none border-white/10 backdrop-blur-md'
                }`}>
                  <div className="flex justify-between items-center gap-4 mb-3">
                    <span className="text-[9px] font-black uppercase tracking-tighter opacity-60">
                      {isAdminMsg ? "🛡️ Suport Karix" : "👤 Tu"}
                    </span>
                    <span className="text-[8px] opacity-40">
                      {new Date(msg.createdAt).toLocaleTimeString('ro-RO')}
                    </span>
                  </div>

                  {msg.image && (
                    <div className="mb-3 overflow-hidden rounded-xl border border-black/20">
                      <a href={imageUrl} target="_blank" rel="noreferrer">
                        <img 
                          src={imageUrl} 
                          alt="Atasament" 
                          className="w-full h-auto max-h-80 object-cover hover:scale-105 transition-all duration-500 cursor-zoom-in"
                        />
                      </a>
                    </div>
                  )}

                  {msg.text && <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {/* FOOTER INPUT */}
        {ticket.status !== 'inchis' ? (
          <div className="space-y-4">
            {previewUrl && (
              <div className="relative inline-block ml-8 animate-in zoom-in duration-200">
                <img src={previewUrl} className="h-20 w-20 object-cover rounded-2xl border-2 border-indigo-500 shadow-2xl" alt="Preview" />
                <button 
                  onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                  className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg"
                >✕</button>
              </div>
            )}

            <form onSubmit={handleSend} className="relative flex items-center gap-3">
              <div className="flex-1 relative group">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Răspunde..."
                  className="w-full bg-[#0b1020]/50 border border-white/10 rounded-[30px] px-8 py-5 pr-28 text-white font-medium outline-none focus:border-indigo-500/50 backdrop-blur-3xl transition-all shadow-2xl resize-none"
                  rows="1"
                  onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                />
                
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current.click()}
                      className={`p-2 rounded-full transition-all ${selectedFile ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-400 hover:text-white'}`}
                    >
                      <span className="text-xl">📎</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

                    <button 
                      type="submit"
                      disabled={sendMessageMutation.isPending}
                      className="h-11 w-11 bg-white text-[#0b1020] rounded-full font-black flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all active:scale-90 shadow-xl"
                    >
                      {sendMessageMutation.isPending ? "..." : "↑"}
                    </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="p-8 rounded-[35px] bg-white/5 border border-white/10 text-center backdrop-blur-md shadow-2xl">
            <p className="text-gray-500 font-black uppercase text-[10px] tracking-[0.4em] italic">Discuție Închisă</p>
          </div>
        )}
      </div>
    </div>
  );
}