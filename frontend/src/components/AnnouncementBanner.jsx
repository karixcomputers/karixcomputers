import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { apiFetch } from "../api/client"; 

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [closedIds, setClosedIds] = useState([]);
  const location = useLocation();

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await apiFetch("/announcements/active");
        if (res.ok) {
          const data = await res.json();
          setAnnouncements(data);
        }
      } catch (err) {
        console.error("Eroare preluare anunțuri:", err);
      }
    };
    fetchBanners();
  }, []);

  const visibleAnnouncements = announcements.filter(a => {
    const isForThisPage = a.targetPage === "all" || a.targetPage === location.pathname;
    const isNotClosed = !closedIds.includes(a.id);
    return isForThisPage && isNotClosed;
  });

  if (visibleAnnouncements.length === 0) return null;

  return (
    // Container cu padding-top pentru a nu fi ascuns sub header-ul fixed
    // și margin-bottom negativ pentru a nu adăuga prea mult spațiu gol (deoarece paginile au deja pt-32)
    <div className="w-full max-w-6xl mx-auto px-4 pt-[110px] md:pt-[130px] -mb-16 md:-mb-20 relative z-[45] animate-in slide-in-from-top-4 fade-in duration-500">
      <div className="flex flex-col gap-4">
        {visibleAnnouncements.map((a) => {
          
          let boxStyle = "bg-indigo-500/10 border-indigo-500/30 shadow-indigo-500/10";
          let icon = "💡";
          let textGradient = "from-indigo-300 to-indigo-100";
          
          if (a.type === "promo") {
            boxStyle = "bg-gradient-to-r from-pink-600/10 to-purple-600/10 border-pink-500/30 shadow-pink-500/10";
            icon = "🔥";
            textGradient = "from-pink-300 to-purple-100";
          }
          if (a.type === "warning") {
            boxStyle = "bg-amber-500/10 border-amber-500/30 shadow-amber-500/10";
            icon = "⚠️";
            textGradient = "from-amber-200 to-amber-50";
          }

          const BannerContent = () => (
            <div className={`relative px-6 py-5 flex flex-col sm:flex-row items-center sm:justify-start gap-4 rounded-[30px] border backdrop-blur-2xl shadow-2xl transition-all group ${boxStyle}`}>
              
              <div className="text-3xl drop-shadow-lg group-hover:scale-110 transition-transform">
                {icon}
              </div>
              
              <div className="flex-1 text-center sm:text-left pr-0 sm:pr-8">
                <p className={`text-sm md:text-base font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r ${textGradient}`}>
                  {a.text}
                </p>
              </div>

              <button 
                onClick={(e) => {
                  e.preventDefault();
                  setClosedIds([...closedIds, a.id]);
                }}
                className="absolute right-4 top-4 sm:top-1/2 sm:-translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all font-bold"
              >
                ✕
              </button>
            </div>
          );

          return a.link ? (
            <Link key={a.id} to={a.link} className="block w-full hover:-translate-y-1 transition-transform">
              <BannerContent />
            </Link>
          ) : (
            <div key={a.id} className="w-full">
              <BannerContent />
            </div>
          );
        })}
      </div>
    </div>
  );
}