import React, { useEffect, useState } from "react";
import { Link, useSearchParams, Navigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { apiFetch } from "../api/client";
import SEO from "../components/SEO";

export default function Success() {
  const [sp] = useSearchParams();
  const orderId = sp.get("orderId");
  const { clearCart } = useCart();
  
  // Statusul poate fi: "verifying", "success", "failed"
  const [status, setStatus] = useState("verifying"); 

  useEffect(() => {
    if (!orderId) {
      setStatus("failed");
      return;
    }

    let attempts = 0;
    const maxAttempts = 4; // Încercăm de 4 ori (aprox 8 secunde) să așteptăm serverul Netopia

    const checkPaymentStatus = async () => {
      try {
        const res = await apiFetch(`/orders/${orderId}`);
        if (!res.ok) {
            setStatus("failed");
            return;
        }
        
        const order = await res.json();

        // 1. Dacă Netopia a respins clar plata
        if (order.status === "plata_esuata" || order.status === "anulat") {
          setStatus("failed");
          return;
        }

        // 2. Dacă plata a fost confirmată sau e ordin prin Transfer Bancar
        if (order.status === "in_procesare" || order.status === "in_asteptare" || (order.status === "in_asteptare_plata" && order.paymentMethod === "transfer_bancar")) {
          setStatus("success");
          clearCart();
          return;
        }

        // 3. Dacă încă e "in_asteptare_plata" pentru plata Online, înseamnă că răspunsul de la Netopia întârzie 1-2 secunde
        if (order.status === "in_asteptare_plata" && order.paymentMethod === "online") {
           attempts++;
           if (attempts >= maxAttempts) {
               // Dacă după 8 secunde tot nu a venit confirmarea, aruncăm clientul la failed.
               setStatus("failed");
           } else {
               setTimeout(checkPaymentStatus, 2000); // Mai așteptăm 2 secunde
           }
        }
      } catch (error) {
         setStatus("failed");
      }
    };

    checkPaymentStatus();
  }, [orderId, clearCart]);

  // ECRAN DE ÎNCĂRCARE INTERMEDIAR (Cât comunicăm cu banca)
  if (status === "verifying") {
    return (
      <div className="min-h-screen pt-32 flex flex-col items-center justify-center text-white bg-transparent">
         <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
         <h2 className="text-2xl font-black italic uppercase tracking-widest drop-shadow-md text-indigo-400">Se verifică plata...</h2>
         <p className="text-gray-400 text-xs font-bold mt-2">Așteptăm confirmarea de la bancă. Te rugăm să nu închizi pagina.</p>
      </div>
    );
  }

  // REDIRECȚIONARE CĂTRE FAIL DACĂ A FOST RESPINSĂ
  if (status === "failed") {
    return <Navigate to="/failed" replace />;
  }

  // ECRANUL ORIGINAL DE SUCCES
  return (
    <>
      <SEO 
        title="Comandă Înregistrată cu Succes" 
        description="Comanda ta a fost plasată cu succes la Karix Computers. Îți mulțumim pentru încredere! Verifică email-ul pentru confirmare."
      />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-transparent flex items-center justify-center text-center">
        
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/5 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-500/5 blur-[120px] rounded-full animate-pulse" />
        </div>

        <div className="max-w-2xl w-full mx-auto relative z-10 animate-in fade-in zoom-in duration-500">
          <div className="p-12 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-3xl shadow-2xl">
            
            <div className="h-24 w-24 rounded-[30px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-8 shadow-inner shadow-emerald-500/20">
              <span className="text-5xl drop-shadow-lg">✅</span>
            </div>
            
            <h1 className="text-5xl font-black text-white tracking-tighter mb-4 italic drop-shadow-2xl">
              Comandă <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Înregistrată</span>
            </h1>
            
            <p className="text-gray-300 font-medium tracking-tight mb-8 text-lg drop-shadow-md">
              Mulțumim! Plata a fost confirmată. Vei primi un email cu detaliile facturii în scurt timp.
            </p>

            <div className="mb-10 p-4 rounded-2xl bg-white/5 border border-white/10 inline-block backdrop-blur-md">
              <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black mb-1">ID Comandă</p>
              <p className="text-xl font-mono text-emerald-400/80 font-bold">#{orderId}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/orders" reloadDocument className="px-8 py-5 rounded-2xl font-black text-white bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-md transition-all uppercase tracking-widest text-[10px] shadow-lg">
                Comenzile mele
              </Link>
              <Link to="/shop" reloadDocument className="px-8 py-5 rounded-2xl font-black text-[#0b1020] bg-white hover:bg-emerald-400 hover:text-white transition-all uppercase tracking-widest text-[10px] shadow-2xl shadow-emerald-500/20 active:scale-95">
                Înapoi la Magazin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}