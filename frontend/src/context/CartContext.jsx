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

  const addItem = (product) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.id === product.id);
      
      const actualPrice = product.priceCents || product.price || product.totalCents || 0;
      const qtyToAdd = product.qty || 1;

      if (exists) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + qtyToAdd } : i
        );
      }

      // --- LOGICA REPARATĂ PENTRU PRELUARE IMAGINE DIN ADMIN ---
      let finalImages = product.images || [];
      if (finalImages.length === 0) {
         if (product.imageUrl) finalImages = [product.imageUrl];
         else if (product.image) finalImages = [product.image];
      }
      
      // Salvăm explicit și imageUrl pentru a fi siguri că e accesibil în UI
      const finalImageUrl = product.imageUrl || finalImages[0] || null;

      return [...prev, { 
        id: product.id, 
        productName: product.name || product.productName, 
        name: product.name || product.productName,
        category: product.category || "pc",
        priceCents: actualPrice,
        priceCentsAtBuy: actualPrice,
        images: finalImages, 
        imageUrl: finalImageUrl, // Adăugat explicit aici!
        specs: product.specs || {},
        warrantyMonths: product.warrantyMonths, 
        qty: qtyToAdd 
      }];
    });
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

  return (
    <CartContext.Provider value={{ items, addItem, addToCart, removeFromCart, updateQty, totalCents, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};