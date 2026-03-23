import React, { useState, useRef, useEffect } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";

export default function KarixAI() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef();

  // --- CONFIGURARE MENIU PRINCIPAL ---
  const mainOptions = [
    "📦 Comenzi", 
    "🔄 Retururi", 
    "🛠️ Garanții & Service", 
    "🎫 Tichete", 
    "❓ Alte probleme"
  ];

  const [messages, setMessages] = useState([
    { 
      role: "assistant", 
      content: `Salut${user?.name ? ', ' + user.name : ''}! Sunt asistentul tău Karix. Alege informațiile cu care dorești să te ajut:`,
      options: mainOptions
    }
  ]);

  // --- LOGICA DE NAVIGARE (FLOW) ---
  const flow = {
    "📦 Comenzi": {
      message: "Te pot ajuta cu informații despre comenzi. Ce anume dorești să afli?",
      options: ["🕒 Status ultima comandă", "🕒 Status comenzi", "🚚 Când ajunge pachetul?", "🔙 Înapoi la meniu"]
    },
    "🕒 Status comenzi": {
      message: "Te rog să introduci numărul comenzii (ex: #25630) pentru a verifica statusul acesteia.",
      options: ["🔙 Înapoi la meniu"]
    },
    "🚚 Când ajunge pachetul?": {
      message: "Asamblarea durează 3-5 zile în funcție de disponibilitatea componentelor și livrarea durează 24-48 ore.",
      options: ["🔙 Înapoi la meniu"]
    },
    "🔄 Retururi": {
      message: "Verificăm situația retururilor tale. Te rugăm să alegi o opțiune:",
      options: ["📉 Status retur", "📋 Cum fac un retur?", "🔙 Înapoi la meniu"]
    },
    "📉 Status retur": {
      message: "Te rog să introduci numărul comenzii pentru care ai inițiat returul (ex: #25630) pentru a verifica stadiul acestuia.",
      options: ["🔙 Înapoi la meniu"]
    },
    "📋 Cum fac un retur?": {
      message: "Returul se poate iniția din fereastra Comenzile Mele pe butonul 'Inițiază retur nou'. \n\nAccesează secțiunea aici: https://karixcomputers.ro/orders",
      options: ["🔙 Înapoi la meniu"]
    },
    "🛠️ Garanții & Service": {
      message: "Accesăm fișele tale de service. Ce dorești să verifici?",
      options: ["🔬 Stadiu reparație în curs", "🆘 Vreau să trimit în service", "🔙 Înapoi la meniu"]
    },
    "🎫 Tichete": {
      message: "Te pot ajuta cu informații despre tichetele de suport. Ce anume dorești să verifici?",
      options: ["📉 Status tichete active", "🔙 Înapoi la meniu"]
    },
    "🔙 Înapoi la meniu": {
      message: "Sigur. Cu ce altceva din contul tău te mai pot ajuta?",
      options: mainOptions
    }
  };

  // --- FUNCȚIE PENTRU RENDER LINK-URI CLICKABILE ---
  const renderMessage = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        const isOrdersLink = part.includes("/orders");
        return (
          <a 
            key={i} 
            href={isOrdersLink ? "/orders" : part} 
            className="text-indigo-400 underline hover:text-indigo-200 font-bold break-all"
          >
            {isOrdersLink ? "Către comenzi" : part}
          </a>
        );
      }
      return part;
    });
  };

  const handleOptionClick = async (option) => {
    setMessages(prev => [...prev, { role: "user", content: option }]);
    setIsTyping(true);

    setTimeout(async () => {
      if (flow[option]) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: flow[option].message, 
          options: flow[option].options 
        }]);
        setIsTyping(false);
      } else {
        await getAIResponse(option);
      }
    }, 600);
  };

  const getAIResponse = async (text) => {
    try {
      const res = await apiFetch("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ 
          message: text, 
          history: messages.map(m => ({ role: m.role, content: m.content })).slice(-10) 
        })
      });

      if (res.ok) {
        const data = await res.json();
        const cleanReply = data.reply.replace(/\*/g, "");
        setMessages(prev => [...prev, { 
            role: "assistant", 
            content: cleanReply
        }]);
      }
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleManualSend = async () => {
    const rawInput = input.trim();
    if (!rawInput) return;

    const lowerInput = rawInput.toLowerCase();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: rawInput }]);
    setIsTyping(true);

    setTimeout(async () => {
      if (["da", "da te rog", "vreau"].includes(lowerInput)) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: "Excelent! Uite opțiunile din contul tău:", 
          options: mainOptions 
        }]);
        setIsTyping(false);
      } 
      else if (["nu", "nu mersi", "nu am nevoie"].includes(lowerInput)) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: "Am înțeles. Dacă mai ai nevoie de Karix AI, sunt aici. Să ai o zi cât mai frumoasă! 😊" 
        }]);
        setIsTyping(false);
      } 
      else {
        await getAIResponse(rawInput);
      }
    }, 600);
  };

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  if (!user) return null;

  return (
    // AICI ESTE FIX-UL 1: Am pus pointer-events-none pe wrapper-ul principal
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end font-sans pointer-events-none">
      
      {/* AICI ESTE FIX-UL 2: Am pus pointer-events-auto doar cand e deschis, restul raman pointer-events-none */}
      <div className={`w-[380px] max-w-[90vw] h-[600px] max-h-[80vh] bg-[#0d1225]/98 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-2xl flex flex-col overflow-hidden mb-6 transition-all duration-300 origin-bottom-right ${
        isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-90 pointer-events-none hidden"
      }`}>
        <div className="p-6 bg-gradient-to-br from-[#6366f1] via-[#8b5cf6] to-[#d946ef] flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 text-xl shadow-inner">🤖</div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Karix AI</h3>
              <p className="text-white/70 text-[10px] uppercase tracking-widest font-black">Support Clienți</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white transition-colors">✕</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
          {messages.map((m, i) => (
            <div key={i} className="space-y-4">
              <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-[22px] text-[13.5px] leading-relaxed shadow-sm whitespace-pre-wrap ${
                  m.role === "user" 
                    ? "bg-indigo-500 text-white rounded-br-none" 
                    : "bg-white/10 text-gray-100 border border-white/10 rounded-bl-none"
                }`}>
                  {renderMessage(m.content)}
                </div>
              </div>

              {m.role === "assistant" && m.options && i === messages.length - 1 && !isTyping && (
                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-500 pl-2 max-w-[280px]">
                  {m.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleOptionClick(opt)}
                      className="w-full text-left px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-indigo-300 text-[12px] font-bold hover:bg-indigo-500 hover:text-white hover:border-indigo-400 transition-all active:scale-[0.98] shadow-lg"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start pl-2">
              <div className="bg-white/10 px-4 py-4 rounded-[22px] rounded-bl-none flex gap-1.5 border border-white/10 shadow-sm">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        <div className="p-5 bg-[#151b33] border-t border-white/5 flex gap-3 items-center shrink-0">
          <input 
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManualSend()}
            placeholder="Introdu ID-ul sau scrie 'da'..."
            className="flex-1 min-w-0 bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3 text-[13.5px] text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
          <button 
            onClick={handleManualSend} 
            disabled={!input.trim() || isTyping}
            className="h-11 w-11 shrink-0 bg-indigo-500 rounded-xl text-white flex items-center justify-center hover:bg-indigo-400 transition-all"
          >
            ➤
          </button>
        </div>
      </div>

      {/* AICI ESTE FIX-UL 3: Butonul principal are pointer-events-auto ca să meargă click-ul */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`h-16 w-16 rounded-full shadow-[0_10px_40px_rgba(139,92,246,0.4)] flex items-center justify-center text-3xl transition-all duration-500 hover:scale-110 active:scale-95 group pointer-events-auto shrink-0 ${
          isOpen ? "bg-[#151b33] rotate-90" : "bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500"
        }`}
      >
        {isOpen ? <span className="text-white text-xl font-bold">✕</span> : <span>🤖</span>}
      </button>
    </div>
  );
}