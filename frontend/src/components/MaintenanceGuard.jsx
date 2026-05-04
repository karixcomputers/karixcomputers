import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Maintenance from '../pages/Maintenance';

export default function MaintenanceGuard({ children }) {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);
  const location = useLocation();

  // 1. Definim o parolă secretă pentru tine
  const BYPASS_SECRET = "karix-admin-acces-rapid"; 

  // 2. Setăm dacă site-ul e în mentenanță sau nu (Schimbi în `true` când vrei să-l închizi)
  // Într-o variantă mai avansată, acest `true/false` l-ai lua din baza de date printr-un API call.
  const MAINTENANCE_MODE_ACTIVE = true; // 👉 SCHIMBĂ AICI CÂND VREI SĂ PUI SITE-UL ÎN MENTENANȚĂ

  useEffect(() => {
    // Verificăm dacă ai parola în URL (ex: karixcomputers.ro/?bypass=karix-admin-acces-rapid)
    const queryParams = new URLSearchParams(location.search);
    const bypassToken = queryParams.get("bypass");

    // Dacă ai folosit link-ul cu parola, salvăm în LocalStorage ca să poți naviga liniștit
    if (bypassToken === BYPASS_SECRET) {
      localStorage.setItem("maintenance_bypass", "true");
      setIsBypassed(true);
      // Opțional: Curățăm URL-ul ca să nu vadă alții parola dacă faci screen share
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // Verificăm dacă ai fost deja validat în trecut
      const savedBypass = localStorage.getItem("maintenance_bypass");
      if (savedBypass === "true") {
        setIsBypassed(true);
      }
    }

    setIsMaintenance(MAINTENANCE_MODE_ACTIVE);
  }, [location]);

  // Dacă site-ul e în mentenanță ȘI tu NU ai parola, arătăm ecranul de "În Lucru"
  if (isMaintenance && !isBypassed) {
    return <Maintenance />;
  }

  // Altfel, site-ul merge normal
  return children;
}