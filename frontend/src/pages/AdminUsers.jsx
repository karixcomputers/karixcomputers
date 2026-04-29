import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client"; // Ajustează calea dacă e diferită
import SEO from "../components/SEO"; // Ajustează calea dacă e diferită

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Asigură-te că ruta corespunde cu ce ai în backend
        const res = await apiFetch("/users/admin-all"); 
        if (!res.ok) throw new Error("Eroare la preluarea clienților.");
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Funcția de filtrare pentru Search Bar (caută după Nume, Email sau Telefon)
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const lowerSearch = searchTerm.toLowerCase();
    return users.filter(user => 
      (user.name && user.name.toLowerCase().includes(lowerSearch)) ||
      (user.email && user.email.toLowerCase().includes(lowerSearch)) ||
      (user.phone && user.phone.includes(lowerSearch))
    );
  }, [users, searchTerm]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <SEO title="Gestiune Clienți - Admin Karix" />

      <div className="min-h-screen pt-32 pb-24 px-4 md:px-8 bg-transparent text-white relative text-left font-sans">
        <div className="max-w-6xl mx-auto relative z-10">
          
          {/* HEADER */}
          <header className="mb-12 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
            <div>
              <h1 className="text-5xl font-black italic uppercase tracking-tighter drop-shadow-2xl">
                Gestiune <span className="text-indigo-400">Clienți</span>
              </h1>
              <p className="text-gray-400 font-medium uppercase text-[10px] tracking-[0.2em] mt-2">
                Baza de date conturi & utilizatori
              </p>
            </div>
            <Link 
              to="/admin" 
              className="text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-6 py-3 rounded-2xl hover:bg-white/10 transition-all backdrop-blur-md w-fit"
            >
              ← Panou Control
            </Link>
          </header>

          {error && (
            <div className="mb-8 p-4 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-400 text-sm font-bold text-center">
              {error}
            </div>
          )}

          {/* STATISTICI & SEARCH BAR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            
            {/* Caseta cu Numărul Total */}
            <div className="p-8 rounded-[35px] bg-gradient-to-br from-indigo-600 to-purple-700 shadow-2xl flex flex-col justify-center items-center text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/80 block mb-2">Total Conturi Înregistrate</span>
                <span className="text-6xl font-black italic tracking-tighter">{users.length}</span>
              </div>
            </div>

            {/* Bara de Search */}
            <div className="lg:col-span-2 p-8 rounded-[35px] bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col justify-center">
              <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4 block italic">Căutare Rapidă</label>
              <div className="relative w-full">
                <input 
                  type="text" 
                  placeholder="Caută după Nume, Email sau Telefon..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0b1020]/50 border border-white/10 rounded-2xl py-4 px-6 pl-14 text-white font-medium outline-none focus:border-indigo-500/50 transition-all shadow-inner"
                />
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 text-xl">
                  🔍
                </div>
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm("")}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* LISTA DE UTILIZATORI */}
          <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl">
            <div className="flex justify-between items-center mb-6 px-2">
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">
                Rezultate ({filteredUsers.length})
              </h2>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-white/10 rounded-[30px] bg-black/20">
                <p className="text-gray-500 font-black italic uppercase tracking-widest text-xs">
                  Nu s-a găsit niciun utilizator.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-4 p-5 rounded-3xl bg-black/40 border border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.02] transition-all">
                    
                    {/* AVATAR */}
                    <div className="h-14 w-14 shrink-0 rounded-full border-2 border-white/10 overflow-hidden bg-[#161e31] flex items-center justify-center">
                      {u.avatar ? (
                        <img src={u.avatar} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-lg text-gray-500 font-black uppercase">
                          {u.name ? u.name.charAt(0) : "?"}
                        </span>
                      )}
                    </div>

                    {/* DETALII UTILIZATOR */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white text-sm truncate uppercase tracking-tight">
                          {u.name || "Fără Nume"}
                        </h3>
                        {u.role === "admin" && (
                          <span className="px-2 py-0.5 rounded-md bg-pink-500/20 border border-pink-500/30 text-pink-400 text-[8px] font-black uppercase tracking-widest shrink-0">
                            Admin
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-indigo-300 font-medium truncate mb-1">
                        {u.email}
                      </p>
                      
                      <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        {u.phone && <span>📞 {u.phone}</span>}
                        <span>📅 {new Date(u.createdAt).toLocaleDateString('ro-RO')}</span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}