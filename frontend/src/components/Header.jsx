import React, { useMemo, useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";

/**
 * Componentă pentru elementele de navigare (Desktop și Mobil).
 * Aceasta gestionează starea de "activ" și stilizarea hover.
 */
function Item({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `text-[15px] font-medium tracking-wide px-4 py-3 rounded-xl transition-all duration-300 block md:inline-block ${
          isActive
            ? "text-white bg-white/10 shadow-sm shadow-white/5"
            : "text-gray-400 hover:text-white hover:bg-white/5"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

/**
 * Componenta principală Header a platformei Karix Computers.
 * Include logica de Admin, Cart, Auth, Wishlist și Meniu Mobil cu Slide-in.
 */
export default function Header() {
  const nav = useNavigate();
  const { items } = useCart();
  const { user, logout } = useAuth();
  const { wishlist } = useWishlist();

  // Calculăm numărul total de unități din coș folosind useMemo pentru performanță
  const count = useMemo(() => items.reduce((s, x) => s + x.qty, 0), [items]);

  // State-uri pentru gestionarea vizibilității elementelor de interfață
  const [open, setOpen] = useState(false); // Pentru dropdown-ul "Cont" pe Desktop
  const [mobileOpen, setMobileOpen] = useState(false); // Pentru Drawer-ul (sertarul) de mobil

  const menuRef = useRef(null);

  /**
   * Închide toate meniurile deschise (folosit la navigare sau click pe overlay).
   */
  const closeMenus = () => {
    setOpen(false);
    setMobileOpen(false);
  };

  /**
   * Hook pentru a gestiona închiderea meniului de cont atunci când se dă click
   * în afara acestuia (util pentru Desktop).
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (open && menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  /**
   * Hook pentru blocarea scroll-ului paginii principale atunci când meniul 
   * mobil (Slide Drawer) este activ. Previne "leak-ul" de scroll.
   */
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [mobileOpen]);

  const isAdmin = user?.role === "admin";

  return (
    <>
      {/* BARA DE NAVIGARE PRINCIPALĂ (Sticky)
          Are un efect de blur pe fundal (backdrop-blur) pentru aspect premium.
      */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0b1020]/80 backdrop-blur-md">
        
        {/* MOD ADMIN: Afișează scurtături către gestionare dacă userul are permisiuni */}
        {isAdmin && (
          <div className="bg-indigo-600/90 text-white py-1.5 px-6 flex items-center justify-between border-b border-indigo-500/30">
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 shrink-0">
                <span className="animate-pulse w-2 h-2 bg-white rounded-full"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mod Admin</span>
              </div>
              
              <div className="flex items-center gap-4 shrink-0">
                <Link to="/admin/inventory" className="text-[9px] font-bold uppercase tracking-widest text-indigo-100 hover:text-white transition-colors whitespace-nowrap">📦 Inventar</Link>
                <Link to="/admin" className="text-[9px] font-bold uppercase tracking-widest text-indigo-100 hover:text-white transition-colors whitespace-nowrap">Comenzi</Link>
                <Link to="/admin/service" className="text-[9px] font-bold uppercase tracking-widest text-indigo-100 hover:text-white transition-colors whitespace-nowrap">🛠️ Service</Link>
                <Link to="/admin/returns" className="text-[9px] font-bold uppercase tracking-widest text-indigo-100 hover:text-white transition-colors whitespace-nowrap">↩️ Retururi</Link>
                <Link to="/admin/warranties" className="text-[9px] font-bold uppercase tracking-widest text-indigo-100 hover:text-white transition-colors whitespace-nowrap">🛡️ Garanții</Link>
                <Link to="/admin/tickets" className="text-[9px] font-bold uppercase tracking-widest text-indigo-100 hover:text-white transition-colors whitespace-nowrap">🎫 Tichete</Link>
                <Link to="/admin/coupons" className="text-[9px] font-bold uppercase tracking-widest text-indigo-100 hover:text-white transition-colors whitespace-nowrap">🎟️ Cupoane</Link>
                <Link to="/admin/reviews" className="text-[9px] font-bold uppercase tracking-widest text-indigo-100 hover:text-white transition-colors whitespace-nowrap">💬 Review-uri</Link>
                <Link to="/admin/configurator" className="text-[9px] font-bold uppercase tracking-widest text-indigo-100 hover:text-white transition-colors whitespace-nowrap">🛠️ Configurator</Link>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          
          {/* LOGO KARIX COMPUTERS
              Acum textul este vizibil permanent, inclusiv pe mobil.
          */}
          <div className="flex-1 flex justify-start">
            <Link 
              to="/" 
              onClick={closeMenus} 
              className="flex items-center gap-2 shrink-0 group transition-transform duration-300 ease-out hover:scale-105"
            >
              <img 
                src="/logo.png" 
                alt="Karix Logo" 
                className="h-10 md:h-12 w-auto object-contain"
              />
              <div className="leading-none text-left flex flex-col justify-center">
                {/* Font redus ușor pe mobil (text-base) pentru a nu aglomera header-ul */}
                <div className="font-black tracking-tighter text-white text-base sm:text-lg uppercase">Karix</div>
                <div className="text-[9px] sm:text-[11px] font-medium text-gray-400 tracking-[0.2em] mt-0.5 uppercase">Computers</div>
              </div>
            </Link>
          </div>

          {/* NAVIGARE DESKTOP: Ascunsă sub pragul de 768px (md) */}
          <div className="flex-[5] hidden md:flex justify-center">
            <nav className="flex items-center gap-0.5 bg-white/5 p-1 rounded-2xl border border-white/5 whitespace-nowrap">
              <Item to="/shop">Sisteme PC</Item>
              <Item to="/configurator">Configurator PC</Item>
              <Item to="/servicii">Servicii</Item>
              <Item to="/suport">Suport</Item>
              <Item to="/contact">Contact</Item>
              
              <div className="w-px h-6 bg-white/10 mx-1" />

              {/* Iconiță Favorite (Desktop) */}
              <Link to="/wishlist" className="px-2.5 py-2 rounded-xl text-[15px] font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300 flex items-center">
                <span className="text-lg leading-none">❤️</span>
              </Link>

              {/* Coș de cumpărături (Desktop) */}
              <Link to="/cart" className="relative px-3 py-2 rounded-xl text-[15px] font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300 flex items-center">
                Coș
                {count > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center text-[10px] font-bold h-5 w-5 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 text-white border border-[#0b1020]">
                    {count}
                  </span>
                )}
              </Link>
            </nav>
          </div>

          {/* ACȚIUNI UTILIZATOR ȘI TRIGGER MOBIL */}
          <div className="flex-1 flex justify-end items-center gap-3">
            
            {/* Buton Cont (Desktop) */}
            <div className="hidden md:block relative" ref={menuRef}>
              {user ? (
                <>
                  <button
                    onClick={() => setOpen(v => !v)}
                    className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[15px] font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-300"
                  >
                    Cont
                  </button>
                  {open && (
                    <div className="absolute top-full right-0 mt-3 w-64 rounded-2xl overflow-hidden border border-white/10 bg-[#0b1020]/95 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                      {isAdmin && (
                        <div className="bg-indigo-500/5 border-b border-white/5">
                          <Link to="/admin" onClick={closeMenus} className="block px-5 py-4 text-[13px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-500/10 transition-colors">⚡ Admin Dashboard</Link>
                        </div>
                      )}
                      <Link to="/account" onClick={closeMenus} className="block px-5 py-3.5 text-[15px] text-gray-300 hover:text-white hover:bg-white/5 transition-colors">Profil</Link>
                      <Link to="/orders" onClick={closeMenus} className="block px-5 py-3.5 text-[15px] text-gray-300 hover:text-white hover:bg-white/5 transition-colors">Comenzile mele</Link>
                      <Link to="/account/warranties" onClick={closeMenus} className="block px-5 py-3.5 text-[15px] text-gray-300 hover:text-white hover:bg-white/5 transition-colors">Garanții</Link>
                      <Link to="/tickets" onClick={closeMenus} className="block px-5 py-3.5 text-[15px] text-gray-300 hover:text-white hover:bg-white/5 transition-colors">Tichete Suport</Link>
                      <div className="h-px bg-white/10 w-full" />
                      <button onClick={async () => { closeMenus(); await logout(); nav("/"); }} className="w-full text-left px-5 py-3.5 text-[15px] text-pink-500 hover:text-pink-400 hover:bg-white/5 transition-colors font-bold uppercase tracking-tighter">Logout</button>
                    </div>
                  )}
                </>
              ) : (
                <Link to="/auth/login" className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[13px] font-black uppercase tracking-widest text-gray-300 hover:text-white hover:bg-white/10 transition-all">Login</Link>
              )}
            </div>

            {/* BUTON BURGER (Mobil) - Deschide Slide Drawer-ul */}
            <button 
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-3 rounded-xl bg-white/5 border border-white/10 text-white active:scale-95 transition-all shadow-lg"
            >
              <span className="text-2xl block w-6 h-6 flex items-center justify-center">☰</span>
            </button>
          </div>
        </div>
      </header>

      {/* MENIU MOBIL CU EFECT SLIDE (Sertar lateral)
          AICI ESTE REPARAȚIA (Am adăugat pointer-events-none când e închis)
      */}
      <div 
        className={`fixed inset-0 z-[100] md:hidden transition-all duration-500 ${
          mobileOpen ? "visible pointer-events-auto" : "invisible pointer-events-none"
        }`}
      >
        {/* FUNDAL ÎNTUNECAT (Backdrop) - Facilitează contrastul și concentrarea pe meniu */}
        <div 
          className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-500 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeMenus}
        />

        {/* PANOU LATERAL (Drawer) - Glisează din dreapta în stânga */}
        <div 
          className={`absolute top-0 right-0 h-full w-[80%] max-w-[320px] bg-[#0b1020] border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] transition-transform duration-500 ease-in-out flex flex-col ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Header Sertar: Include Logo și butonul de închidere (X) */}
          <div className="p-6 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
              <span className="font-black text-white text-xs uppercase tracking-widest">Karix Computers</span>
            </div>
            <button 
              onClick={closeMenus}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-white active:bg-white/10"
            >
              ✕
            </button>
          </div>

          {/* Conținut Navigare: Lista de link-uri și categorii */}
          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4">
            
            {isAdmin && (
              <Link 
                to="/admin" 
                onClick={closeMenus} 
                className="flex items-center p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black uppercase tracking-widest text-[11px]"
              >
                🛡️ Mod Admin Activ
              </Link>
            )}

            <nav className="flex flex-col gap-2">
              <Item to="/shop" onClick={closeMenus}>Sisteme PC</Item>
              <Item to="/configurator" onClick={closeMenus}>Configurator PC</Item>
              <Item to="/servicii" onClick={closeMenus}>Servicii</Item>
              <Item to="/suport" onClick={closeMenus}>Suport</Item>
              <Item to="/contact" onClick={closeMenus}>Contact</Item>

              <div className="h-px bg-white/5 my-4" />

              {/* Link Wishlist (Mobil) */}
              <Link 
                to="/wishlist" 
                onClick={closeMenus} 
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 text-white font-bold "
              >
                <span>Produse Favorite</span>
              </Link>

              {/* Link Coș (Mobil) */}
              <Link 
                to="/cart" 
                onClick={closeMenus} 
                className="flex items-center justify-between p-4 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/20"
              >
                <span>Coșul meu</span>
                {count > 0 && <span className="h-6 w-6 rounded-full bg-white text-indigo-600 flex items-center justify-center text-[11px] font-black">{count}</span>}
              </Link>
            </nav>

            <div className="h-px bg-white/5 my-6" />

            {/* Secțiune Cont Client: Logica de Logat vs Nelogat */}
            <div className="space-y-2">
              {user ? (
                <>
                  <p className="px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Contul meu</p>
                  <Link to="/account" onClick={closeMenus} className="block p-4 rounded-xl text-gray-300 hover:text-white transition-colors bg-white/5">Profil</Link>
                  <Link to="/orders" onClick={closeMenus} className="block p-4 rounded-xl text-gray-300 hover:text-white transition-colors bg-white/5">Comenzile mele</Link>
                  <Link to="/account/warranties" onClick={closeMenus} className="block p-4 rounded-xl text-gray-300 hover:text-white transition-colors bg-white/5">Garanții</Link>
                  <Link to="/tickets" onClick={closeMenus} className="block p-4 rounded-xl text-gray-300 hover:text-white transition-colors bg-white/5">Tichete Suport</Link>
                  
                  <button 
                    onClick={async () => { closeMenus(); await logout(); nav("/"); }}
                    className="w-full text-left p-4 rounded-xl text-pink-500 font-black uppercase tracking-tighter bg-pink-500/5 mt-4"
                  >
                    Logout (Deconectare)
                  </button>
                </>
              ) : (
                <Link 
                  to="/auth/login" 
                  onClick={closeMenus} 
                  className="block w-full text-center py-4 rounded-2xl bg-white text-[#0b1020] font-black uppercase tracking-widest text-[12px] shadow-xl shadow-white/5"
                >
                  Autentificare / Creare Cont
                </Link>
              )}
            </div>
          </div>

          {/* Footer Drawer: Element decorativ */}
          <div className="p-8 border-t border-white/5 text-center">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">
              Built for Performance ⚡
            </p>
          </div>
        </div>
      </div>
    </>
  );
}