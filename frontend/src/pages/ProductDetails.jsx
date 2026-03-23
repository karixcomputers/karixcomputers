import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { formatRON } from "../utils/money";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProductDetails() {
  const { id } = useParams();
  const { addItem } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeSection, setActiveSection] = useState("Detalii");
  
  // State pentru mesajul de confirmare coș
  const [cartMessage, setCartMessage] = useState({ show: false, text: "" });

  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  
  // State pentru pozele atașate la review
  const [reviewImages, setReviewImages] = useState([]);
  
  // NOU: State pentru poza mărită (fullscreen)
  const [fullscreenImage, setFullscreenImage] = useState(null);

  // State pentru a detecta dacă bara este 'sticky'
  const [isSticky, setIsSticky] = useState(false);

  // Refs pentru secțiuni
  const detailsRef = useRef(null);
  const benchmarkRef = useRef(null);
  const warrantyRef = useRef(null);
  const deliveryRef = useRef(null);
  const reviewsRef = useRef(null);

  // Refs pentru containerele de navigație (pentru auto-scroll orizontal)
  const mobileNavRef = useRef(null);
  const desktopNavRef = useRef(null);
  const buttonRefs = useRef({});

  // 1. LOGICĂ DETECTARE SECȚIUNE ACTIVĂ LA SCROLL
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        { name: "Detalii", ref: detailsRef },
        { name: "Benchmark", ref: benchmarkRef },
        { name: "Garanție", ref: warrantyRef },
        { name: "Livrare", ref: deliveryRef },
        { name: "Reviews", ref: reviewsRef },
      ];

      const scrollPosition = window.scrollY + 350; 

      for (const section of sections) {
        if (section.ref.current) {
          const { offsetTop, offsetHeight } = section.ref.current;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            if (activeSection !== section.name) {
              setActiveSection(section.name);
            }
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeSection]);

  // 1.5 LOGICĂ STICKY SEPARATĂ (Prevenim Flickering-ul și bug-urile de poziție)
  useEffect(() => {
    const handleSticky = () => {
      // Pragul exact de la care bara devine fixă (când ieși din zona ei inițială)
      if (window.scrollY > 120) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    window.addEventListener("scroll", handleSticky, { passive: true });
    handleSticky(); // Apelăm o dată la încărcare
    return () => window.removeEventListener("scroll", handleSticky);
  }, []);

  // 2. AUTO-SCROLL ORIZONTAL ÎN BARĂ (Să țină butonul activ pe centru)
  useEffect(() => {
    const activeBtn = buttonRefs.current[activeSection];
    const containers = [mobileNavRef.current, desktopNavRef.current];

    containers.forEach(container => {
      if (activeBtn && container) {
        const containerWidth = container.offsetWidth;
        const btnOffset = activeBtn.offsetLeft;
        const btnWidth = activeBtn.offsetWidth;
        
        container.scrollTo({
          left: btnOffset - containerWidth / 2 + btnWidth / 2,
          behavior: "smooth"
        });
      }
    });
  }, [activeSection]);

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const getProduct = async () => {
      try {
        const res = await apiFetch(`/api/products/${id}`);
        if (res.ok) setProduct(await res.json());
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    getProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      ...product,
      qty: quantity,
      specs: {
        cpu: product.cpuBrand, gpu: product.gpuBrand, ram: product.ramGb,
        storage: product.storageGb, motherboard: product.motherboard,
        case: product.case, cooler: product.cooler, psu: product.psu
      }
    });

    setCartMessage({ show: true, text: `${product.name} a fost adăugat în coș!` });
    setTimeout(() => setCartMessage({ show: false, text: "" }), 3000);
  };

  // Manipulare selecție poze
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReviewImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Ștergere poză selectată
  const removeImage = (indexToRemove) => {
    setReviewImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.comment.trim() || !user) return;
    setSubmittingReview(true);
    try {
      const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
      const res = await fetch(`http://192.168.0.162:4000/api/products/${id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ 
          rating: Number(reviewForm.rating), 
          comment: reviewForm.comment,
          images: reviewImages 
        })
      });
      if (res.ok) {
        const newReview = await res.json();
        setProduct(prev => ({ ...prev, reviews: [newReview, ...(prev?.reviews || [])] }));
        setReviewForm({ rating: 5, comment: "" });
        setReviewImages([]);
      }
    } catch (err) { console.error(err); }
    finally { setSubmittingReview(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-transparent"><div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div></div>;
  if (!product) return <div className="min-h-screen flex flex-col items-center justify-center text-white bg-transparent"><h1>Produs negăsit.</h1><Link to="/pcs">Catalog</Link></div>;

  const allSpecs = [
    { label: "CPU", val: product.cpuBrand, icon: "⚡" },
    { label: "GPU", val: product.gpuBrand, icon: "🎮" },
    { label: "RAM", val: product.ramGb, icon: "📟" },
    { label: "STOCARE", val: product.storageGb, icon: "💾" },
    { label: "PLACĂ DE BAZĂ", val: product.motherboard, icon: "🧩" },
    { label: "CARCASĂ", val: product.case, icon: "📦" },
    { label: "COOLER", val: product.cooler, icon: "❄️" },
    { label: "SURSĂ", val: product.psu, icon: "🔌" }
  ];

  const getBenchColor = (index) => {
    const colors = ["from-yellow-400 to-orange-500", "from-green-400 to-emerald-600", "from-indigo-400 to-blue-600", "from-red-500 to-pink-600", "from-purple-400 to-indigo-500"];
    return colors[index % colors.length];
  };

  const navItems = [
    { name: "Detalii", ref: detailsRef },
    { name: "Benchmark", ref: benchmarkRef },
    { name: "Garanție", ref: warrantyRef },
    { name: "Livrare", ref: deliveryRef },
    { name: "Reviews", ref: reviewsRef },
  ];

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 md:px-8 text-white relative bg-transparent overflow-hidden text-left font-sans">
      
      {/* WRAPPER-UL NAVIGAȚIEI (Aici e magia de Sticky fixat pe viewport) */}
      <div className={`w-full z-[100] transition-all duration-300 pointer-events-none px-4 flex justify-center ${
          isSticky 
            ? "fixed top-4 md:top-6 left-0" 
            : "absolute top-[75px] md:top-[120px] left-0"
        }`}
      >
        {/* BARA 1: MOBIL */}
        <div 
          ref={mobileNavRef}
          className="lg:hidden pointer-events-auto flex gap-1 p-1.5 bg-[#0b1020]/90 backdrop-blur-3xl border border-white/10 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] max-w-full overflow-x-auto no-scrollbar scroll-smooth"
        >
            <div className="flex gap-1 whitespace-nowrap min-w-max px-2">
                {navItems.map((btn) => (
                    <button 
                      key={btn.name} 
                      ref={(el) => (buttonRefs.current[btn.name] = el)}
                      onClick={() => scrollToSection(btn.ref)}
                      className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-500 italic active:scale-95 ${activeSection === btn.name ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 scale-105" : "text-gray-400 hover:bg-white/10"}`}
                    >
                      {btn.name}
                    </button>
                ))}
            </div>
        </div>

        {/* BARA 2: DESKTOP */}
        <div 
          ref={desktopNavRef}
          className="hidden lg:flex pointer-events-auto gap-1 p-1.5 bg-[#0b1020]/90 backdrop-blur-3xl border border-white/10 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] max-w-full overflow-x-auto no-scrollbar scroll-smooth"
        >
            <div className="flex gap-1 whitespace-nowrap min-w-max px-2">
                {navItems.map((btn) => (
                    <button 
                      key={btn.name} 
                      onClick={() => scrollToSection(btn.ref)}
                      className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 italic active:scale-95 ${activeSection === btn.name ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 scale-110" : "text-gray-400 hover:bg-white/10"}`}
                    >
                      {btn.name}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 mt-12 md:mt-24">
        
        {/* SECȚIUNEA 1: DETALII */}
        <section ref={detailsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start mb-40 scroll-mt-64">
          
          <div className="flex flex-col gap-8">
            <h1 className={`text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none drop-shadow-2xl ${product.name?.toUpperCase().includes("ZEUS") ? "text-indigo-400" : "text-white"}`}>
              {product.name}
            </h1>
            <div className="relative group lg:mt-4">
              <div className="aspect-square rounded-[60px] overflow-hidden border border-white/10 bg-white/5 backdrop-blur-2xl p-12 relative flex items-center justify-center shadow-2xl">
                <img src={product.images?.[0] || "https://placehold.co/800"} alt={product.name} className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <header className="flex flex-col items-center text-center lg:pt-12">
              <div className="inline-block px-6 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] italic mb-4">
                Hardware Premium
              </div>
            </header>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {allSpecs.map((spec, i) => (
                <div key={i} className={`p-3.5 md:p-5 rounded-[25px] border border-white/10 bg-white/5 backdrop-blur-md flex items-center gap-3 md:gap-5 transition-all hover:bg-white/10 hover:border-white/20`}>
                  <span className="text-xl md:text-2xl">{spec.icon}</span>
                  <div className="overflow-hidden">
                    <p className="text-[8px] md:text-[9px] font-black uppercase text-gray-500 tracking-widest mb-1">{spec.label}</p>
                    <p className="text-[11px] md:text-[13px] font-bold text-white/90 uppercase italic leading-tight whitespace-normal break-words">{spec.val || "N/A"}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* DESCRIERE DETALIATĂ */}
            {product.longDescription && (
              <div className="p-8 rounded-[35px] bg-white/[0.02] border border-white/5 italic">
                <p className="text-gray-400 text-sm leading-relaxed font-medium">
                  {product.longDescription}
                </p>
              </div>
            )}

            <div className="flex flex-col items-center gap-4 mt-4">
                <span className="text-4xl md:text-6xl font-black text-white italic tracking-tighter drop-shadow-2xl mb-2">
                    {formatRON(product.priceCents)}
                </span>
                
                <div className="flex gap-5 w-full">
                    <div className="flex items-center bg-white/5 border border-white/10 backdrop-blur-md rounded-[25px] p-2 h-20">
                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-14 h-full font-black text-xl hover:text-pink-500 transition-colors">-</button>
                        <span className="w-12 text-center font-black text-xl italic">{quantity}</span>
                        <button onClick={() => setQuantity(quantity + 1)} className="w-14 h-full font-black text-xl hover:text-indigo-400 transition-colors">+</button>
                    </div>
                    <button onClick={handleAddToCart} className="flex-1 h-20 bg-gradient-to-r from-indigo-600 to-pink-600 rounded-[25px] font-black uppercase tracking-[0.3em] text-sm hover:scale-[1.02] transition-all shadow-2xl">
                        Adaugă în coș
                    </button>
                </div>
            </div>
          </div>
        </section>

        {/* SECȚIUNEA 2: BENCHMARK */}
        <section ref={benchmarkRef} className="mb-40 scroll-mt-72">
            <div className="flex items-center gap-6 mb-12">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter"><span className="text-indigo-400">Benchmark</span></h2>
                <div className="h-[1px] bg-white/10 flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {product.benchmarks?.length > 0 ? (
                    product.benchmarks.map((item, i) => (
                        <div key={i} className="p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-md group hover:border-indigo-500/50 transition-all shadow-xl text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 italic">{item.game}</p>
                            <div className="flex items-baseline justify-center gap-2">
                                <span className={`text-5xl font-black italic bg-gradient-to-br ${getBenchColor(i)} bg-clip-text text-transparent animate-pulse`}>{item.fps}</span>
                                <span className="text-sm font-black text-white italic uppercase opacity-50">FPS</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full p-10 rounded-[40px] border border-dashed border-white/10 text-center italic text-gray-500">Datele benchmark vor fi actualizate curând / PC-ul nu este unul de gaming. </div>
                )}
            </div>
        </section>

        <section ref={warrantyRef} className="mb-40 scroll-mt-72">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                <div className="space-y-8">
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter">Garanția <span className="text-indigo-400">Premium</span></h2>
                    <p className="text-gray-400 text-lg leading-relaxed italic font-medium">Sistemul {product.name} beneficiază de garanție totală. Oferim garanție de {product.warrantyMonths || 24} luni direct în sediul nostru tehnic.</p>
                </div>
                <div className="p-10 rounded-[50px] bg-white/5 border border-white/10 backdrop-blur-xl text-center shadow-2xl animate-float">
                    <span className="text-8xl block mb-6">🛡️</span>
                    <h3 className="text-2xl font-black italic uppercase mb-2">Karix Shield</h3>
                </div>
            </div>
        </section>

        <section ref={deliveryRef} className="mb-40 scroll-mt-72">
            <div className="p-12 md:p-20 rounded-[60px] bg-white/5 border border-white/10 backdrop-blur-3xl relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 text-[15rem] opacity-[0.03] rotate-12 group-hover:rotate-0 transition-transform duration-1000">🚚</div>
                <div className="max-w-3xl space-y-8 relative z-10">
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter"><span className="text-pink-500">Livrare</span></h2>
                    <p className="text-gray-400 text-lg leading-relaxed italic font-medium italic">Sistemele noastre PC sunt asamblate și testate individual înainte de livrare, având un timp de procesare a comenzii de aproximativ 3-5 zile lucrătoare, urmat de expedierea prin curier rapid pe întreg teritoriul României.</p>
                </div>
            </div>
        </section>

        {/* SECȚIUNEA REVIEWS */}
        <section ref={reviewsRef} className="scroll-mt-72">
            <div className="flex items-center gap-6 mb-12">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter"> 
                  <span className="text-indigo-400">Review-uri</span>
                  <span className="ml-3 text-white/30 text-3xl">
                    ({product.reviews?.filter(r => !r.isDeleted).length || 0})
                  </span>
                </h2>
                <div className="h-[1px] bg-white/10 flex-1" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-7 space-y-6">
                    <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 scrollbar-hide">
                        {product.reviews?.filter(r => !r.isDeleted).length > 0 ? (
                          product.reviews.filter(r => !r.isDeleted).map((r, i) => (
                            <div key={i} className="p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-md space-y-4 shadow-lg">
                                <div className="flex justify-between items-center">
                                    <span className="font-black italic uppercase text-[11px] text-indigo-400 tracking-widest">{r.user?.name}</span>
                                    <div className="flex gap-1">{[...Array(5)].map((_, star) => (<span key={star} className={`text-xs ${star < r.rating ? "text-yellow-500" : "text-white/5"}`}>★</span>))}</div>
                                </div>
                                <p className="text-sm text-gray-300 italic font-medium leading-relaxed">"{r.comment}"</p>
                                
                                {/* AFIȘARE POZE ÎN REVIEW */}
                                {r.images && r.images.length > 0 && (
                                  <div className="flex gap-3 pt-4 overflow-x-auto no-scrollbar">
                                    {r.images.map((imgUrl, imgIdx) => (
                                      <img 
                                        key={imgIdx} 
                                        src={imgUrl} 
                                        alt="Review" 
                                        className="h-20 w-20 rounded-2xl object-cover border border-white/10 shrink-0 cursor-pointer hover:opacity-80 transition-opacity" 
                                        onClick={() => setFullscreenImage(imgUrl)}
                                      />
                                    ))}
                                  </div>
                                )}
                            </div>
                        ))) : <div className="p-20 rounded-[40px] border border-dashed border-white/10 text-center bg-white/[0.02] italic uppercase font-black text-gray-500">Nicio recenzie încă.</div>}
                    </div>
                </div>
                
                {/* FORMULARUL DE REVIEW */}
                <div className="lg:col-span-5">
                    <div className="p-10 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-8 italic text-center">
                            Review-ul tău
                        </h4>
                        
                        {user ? (
                            <form onSubmit={handleReviewSubmit} className="space-y-6">
                                <div className="flex gap-4 justify-center">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button 
                                          key={star} 
                                          type="button" 
                                          onClick={() => setReviewForm({ ...reviewForm, rating: star })} 
                                          className={`text-3xl transition-all ${star <= reviewForm.rating ? "text-yellow-500 scale-110" : "text-white/10 hover:text-white/30"}`}
                                        >
                                          ★
                                        </button>
                                    ))}
                                </div>
                                <textarea 
                                  required 
                                  placeholder="Scrie aici review-ul tău" 
                                  className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-sm text-white outline-none focus:border-indigo-500/40 h-32 resize-none italic leading-relaxed" 
                                  value={reviewForm.comment} 
                                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} 
                                />

                                {/* ZONA DE UPLOAD IMAGINI */}
                                <div className="flex flex-col gap-3">
                                  <label className="relative cursor-pointer group flex items-center justify-center gap-2 py-4 border border-dashed border-white/20 hover:border-indigo-500/50 bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl transition-all">
                                    <span className="text-xl">📸</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-indigo-300">Atașează Poze</span>
                                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                                  </label>

                                  {/* PREVIZUALIZARE POZE */}
                                  {reviewImages.length > 0 && (
                                    <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
                                      {reviewImages.map((src, idx) => (
                                        <div key={idx} className="relative shrink-0">
                                          <img src={src} alt="Preview" className="h-16 w-16 object-cover rounded-xl border border-white/10" />
                                          <button 
                                            type="button" 
                                            onClick={() => removeImage(idx)} 
                                            className="absolute -top-2 -right-2 h-5 w-5 bg-rose-500 text-white flex items-center justify-center rounded-full text-[10px] hover:scale-110 transition-transform shadow-lg"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <button 
                                  type="submit" 
                                  disabled={submittingReview} 
                                  className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
                                >
                                  {submittingReview ? "Sincronizare..." : "Publică Review-ul tău"}
                                </button>
                            </form>
                        ) : (
                            <div className="text-center py-6 italic font-black uppercase text-gray-400 tracking-widest leading-relaxed">
                                Loghează-te în cont pentru a lăsa un review.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
      </div>

      {/* --- NOTIFICARE PREMIUM ADAUGARE IN COS --- */}
      {cartMessage.show && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] bg-indigo-600/90 backdrop-blur-xl border border-white/20 px-8 py-4 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
           <p className="text-white font-black italic uppercase text-[11px] tracking-widest flex items-center gap-3">
              <span className="text-lg">🛒</span> {cartMessage.text}
           </p>
        </div>
      )}

      {/* --- MODAL FULLSCREEN POZE REVIEW --- */}
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
            alt="Review Fullscreen" 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
}