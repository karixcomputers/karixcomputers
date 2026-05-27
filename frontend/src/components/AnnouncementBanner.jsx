import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom"; // Am schimbat cu Link
import { apiFetch } from "../api/client";

const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = useState([]);
  const location = useLocation();

  useEffect(() => {
    const fetchActiveAnnouncements = async () => {
      try {
        const res = await apiFetch("/announcements/active");
        if (res.ok) {
          const data = await res.json();
          setAnnouncements(data);
        }
      } catch (err) {
        console.error("Eroare la încărcarea bannerelor:", err);
      }
    };
    fetchActiveAnnouncements();
  }, []);

  const activeBanners = announcements.filter(
    (a) => a.targetPage === "all" || a.targetPage === location.pathname
  );

  if (activeBanners.length === 0) return null;

  return (
    // Container principal pentru a poziționa bannerele (float deasupra)
    <div className="w-full flex flex-col items-center gap-2 pt-6 pb-2 z-50 relative pointer-events-none">
      {activeBanners.map((banner) => {
        const styles = {
          info: "bg-indigo-500/10 border-indigo-500/20 text-indigo-300",
          promo: "bg-pink-500/10 border-pink-500/20 text-pink-300",
          warning: "bg-amber-500/10 border-amber-500/20 text-amber-300"
        };

        const bannerStyle = styles[banner.type] || styles.info;

        return (
          <div 
            key={banner.id} 
            className={`pointer-events-auto px-6 py-2 rounded-full border backdrop-blur-md shadow-lg transition-all hover:scale-[1.02] ${bannerStyle}`}
          >
            {banner.link ? (
              <Link to={banner.link} className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest italic">
                {banner.text} 
                <span className="opacity-50">➔</span>
              </Link>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-widest italic">
                {banner.text}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AnnouncementBanner;