import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
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

  // Filtram anunțurile: arătăm cele pentru "all" sau cele specifice paginii curente
  const activeBanners = announcements.filter(
    (a) => a.targetPage === "all" || a.targetPage === location.pathname
  );

  if (activeBanners.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-1 z-50 relative">
      {activeBanners.map((banner) => {
        // Determinăm culorile bazate pe tipul anunțului
        const styles = {
          info: "bg-indigo-600/90 text-white",
          promo: "bg-pink-600/90 text-white",
          warning: "bg-amber-500/90 text-black"
        };

        const bannerStyle = styles[banner.type] || styles.info;

        return (
          <div 
            key={banner.id} 
            className={`w-full px-4 py-3 text-center text-xs font-black uppercase tracking-[0.2em] backdrop-blur-md ${bannerStyle}`}
          >
            {banner.link ? (
              <a href={banner.link} className="hover:underline italic flex items-center justify-center gap-2">
                {banner.text} ➔
              </a>
            ) : (
              <span className="italic">{banner.text}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AnnouncementBanner;