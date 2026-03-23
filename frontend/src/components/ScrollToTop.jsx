import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  // useLocation ne anunță de fiecare dată când se schimbă URL-ul
  const { pathname } = useLocation();

  useEffect(() => {
    // Trimitem scroll-ul la coordonatele (0, 0) instantaneu
    window.scrollTo(0, 0);
  }, [pathname]); // Efectul rulează de fiecare dată când pathname se modifică

  return null; // Această componentă nu randează nimic vizual
}