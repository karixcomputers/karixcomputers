import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { apiFetch } from "../api/client"; 

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
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
    return a.targetPage === "all" || a.targetPage === location.pathname;
  });

  if (visibleAnnouncements.length === 0) return null;

  return (
    // Container cu padding-top pentru a nu fi ascuns sub header-ul fixed
    // Flex-col și items-center pentru a centra capsulele perfect pe mijloc
    <div className="w-full max-w-6xl mx-auto px-4 pt-[115px] md:pt-[135px] -mb-12 md:-mb-16 relative z-[45] flex flex-col items-center gap-4 animate-in slide-in-from-top-6 fade-in duration-700">
      {visibleAnnouncements.map((a) => {
        
        let boxStyle = "bg-indigo-500/10 border-indigo-500/30";
        let glowStyle = "bg-indigo-500/20";
        let icon = "✨";
        let textGradient = "from-indigo-300 via-indigo-100 to-cyan-300";
        
        if (a.type === "promo") {
          boxStyle = "bg-pink-500/10 border-pink-500/30";
          glowStyle = "bg-pink-500/20";
          icon = "🔥";
          textGradient = "from-pink-300 via-purple-100 to-purple-300";
        }
        if (a.type === "warning") {
          boxStyle = "bg-amber-500/10 border-amber-500/30";
          glowStyle = "bg-amber-500/20";
          icon = "⚡";
          textGradient = "from-amber-200 via-amber-50 to-yellow-200";
        }

        const BannerContent = () => (
          <div className="relative group cursor-pointer">
            {/* Ambient Glow (Umbra colorată din spate) */}
            <div className={`absolute inset-0 rounded-full blur-md opacity-60 group-hover:opacity-100 transition-opacity duration-500 ${glowStyle}`}></div>
            
            {/* Capsula propriu-zisă */}
            <div className={`relative px-6 py-2.5 sm:py-3 flex items-center justify-center gap-3 sm:gap-4 rounded-full border backdrop-blur-2xl transition-transform duration-500 group-hover:scale-[1.02] ${boxStyle}`}>
              
              <div className="text-lg sm:text-xl drop-shadow-lg animate-pulse">
                {icon}
              </div>
              
              <p className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r ${textGradient}`}>
                {a.text}
              </p>

              {/* Săgeată subtilă dacă anunțul conține un link */}
              {a.link && (
                <span className="text-white/40 group-hover:text-white transition-colors duration-300 ml-1 sm:ml-2">
                  →
                </span>
              )}

            </div>
          </div>
        );

        return a.link ? (
          <Link key={a.id} to={a.link} className="inline-block max-w-full">
            <BannerContent />
          </Link>
        ) : (
          <div key={a.id} className="inline-block max-w-full">
            <BannerContent />
          </div>
        );
      })}
    </div>
  );
}