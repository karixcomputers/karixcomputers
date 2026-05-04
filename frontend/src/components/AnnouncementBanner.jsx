import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { apiFetch } from "../api/client"; // ajustează calea

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
        console.error("Nu am putut prelua anunțurile:", err);
      }
    };
    fetchBanners();
  }, []);

  // Filtrăm anunțurile: să fie destinate pentru pagina curentă (sau 'all') și să nu fi fost închise manual de user
  const visibleAnnouncements = announcements.filter(a => {
    const isForThisPage = a.targetPage === "all" || a.targetPage === location.pathname;
    const isNotClosed = !closedIds.includes(a.id);
    return isForThisPage && isNotClosed;
  });

  if (visibleAnnouncements.length === 0) return null;

  return (
    <div className="w-full relative z-[100]">
      {visibleAnnouncements.map((announcement) => {
        // Stiluri diferite în funcție de tip
        let bgStyle = "bg-indigo-600 border-b border-indigo-500 text-white"; // default info
        if (announcement.type === "promo") bgStyle = "bg-gradient-to-r from-pink-600 to-purple-600 border-b border-pink-500 text-white";
        if (announcement.type === "warning") bgStyle = "bg-amber-600 border-b border-amber-500 text-black";

        const BannerContent = () => (
          <div className={`relative px-4 py-2 flex items-center justify-center gap-4 ${bgStyle}`}>
            <p className="text-[11px] md:text-xs font-black uppercase tracking-widest text-center px-6">
              {announcement.text}
            </p>
            <button 
              onClick={(e) => {
                e.preventDefault();
                setClosedIds([...closedIds, announcement.id]);
              }}
              className="absolute right-4 text-inherit opacity-70 hover:opacity-100 hover:scale-110 transition-all font-bold"
            >
              ✕
            </button>
          </div>
        );

        return announcement.link ? (
          <Link key={announcement.id} to={announcement.link} className="block w-full">
            <BannerContent />
          </Link>
        ) : (
          <div key={announcement.id} className="w-full">
            <BannerContent />
          </div>
        );
      })}
    </div>
  );
}