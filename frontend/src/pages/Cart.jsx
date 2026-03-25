import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { formatRON } from "../utils/money";
import { apiFetch } from "../api/client";
import axios from "axios";

export default function Cart() {
  const { items, removeFromCart, updateQty, clearCart, totalCents } = useCart();
  const { user, login, loginWithGoogle } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [singleDevice, setSingleDevice] = useState(false);
  const [discountCode, setDiscountCode] = useState(""); 
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, itemId: null, itemName: "" });

  // --- GOOGLE AUTH STATE ---
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);
  const [isGoogleProcessing, setIsGoogleProcessing] = useState(false); // NOU: Stare pentru animația de loading
  const [tempToken, setTempToken] = useState("");
  const [profileData, setProfileData] = useState({ name: "", email: "", avatar: "", phone: "" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "https://karixcomputers.ro/api";
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const SERVICE_KEYWORDS = ['mentenanta', 'service', 'diagnosticare', 'curatare', 'montaj', 'reparatie', 'upgrade'];

  const serviceItems = useMemo(() => {
    return items.filter(item => {
      const name = (item.productName || item.name || "").toLowerCase();
      return item.category === 'service' || SERVICE_KEYWORDS.some(kw => name.includes(kw));
    });
  }, [items]);

  const hasMultipleServices = serviceItems.length >= 2;

  const finalTotal = useMemo(() => {
    if (!appliedCoupon) return totalCents;
    if (appliedCoupon.discountType === "percentage") {
      const discount = totalCents * (appliedCoupon.discountValue / 100);
      return Math.max(0, totalCents - discount);
    } else {
      return Math.max(0, totalCents - appliedCoupon.discountValue);
    }
  }, [totalCents, appliedCoupon]);

  // --- LOGICĂ GOOGLE AUTH INTERCEPT ---
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && sessionStorage.getItem("cartGoogleAuth") === "true") {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");

      if (accessToken) {
        setIsGoogleProcessing(true); // Setăm pe "loading" imediat, ca să nu apară formularul
        setShowLoginModal(true); 
        handleBackendLogin(accessToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleBackendLogin = async (token) => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API_URL}/auth/google`, { token });
      
      if (res.status === 202 && res.data.require_profile_completion) {
        setTempToken(res.data.tempToken);
        setProfileData({
          name: res.data.profileData.name || "",
          email: res.data.profileData.email || "",
          avatar: res.data.profileData.avatar || "",
          phone: ""
        });
        setIsCompletingProfile(true); 
      } else if (res.data && res.data.accessToken) {
        loginWithGoogle(res.data);
        sessionStorage.removeItem("cartGoogleAuth");
        setShowLoginModal(false);
        nav("/checkout", { state: { coupon: appliedCoupon } });
      }
    } catch (err) {
      console.error("Google Auth Error:", err);
      setError("Sincronizarea cu Google a eșuat.");
    } finally {
      setLoading(false);
      setIsGoogleProcessing(false); // Oprim loading-ul indiferent de rezultat
    }
  };

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!acceptedTerms) {
      setError("Trebuie să accepți Termenii și Condițiile.");
      setLoading(false);
      return;
    }

    if (!profileData.phone || profileData.phone.length < 9) {
      setError("Te rugăm să introduci un număr de telefon valid.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/auth/google-complete`, {
        tempToken,
        name: profileData.name,
        phone: profileData.phone,
        termsAccepted: true
      });

      if (res.data && res.data.accessToken) {
        loginWithGoogle(res.data);
        sessionStorage.removeItem("cartGoogleAuth");
        setShowLoginModal(false);
        setIsCompletingProfile(false);
        nav("/checkout", { state: { coupon: appliedCoupon } });
      }
    } catch (err) {
      setError(err.response?.data?.error || "Eroare la finalizarea contului.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLoginInit = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError("Eroare: Configurare Google lipsă.");
      return;
    }
    sessionStorage.setItem("cartGoogleAuth", "true"); 
    const redirectUri = "https://karixcomputers.ro/cart"; 
    const scope = "email profile";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}`;
    
    window.location.href = authUrl;
  };
  // --- END GOOGLE AUTH ---

  const handleCheckoutClick = () => {
    if (hasMultipleServices && !singleDevice) {
      setShowErrorModal(true);
      return;
    }
    if (user) {
      nav("/checkout", { state: { coupon: appliedCoupon } });
    } else {
      setShowLoginModal(true);
    }
  };

  const handleInlineLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      setShowLoginModal(false);
      nav("/checkout", { state: { coupon: appliedCoupon } });
    } catch (err) {
      setError(err.message || "Autentificare eșuată");
    } finally {
      setLoading(false);
    }
  };

  const applyDiscount = async () => {
    if (!discountCode.trim()) return;
    setCouponError("");
    setIsValidating(true);
    try {
      const res = await apiFetch("/api/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ 
          code: discountCode.toUpperCase(), 
          cartTotal: totalCents 
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAppliedCoupon(data);
        setDiscountCode("");
      } else {
        setCouponError(data.error || "Cod invalid");
        setAppliedCoupon(null);
      }
    } catch (err) {
      setCouponError("Eroare la verificarea codului.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleDecrement = (item) => {
    const currentQty = item.qty || 1;
    if (currentQty === 1) {
      setDeleteConfirm({ show: true, itemId: item.id, itemName: item.productName || item.name });
    } else {
      updateQty(item.id, -1);
    }
  };

  const confirmDelete = () => {
    removeFromCart(deleteConfirm.itemId);
    setDeleteConfirm({ show: false, itemId: null, itemName: "" });
  };

  const handleCloseModal = () => {
    setShowLoginModal(false);
    setIsCompletingProfile(false);
    setIsGoogleProcessing(false);
    setError("");
    sessionStorage.removeItem("cartGoogleAuth");
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-transparent text-left">
      
      <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-pink-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-black text-white tracking-tighter mb-2 italic drop-shadow-2xl">
              Coșul <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">tău</span>
            </h1>
            <p className="text-gray-400 font-medium uppercase text-[10px] tracking-[0.2em] drop-shadow-md">Verifică configurația și serviciile selectate.</p>
          </div>
          {items.length > 0 && (
            <button 
              onClick={clearCart}
              className="px-6 py-3 rounded-xl border border-pink-500/30 text-pink-500 text-[10px] font-black uppercase tracking-widest hover:bg-pink-500 hover:text-white transition-all active:scale-95 italic mb-2"
            >
              Golește Coșul
            </button>
          )}
        </header>

        {items.length === 0 ? (
          <div className="p-20 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl text-center border-dashed">
            <div className="text-7xl mb-8 opacity-20">🛒</div>
            <h2 className="text-xl font-bold text-white mb-8 italic">Coșul tău este gol momentan.</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/shop" className="px-10 py-5 rounded-2xl font-black text-[#0b1020] bg-white hover:bg-indigo-400 hover:text-white transition-all shadow-xl">
                VEZI MAGAZINUL
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-4">
              
              {hasMultipleServices && (
                <div className={`p-8 rounded-[35px] border backdrop-blur-md transition-all duration-500 ${singleDevice ? 'bg-indigo-500/10 border-indigo-500/40 shadow-indigo-500/10 shadow-2xl' : 'bg-pink-500/5 border-pink-500/20 shadow-2xl'}`}>
                  <div className="flex items-start gap-5">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-500 ${singleDevice ? "bg-indigo-500 text-white border-indigo-400" : "bg-pink-500/20 text-pink-400 border-pink-500/20"}`}>
                      {singleDevice ? "✓" : "!"}
                    </div>
                    <div>
                      <h4 className="text-white font-black text-lg mb-1 italic uppercase tracking-tight">Logistica Karix Service</h4>
                      <p className="text-gray-300 text-xs leading-relaxed mb-6">
                        Ai <span className="text-pink-400 font-black">{serviceItems.length} servicii</span> în coș. Ridicăm un singur colet per comandă.
                      </p>
                      <label className="flex items-center gap-4 cursor-pointer group w-fit">
                        <input type="checkbox" checked={singleDevice} onChange={(e) => setSingleDevice(e.target.checked)} className="hidden" />
                        <div className={`h-6 w-12 rounded-full relative transition-all duration-500 ${singleDevice ? 'bg-indigo-500 shadow-indigo-500/50 shadow-lg' : 'bg-white/10'}`}>
                          <div className={`h-4 w-4 rounded-full bg-white absolute top-1 transition-all duration-500 ${singleDevice ? 'left-7' : 'left-1'}`} />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${singleDevice ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-400'}`}>
                          CONFIRM: UN SINGUR DEVICE
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {items.map((item) => {
                const nameStr = (item.productName || item.name || "").toLowerCase();
                const isService = item.category === 'service' || SERVICE_KEYWORDS.some(kw => nameStr.includes(kw));
                const isPC = !isService;
                const itemPrice = item.priceCentsAtBuy || item.priceCents || item.price || 0;
                const quantity = item.qty || 1;
                
                const imgUrl = item.images?.[0] || item.imageUrl || null;

                return (
                  <div key={item.id} className="group p-5 sm:p-6 rounded-[25px] sm:rounded-[35px] bg-white/5 border border-white/10 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 hover:bg-white/[0.08] hover:border-indigo-500/30 transition-all duration-300 shadow-xl relative">
                    
                    <button onClick={() => removeFromCart(item.id)} className="absolute top-4 right-4 sm:top-6 sm:right-6 text-gray-500 hover:text-pink-500 transition-colors h-8 w-8 flex items-center justify-center rounded-full hover:bg-pink-500/10 z-20">✕</button>

                    <div className="flex items-center gap-4 w-full sm:w-auto pr-8 sm:pr-0">
                      <div className={`h-20 w-20 sm:h-24 sm:w-24 rounded-2xl sm:rounded-3xl flex items-center justify-center border shrink-0 transition-all duration-500 overflow-hidden ${isPC ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-pink-500/10 border-pink-500/20'}`}>
                        {imgUrl ? (
                           <img src={imgUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                           <span className="text-2xl sm:text-3xl">{isPC ? "🖥️" : "🛠️"}</span>
                        )}
                      </div>
                      
                      <div className="flex-1 sm:hidden">
                        <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border mb-1.5 inline-block ${isPC ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-pink-500/10 text-pink-400 border-pink-500/20'}`}>
                          {isPC ? 'Hardware' : 'Service'}
                        </span>
                        <h3 className="text-sm font-bold text-white tracking-tight italic uppercase leading-tight drop-shadow-md line-clamp-2">
                          {item.productName || item.name}
                        </h3>
                      </div>
                    </div>
                    
                    <div className="flex-1 w-full pt-1 overflow-hidden">
                      <div className="hidden sm:block pr-8">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border mb-2 inline-block ${isPC ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-pink-500/10 text-pink-400 border-pink-500/20'}`}>
                          {isPC ? 'Hardware' : 'Service'}
                        </span>
                        <h3 className="text-xl font-bold text-white tracking-tight italic uppercase leading-tight drop-shadow-md truncate">
                          {item.productName || item.name}
                        </h3>
                      </div>

                      {isPC && item.specs && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mt-3 sm:mt-4 opacity-90 w-full">
                          {[
                            { icon: "⚡", label: "CPU", val: item.specs.cpu },
                            { icon: "🎮", label: "GPU", val: item.specs.gpu },
                            { icon: "🧩", label: "MB", val: item.specs.motherboard },
                            { icon: "📟", label: "RAM", val: item.specs.ram || item.specs.ramGb },
                            { icon: "💾", label: "SSD", val: item.specs.storage || item.specs.storageGb },
                            { icon: "📦", label: "CASE", val: item.specs.case },
                            { icon: "❄️", label: "COOL", val: item.specs.cooler },
                            { icon: "🔌", label: "PSU", val: item.specs.psu },
                          ].map((spec, idx) => spec.val && (
                            <div key={idx} className="flex items-start gap-2 bg-white/5 px-3 py-2 rounded-lg border border-white/5 w-full">
                              <span className="text-[11px] grayscale brightness-200 shrink-0 pt-[2px]">{spec.icon}</span>
                              <span className="text-[9px] text-indigo-400 font-black uppercase tracking-tighter shrink-0 pt-[3px]">{spec.label}:</span>
                              <span className="text-[10px] text-gray-300 font-medium italic flex-1 whitespace-normal break-words leading-snug">
                                {spec.val}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="hidden sm:flex items-center gap-4 mt-6">
                        <p className="text-white font-black text-lg drop-shadow-lg">{formatRON(itemPrice * quantity)}</p>
                        {item.warrantyMonths > 0 && (
                          <span className="text-[9px] text-indigo-300 font-bold uppercase italic flex items-center gap-1">
                            🛡️ {item.warrantyMonths} Luni Garanție
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-center w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t border-white/5 sm:border-0 shrink-0">
                      
                      <div className="sm:hidden flex flex-col">
                        <p className="text-white font-black text-base drop-shadow-lg">{formatRON(itemPrice * quantity)}</p>
                        {item.warrantyMonths > 0 && (
                          <span className="text-[8px] text-indigo-300 font-bold uppercase italic flex items-center gap-1">
                            🛡️ {item.warrantyMonths} Luni
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center bg-white/5 rounded-2xl p-1 border border-white/10">
                        <button onClick={() => handleDecrement(item)} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded-xl transition-all">-</button>
                        <span className="w-8 text-center text-xs font-black text-indigo-400 italic">{quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded-xl transition-all">+</button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Sumar Comandă */}
            <div className="lg:col-span-4">
              <div className="p-8 rounded-[40px] bg-[#0b1020]/80 border border-white/10 backdrop-blur-2xl sticky top-32 shadow-3xl text-white">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em] mb-10 italic">Sumar Comandă</h3>
                
                <div className="space-y-4 mb-8 font-bold">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-medium italic">Subtotal</span>
                    <span className="font-black italic">{formatRON(totalCents || 0)}</span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between text-sm text-emerald-400 italic">
                      <span>Reducere ({appliedCoupon.code})</span>
                      <span>
                        -{appliedCoupon.discountType === 'percentage' 
                          ? `${appliedCoupon.discountValue}%` 
                          : formatRON(appliedCoupon.discountValue)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-medium italic">Livrare</span>
                    <span className="text-emerald-400 uppercase text-[10px] font-black tracking-widest">Gratuit</span>
                  </div>
                  
                  <div className="pt-6 border-t border-white/5">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3 italic text-left">Cod Reducere / Voucher</p>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder={appliedCoupon ? "COD APLICAT ✓" : "INTRODU CODUL..."}
                            disabled={!!appliedCoupon || isValidating}
                            className={`flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold text-white outline-none focus:border-indigo-500/50 transition-all uppercase tracking-widest ${appliedCoupon ? 'opacity-50 border-emerald-500/30' : ''}`}
                            value={discountCode}
                            onChange={(e) => setDiscountCode(e.target.value)}
                        />
                        <button 
                            onClick={applyDiscount}
                            disabled={!!appliedCoupon || isValidating}
                            className="px-4 py-3 rounded-xl bg-white text-black font-black text-[9px] uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all active:scale-95 disabled:opacity-50 shadow-lg"
                        >
                            {isValidating ? '...' : 'Aplică'}
                        </button>
                    </div>
                    {couponError && <p className="text-[9px] text-pink-500 mt-2 font-bold uppercase tracking-tighter text-left">{couponError}</p>}
                    {appliedCoupon && (
                      <button onClick={() => setAppliedCoupon(null)} className="text-[8px] text-gray-500 hover:text-white uppercase mt-2 underline tracking-widest block">
                        Elimină codul
                      </button>
                    )}
                  </div>

                  <div className="h-px bg-white/10 w-full my-6" />
                  
                  <div className="flex justify-between items-end italic">
                    <span className="text-gray-400 text-xs font-black uppercase tracking-widest leading-none">Total Final</span>
                    <span className="text-2xl font-black text-white drop-shadow-lg leading-none">{formatRON(finalTotal)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckoutClick}
                  className={`group relative w-full py-6 rounded-[25px] font-black text-white overflow-hidden transition-all active:scale-[0.98] shadow-2xl ${hasMultipleServices && !singleDevice ? 'opacity-40 grayscale pointer-events-none' : ''}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 group-hover:scale-110 transition-transform duration-500" />
                  <span className="relative z-10 text-lg uppercase tracking-widest italic">Finalizează →</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL CONFIRMARE STERGERE PRODUS */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 backdrop-blur-md bg-black/60">
          <div className="relative w-full max-w-sm bg-[#161e31]/90 backdrop-blur-2xl border border-pink-500/20 p-10 rounded-[40px] text-center shadow-2xl animate-in zoom-in">
            <h2 className="text-2xl font-black text-white mb-2 italic uppercase">Eliminare Produs</h2>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed font-medium italic">Ești sigur că vrei să ștergi <span className="text-white font-bold">{deleteConfirm.itemName}</span> din coș?</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteConfirm({ show: false, itemId: null, itemName: "" })} className="flex-1 py-4 rounded-2xl font-black text-gray-400 bg-white/5 hover:bg-white/10 uppercase tracking-widest text-[10px] transition-all">Anulează</button>
              <button onClick={confirmDelete} className="flex-1 py-4 rounded-2xl font-black text-white bg-pink-600 hover:bg-pink-500 uppercase tracking-widest text-[10px] shadow-lg shadow-pink-600/20 transition-all">Șterge</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EROARE LOGISTICA */}
      {showErrorModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 backdrop-blur-md bg-black/60">
          <div className="relative w-full max-w-md bg-[#161e31]/90 backdrop-blur-2xl border border-pink-500/20 p-10 rounded-[40px] text-center shadow-2xl">
            <div className="text-5xl mb-6 text-pink-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.3)]">⚠️</div>
            <h2 className="text-2xl font-black text-white mb-4 italic uppercase">Conflict Logistic</h2>
            <p className="text-gray-400 text-sm mb-10 leading-relaxed font-medium">Karix poate procesa un singur colet per comandă. Bifează confirmarea pentru un singur device în coș.</p>
            <button onClick={() => setShowErrorModal(false)} className="w-full py-5 rounded-2xl font-black text-white bg-pink-600 hover:bg-pink-500 uppercase tracking-widest text-xs shadow-lg shadow-pink-600/20 transition-all">Am înțeles</button>
          </div>
        </div>
      )}

      {/* MODAL LOGIN / COMPLETARE PROFIL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 backdrop-blur-xl bg-black/70">
          <div className="relative w-full max-w-md bg-[#161e31]/95 backdrop-blur-3xl border border-white/10 p-10 sm:p-12 rounded-[50px] shadow-3xl text-center">
            
            <button onClick={handleCloseModal} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors h-8 w-8 bg-white/5 rounded-full flex items-center justify-center">✕</button>
            
            {isGoogleProcessing ? (
              // --- STAREA NOUĂ: LOADING GOOGLE ---
              <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center py-10">
                <div className="h-16 w-16 mb-6">
                  <div className="w-full h-full border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                </div>
                <h2 className="text-2xl font-black text-white uppercase italic drop-shadow-lg mb-2">Conectare...</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">Sincronizare cu Google</p>
              </div>
            ) : isCompletingProfile ? (
              // --- PASUL 2 GOOGLE: COMPLETARE DATE ---
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="mb-8 text-center">
                  <div className="relative inline-block mb-4">
                    {profileData.avatar ? (
                      <img src={profileData.avatar} alt="Profile" className="w-16 h-16 rounded-full border-2 border-indigo-500 shadow-lg object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-full border-2 border-indigo-500 bg-indigo-500/20 flex items-center justify-center text-2xl">👋</div>
                    )}
                  </div>
                  <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">
                    Aproape <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Gata!</span>
                  </h1>
                  <p className="text-xs text-gray-300 mt-2 font-medium italic px-4">
                    Avem nevoie de numărul tău de telefon pentru facturare și livrări.
                  </p>
                </header>

                <form onSubmit={handleCompleteProfile} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-2 text-left block">Nume Complet</label>
                      <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500 outline-none transition-all font-medium text-sm" value={profileData.name} onChange={(e) => setProfileData(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-2 text-left block">Telefon</label>
                      <input required type="tel" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500 outline-none transition-all font-medium text-sm placeholder:text-gray-600" placeholder="Ex: 0712345678" value={profileData.phone} onChange={(e) => setProfileData(p => ({ ...p, phone: e.target.value }))} />
                    </div>

                    <label className="flex items-start gap-3 mt-4 cursor-pointer group p-2 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="relative flex items-center mt-0.5">
                        <input type="checkbox" required checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="peer h-4 w-4 shrink-0 appearance-none rounded border border-white/20 bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 focus:outline-none transition-all" />
                        <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium leading-relaxed italic text-left">
                        Sunt de acord cu <Link to="/terms" target="_blank" className="text-indigo-400 hover:text-indigo-300 font-bold underline">Termenii</Link> și <Link to="/confidentialitate" target="_blank" className="text-indigo-400 hover:text-indigo-300 font-bold underline">GDPR</Link>.
                      </span>
                    </label>
                  </div>

                  {error && <p className="text-[10px] text-pink-500 font-bold uppercase tracking-tighter">{error}</p>}

                  <button disabled={loading || !acceptedTerms} className="w-full rounded-2xl py-5 text-xs font-black text-white bg-indigo-500 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest">
                    {loading ? "Se salvează..." : "Continuă la Checkout"}
                  </button>
                </form>
              </div>
            ) : (
              // --- PASUL 1: AUTENTIFICARE NORMALA / GOOGLE INIȚIAL ---
              <div className="animate-in fade-in duration-500">
                <div className="h-16 w-16 rounded-[24px] bg-gradient-to-br from-indigo-500 to-pink-500 mx-auto mb-6 flex items-center justify-center text-2xl shadow-2xl">🔑</div>
                <h2 className="text-3xl font-black text-white uppercase italic drop-shadow-lg mb-2">Autentificare</h2>
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-8 italic">Pentru a finaliza comanda</p>
                
                <form onSubmit={handleInlineLogin} className="space-y-4">
                  <input required type="email" className="w-full bg-white/5 border border-white/10 rounded-[20px] px-6 py-5 text-white outline-none focus:border-indigo-500/50 transition-all text-xs font-bold uppercase tracking-wider" placeholder="EMAIL" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} />
                  
                  <div className="space-y-2">
                     <input required type="password" className="w-full bg-white/5 border border-white/10 rounded-[20px] px-6 py-5 text-white outline-none focus:border-indigo-500/50 transition-all text-xs font-bold uppercase tracking-wider" placeholder="PAROLĂ" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
                     <div className="flex justify-end px-2">
                        <Link to="/auth/forgot" onClick={handleCloseModal} className="text-[9px] text-gray-400 hover:text-pink-400 font-black uppercase tracking-widest transition-colors">Ai uitat parola?</Link>
                     </div>
                  </div>

                  {error && <p className="text-[10px] text-pink-500 font-bold uppercase tracking-tighter">{error}</p>}
                  
                  <button disabled={loading} className="w-full py-5 rounded-[20px] font-black text-white bg-indigo-600 hover:bg-indigo-500 transition-all uppercase tracking-widest text-[11px] mt-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98]">
                    {loading ? "Se verifică..." : "Continuă →"}
                  </button>
                </form>

                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                  <div className="relative flex justify-center text-[9px] uppercase tracking-widest font-black">
                    <span className="bg-[#161e31] px-4 text-gray-500">SAU</span>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleGoogleLoginInit} 
                  disabled={loading}
                  className="w-full py-4 rounded-[20px] font-black text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                     <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                     <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                     <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Logare cu Google
                </button>

                <p className="mt-8 text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                  Nu ai cont? 
                  <Link to="/auth/register" onClick={handleCloseModal} className="text-indigo-400 hover:text-white font-black transition-colors ml-1.5 underline">
                    Înregistrează-te
                  </Link>
                </p>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}