import React, { createContext, useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Import necesar pentru butonul de Login
import { apiFetch } from '../api/client';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false); // State pentru modalul stilizat
  const { user } = useAuth();

  const fetchWishlist = async () => {
    if (!user) return;
    try {
      const res = await apiFetch("/wishlist");
      if (res.ok) setWishlist(await res.json());
    } catch (err) {
      console.error("Eroare la încărcarea wishlist-ului:", err);
    }
  };

  useEffect(() => { 
    if (user) fetchWishlist(); 
    else setWishlist([]); // Resetăm lista dacă userul se deloghează
  }, [user]);

  const toggleWishlist = async (productId) => {
    if (!user) {
      // REPARAȚIE: În loc de alert, declanșăm modalul vizual
      setShowAuthModal(true);
      return;
    }

    const res = await apiFetch("/wishlist/toggle", {
      method: "POST",
      body: JSON.stringify({ productId })
    });

    if (res.ok) fetchWishlist();
  };

  const isFavorite = (id) => wishlist.some(item => item.id === id);

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isFavorite }}>
      {children}

      {/* --- MODAL AUTENTIFICARE WISHLIST (STIL KARIX) --- */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 backdrop-blur-md bg-black/60">
          <div className="relative w-full max-w-md bg-[#0b1020]/90 backdrop-blur-2xl border border-white/10 p-10 rounded-[40px] text-center shadow-2xl animate-in zoom-in-95 duration-300">
            
            {/* Element Decorativ Animăluț/Iconiță */}
            <div className="h-20 w-20 rounded-[28px] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 mx-auto mb-6 flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/20">
              ❤️
            </div>

            <h2 className="text-2xl font-black text-white mb-3 italic uppercase tracking-tight">
              Păstrează <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Performanța</span> aproape
            </h2>
            
            <p className="text-gray-400 text-sm mb-10 leading-relaxed font-medium">
              Trebuie să fii conectat în contul tău Karix pentru a salva produsele favorite și a le accesa de pe orice dispozitiv.
            </p>

            <div className="flex flex-col gap-3">
              <Link 
                to="/auth/login" 
                onClick={() => setShowAuthModal(false)}
                className="w-full py-5 rounded-2xl font-black text-[#0b1020] bg-white hover:bg-indigo-500 hover:text-white transition-all shadow-xl uppercase tracking-widest text-[11px]"
              >
                Autentificare
              </Link>
              
              <button 
                onClick={() => setShowAuthModal(false)} 
                className="w-full py-4 rounded-2xl font-black text-gray-500 hover:text-white transition-all uppercase tracking-widest text-[10px]"
              >
                Mai târziu
              </button>
            </div>
          </div>
        </div>
      )}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);