import React, { createContext, useContext, useState, useEffect, useMemo } from "react";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem("karix_cart");
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [conflictModal, setConflictModal] = useState({
    isOpen: false,
    type: null, 
    pendingProduct: null
  });

  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    localStorage.setItem("karix_cart", JSON.stringify(items));
  }, [items]);

  const clearCart = () => {
    setItems([]); 
  };

  const totalCents = useMemo(() => {
    return items.reduce((acc, item) => {
      const price = item.priceCentsAtBuy || item.priceCents || 0;
      return acc + (price * item.qty);
    }, 0);
  }, [items]);

  const triggerToast = (message, isWarning = false) => {
    const id = Date.now() + Math.random(); 
    setToasts((prev) => [...prev, { id, message, isWarning }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5000); 
  };

  // Verifică dacă produsul face parte din spectrul mare de "Servicii"
  const isProductService = (product) => {
    if (product.category === 'service') return true;
    const nameStr = (product.name || product.productName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const serviceKeywords = ['service', 'mentenanta', 'curatare', 'reparatie', 'diagnosticare', 'drift', 'hall', 'stick', 'montaj', 'asamblare', 'upgrade'];
    return serviceKeywords.some(kw => nameStr.includes(kw));
  };

  // Verifică dacă produsul este o "Asamblare"
  const isProductAssembly = (product) => {
    const nameStr = (product.name || product.productName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return nameStr.includes("asamblare");
  };

  // 👉 NOU: Verifică dacă produsul reprezintă un "Dispozitiv de bază" pentru service (Nu e un upgrade adiacent)
  const isBaseDeviceService = (product) => {
    const nameStr = (product.name || product.productName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Un upgrade NU reprezintă un dispozitiv fizic extra
    if (nameStr.includes("upgrade")) return false; 
    
    // Lista de cuvinte cheie care indică faptul că se aduce un dispozitiv ÎNTREG la service
    const baseKeywords = ['mentenanta', 'reparatie', 'curatare', 'diagnosticare', 'service', 'instalare', 'reinstalare', 'recuperare', 'windows'];
    return baseKeywords.some(kw => nameStr.includes(kw));
  };

  // Numărăm EXACT câte "Dispozitive de bază" avem în coș (Nu și upgrade-urile lipite de ele)
  const countTotalDevicesInCart = (cartArray) => {
    return cartArray.reduce((total, i) => {
      if (isBaseDeviceService(i) && !isProductAssembly(i)) {
        return total + (i.qty || 1);
      }
      return total;
    }, 0);
  };

  const performAdd = (product, clearPrevious = false) => {
    setItems((prev) => {
      const currentCart = clearPrevious ? [] : prev;
      const exists = currentCart.find((i) => i.id === product.id);
      
      const actualPrice = product.priceCents || product.price || product.totalCents || 0;
      const qtyToAdd = product.qty || 1;
      const isSrv = isProductService(product);

      let newCart;

      if (exists) {
        newCart = currentCart.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + qtyToAdd } : i
        );
      } else {
        let finalImages = product.images || [];
        if (finalImages.length === 0) {
           if (product.imageUrl) finalImages = [product.imageUrl];
           else if (product.image) finalImages = [product.image];
        }
        const finalImageUrl = product.imageUrl || finalImages[0] || null;

        newCart = [...currentCart, { 
          id: product.id, 
          productName: product.name || product.productName, 
          name: product.name || product.productName,
          category: product.category || (isSrv ? "service" : "pc"),
          priceCents: actualPrice,
          priceCentsAtBuy: actualPrice,
          images: finalImages, 
          imageUrl: finalImageUrl, 
          specs: product.specs || {},
          warrantyMonths: product.warrantyMonths, 
          qty: qtyToAdd 
        }];
      }

      const totalDevicesNow = countTotalDevicesInCart(newCart);
      
      if (totalDevicesNow > 1) {
        triggerToast("ℹ️ Ai mai multe dispozitive în coș. Atenție: preluarea multiplă pe aceeași comandă este posibilă DOAR în Oradea.", true);
      } else {
        triggerToast(`Ai adăugat "${product.name || product.productName}" în coș!`, false);
      }

      return newCart;
    });
  };

  const addItem = (product) => {
    const incomingIsService = isProductService(product);
    const incomingIsAssembly = isProductAssembly(product);

    const hasHardwareInCart = items.some(i => !isProductService(i));
    const hasAssemblyInCart = items.some(i => isProductAssembly(i));
    const hasServiceInCart = items.some(i => isProductService(i) && !isProductAssembly(i));

    if (hasAssemblyInCart && !incomingIsAssembly) {
      setConflictModal({ isOpen: true, type: 'WANTS_NORMAL', pendingProduct: product });
      return false;
    }

    if (!hasAssemblyInCart && incomingIsAssembly && items.length > 0) {
      setConflictModal({ isOpen: true, type: 'WANTS_ASSEMBLY', pendingProduct: product });
      return false;
    }

    if (hasHardwareInCart && incomingIsService && !incomingIsAssembly) {
      setConflictModal({ isOpen: true, type: 'WANTS_SERVICE_OVER_HARDWARE', pendingProduct: product });
      return false;
    }

    if (hasServiceInCart && !incomingIsService && !incomingIsAssembly) {
       setConflictModal({ isOpen: true, type: 'WANTS_HARDWARE_OVER_SERVICE', pendingProduct: product });
       return false;
    }

    performAdd(product, false);
    return true;
  };

  const removeFromCart = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQty = (id, delta) => {
    setItems((prev) => {
      const newCart = prev.map((i) =>
        i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i
      );

      const totalDevicesNow = countTotalDevicesInCart(newCart);
      if (delta > 0 && totalDevicesNow > 1) {
         triggerToast("ℹ️ Ai selectat mai multe dispozitive. Preluarea comună este disponibilă DOAR în Oradea.", true);
      }

      return newCart;
    });
  };

  const confirmReplaceCart = () => {
    if (conflictModal.pendingProduct) {
      performAdd(conflictModal.pendingProduct, true); 
    }
    setConflictModal({ isOpen: false, type: null, pendingProduct: null });
  };

  const cancelModal = () => {
    setConflictModal({ isOpen: false, type: null, pendingProduct: null });
  };

  const goToCheckout = () => {
    setConflictModal({ isOpen: false, type: null, pendingProduct: null });
    window.location.href = '/checkout'; 
  };

  return (
    <CartContext.Provider value={{ items, addItem, addToCart: addItem, removeFromCart, updateQty, totalCents, clearCart }}>
      {children}

      {/* MODAL CONFLICT */}
      {conflictModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={cancelModal}></div>
          <div className="relative w-full max-w-md p-8 md:p-10 rounded-[30px] bg-[#0b1020]/95 border border-rose-500/30 shadow-[0_0_50px_-12px_rgba(244,63,94,0.3)] animate-in zoom-in duration-300 text-center">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl shadow-inner">⚠️</div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider mb-4">Atenție la Coș</h2>
            
            {conflictModal.type === 'WANTS_NORMAL' && (
              <>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                  Ai deja serviciul de <strong className="text-white">Asamblare PC</strong> în coș, care se comandă exclusiv separat. <br /><br />
                  Dorești să golești coșul pentru a adăuga noul produs, sau mergi direct la checkout cu asamblarea?
                </p>
                <div className="flex flex-col gap-3">
                  <button onClick={confirmReplaceCart} className="w-full py-4 rounded-xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-600/20 hover:bg-rose-500 transition-all">Golește coșul și adaugă</button>
                  <button onClick={goToCheckout} className="w-full py-4 rounded-xl bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all">Mergi la Checkout</button>
                  <button onClick={cancelModal} className="w-full py-3 text-gray-500 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-all mt-2">Renunță</button>
                </div>
              </>
            )}

            {conflictModal.type === 'WANTS_ASSEMBLY' && (
              <>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                  Serviciul de <strong className="text-white">Asamblare PC</strong> se comandă pe o factură separată. Ai deja alte produse în coș. <br /><br />
                  Dorești să golești coșul actual pentru a putea comanda serviciul de asamblare?
                </p>
                <div className="flex flex-col gap-3">
                  <button onClick={confirmReplaceCart} className="w-full py-4 rounded-xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-600/20 hover:bg-rose-500 transition-all">Da, golește coșul</button>
                  <button onClick={goToCheckout} className="w-full py-4 rounded-xl bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all">Comandă produsele prima dată</button>
                  <button onClick={cancelModal} className="w-full py-3 text-gray-500 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-all mt-2">Renunță</button>
                </div>
              </>
            )}

            {conflictModal.type === 'WANTS_SERVICE_OVER_HARDWARE' && (
              <>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                  Serviciile de reparație sau mentenanță <strong className="text-white">nu pot fi combinate</strong> cu produsele hardware pe aceeași comandă, deoarece folosesc un sistem diferit de curierat (dus-întors). <br /><br />
                  Dorești să golești coșul pentru a programa serviciul?
                </p>
                <div className="flex flex-col gap-3">
                  <button onClick={confirmReplaceCart} className="w-full py-4 rounded-xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-600/20 hover:bg-rose-500 transition-all">Golește coșul și programează</button>
                  <button onClick={goToCheckout} className="w-full py-4 rounded-xl bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all">Finalizează produsele mai întâi</button>
                  <button onClick={cancelModal} className="w-full py-3 text-gray-500 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-all mt-2">Renunță</button>
                </div>
              </>
            )}

            {conflictModal.type === 'WANTS_HARDWARE_OVER_SERVICE' && (
              <>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                  Ai deja o <strong className="text-white">Reparație / Serviciu</strong> în coș. <br /><br />
                  Din motive de logistică și transport, produsele hardware (PC-uri) trebuie comandate separat. Golești coșul pentru a adăuga noul produs?
                </p>
                <div className="flex flex-col gap-3">
                  <button onClick={confirmReplaceCart} className="w-full py-4 rounded-xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-600/20 hover:bg-rose-500 transition-all">Golește coșul și adaugă</button>
                  <button onClick={goToCheckout} className="w-full py-4 rounded-xl bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all">Finalizează serviciul mai întâi</button>
                  <button onClick={cancelModal} className="w-full py-3 text-gray-500 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-all mt-2">Renunță</button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* TOAST-URI GLOBALE STILIZATE */}
      <div className="fixed bottom-8 right-4 md:right-8 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div 
            key={t.id} 
            className={`animate-in slide-in-from-right-full pointer-events-auto flex items-center gap-4 backdrop-blur-xl border p-4 rounded-2xl shadow-2xl min-w-[280px] md:min-w-[320px] transition-all
              ${t.isWarning ? 'bg-amber-950/95 border-amber-500/30' : 'bg-[#0f172a]/95 border-indigo-500/20'}
            `}
          >
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-lg
              ${t.isWarning ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-gradient-to-r from-indigo-500 to-pink-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]'}
            `}>
              <span className="text-xs font-bold">{t.isWarning ? '!' : '✓'}</span>
            </div>
            <p className="text-white font-black text-[10px] uppercase tracking-widest text-left leading-tight pr-2">{t.message}</p>
          </div>
        ))}
      </div>

    </CartContext.Provider>
  );
};