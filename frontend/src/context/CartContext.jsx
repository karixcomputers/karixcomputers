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

  // Stare pentru modalul personalizat de conflict în coș
  const [conflictModal, setConflictModal] = useState({
    isOpen: false,
    type: null, // 'WANTS_NORMAL' (are asamblare, vrea altceva) sau 'WANTS_ASSEMBLY' (are altceva, vrea asamblare)
    pendingProduct: null
  });

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

  // Funcția efectivă care adaugă produsul în coș (apelată după validări)
  const performAdd = (product, clearPrevious = false) => {
    setItems((prev) => {
      const currentCart = clearPrevious ? [] : prev;
      const exists = currentCart.find((i) => i.id === product.id);
      
      const actualPrice = product.priceCents || product.price || product.totalCents || 0;
      const qtyToAdd = product.qty || 1;

      if (exists) {
        return currentCart.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + qtyToAdd } : i
        );
      }

      let finalImages = product.images || [];
      if (finalImages.length === 0) {
         if (product.imageUrl) finalImages = [product.imageUrl];
         else if (product.image) finalImages = [product.image];
      }
      
      const finalImageUrl = product.imageUrl || finalImages[0] || null;

      return [...currentCart, { 
        id: product.id, 
        productName: product.name || product.productName, 
        name: product.name || product.productName,
        category: product.category || "pc",
        priceCents: actualPrice,
        priceCentsAtBuy: actualPrice,
        images: finalImages, 
        imageUrl: finalImageUrl, 
        specs: product.specs || {},
        warrantyMonths: product.warrantyMonths, 
        qty: qtyToAdd 
      }];
    });
  };

  const addItem = (product) => {
    const incomingName = (product.name || product.productName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const isIncomingAssembly = incomingName.includes("asamblare");

    const hasAssemblyInCart = items.some(i => {
      const n = (i.name || i.productName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return n.includes("asamblare");
    });

    // Cazul 1: Ai asamblare în coș și vrei să adaugi o componentă
    if (hasAssemblyInCart && !isIncomingAssembly) {
      setConflictModal({ isOpen: true, type: 'WANTS_NORMAL', pendingProduct: product });
      return;
    }

    // Cazul 2: Ai componente în coș și vrei să adaugi asamblarea
    if (!hasAssemblyInCart && isIncomingAssembly && items.length > 0) {
      setConflictModal({ isOpen: true, type: 'WANTS_ASSEMBLY', pendingProduct: product });
      return;
    }

    // Dacă nu există conflicte, adaugă normal
    performAdd(product, false);
  };

  const removeFromCart = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQty = (id, delta) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i
      )
    );
  };

  const addToCart = addItem;

  // --- HANDLERE PENTRU MODAL ---
  const confirmReplaceCart = () => {
    if (conflictModal.pendingProduct) {
      performAdd(conflictModal.pendingProduct, true); // true = golește coșul înainte de a adăuga
    }
    setConflictModal({ isOpen: false, type: null, pendingProduct: null });
  };

  const cancelModal = () => {
    setConflictModal({ isOpen: false, type: null, pendingProduct: null });
  };

  const goToCheckout = () => {
    setConflictModal({ isOpen: false, type: null, pendingProduct: null });
    window.location.href = '/checkout'; // Navigare forțată la checkout
  };

  return (
    <CartContext.Provider value={{ items, addItem, addToCart, removeFromCart, updateQty, totalCents, clearCart }}>
      {children}

      {/* MODAL PERSONALIZAT PENTRU CONFLICTE ÎN COȘ */}
      {conflictModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={cancelModal}></div>
          <div className="relative w-full max-w-md p-8 md:p-10 rounded-[30px] bg-[#0b1020]/95 border border-rose-500/30 shadow-[0_0_50px_-12px_rgba(244,63,94,0.3)] animate-in zoom-in duration-300 text-center">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl shadow-inner">
              ⚠️
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider mb-4">Atenție la Coș</h2>
            
            {conflictModal.type === 'WANTS_NORMAL' && (
              <>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                  Ai deja serviciul de <strong className="text-white">Asamblare PC</strong> în coș, care se comandă exclusiv separat. <br /><br />
                  Dorești să golești coșul pentru a adăuga noul produs, sau mergi direct la checkout cu asamblarea?
                </p>
                <div className="flex flex-col gap-3">
                  <button onClick={confirmReplaceCart} className="w-full py-4 rounded-xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-600/20 hover:bg-rose-500 transition-all">
                    Golește coșul și adaugă
                  </button>
                  <button onClick={goToCheckout} className="w-full py-4 rounded-xl bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all">
                    Mergi la Checkout
                  </button>
                  <button onClick={cancelModal} className="w-full py-3 text-gray-500 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-all mt-2">
                    Renunță
                  </button>
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
                  <button onClick={confirmReplaceCart} className="w-full py-4 rounded-xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-600/20 hover:bg-rose-500 transition-all">
                    Da, golește coșul
                  </button>
                  <button onClick={goToCheckout} className="w-full py-4 rounded-xl bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all">
                    Comandă piesele prima dată
                  </button>
                  <button onClick={cancelModal} className="w-full py-3 text-gray-500 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-all mt-2">
                    Renunță
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
};