import React from "react";
import { Link } from "react-router-dom";
// IMPORTĂM COMPONENTA SEO
import SEO from "../components/SEO";

const SOCIAL_PLATFORMS = [
  {
    name: "Instagram",
    username: "@karixcomputers",
    link: "https://www.instagram.com/karixcomputers",
    glassStyle: "border-pink-500/30 hover:bg-pink-500/10 shadow-pink-500/5",
    iconColor: "text-pink-500",
    icon: (
      <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    name: "WhatsApp",
    username: "0770 619 935",
    link: "https://wa.me/40770619935",
    glassStyle: "border-emerald-500/30 hover:bg-emerald-500/10 shadow-emerald-500/5",
    iconColor: "text-emerald-500",
    icon: (
      <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.438 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
      </svg>
    ),
  },
  {
    name: "TikTok",
    username: "@karixcomputers.ro",
    link: "https://www.tiktok.com/@karixcomputers.ro",
    glassStyle: "border-white/20 hover:bg-white/5 shadow-white/5",
    iconColor: "text-white",
    icon: (
      <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.84 1.2-.03 2.38-.74 2.91-1.81.33-.58.48-1.28.47-1.95V.02z" />
      </svg>
    ),
  },
  {
    name: "Discord",
    username: "Karix Community",
    link: "https://discord.gg/qb37FMcr7B",
    glassStyle: "border-[#5865F2]/40 hover:bg-[#5865F2]/10 shadow-[#5865F2]/10",
    iconColor: "text-[#5865F2]",
    icon: (
      <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.5468 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6524-.2475-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0958 2.1568 2.419 0 1.3332-.9555 2.419-2.157 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0958 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" />
      </svg>
    ),
  },
];

export default function Contact() {
  return (
    <>
      {/* SEO: CONTACT & SOCIAL MEDIA */}
      <SEO 
        title="Contact & Support Oradea"
        description="Ai nevoie de asistență tehnică, un build PC personalizat sau service profesional în Oradea? Contactează echipa Karix Computers prin WhatsApp, Instagram, Discord sau Email."
      />

      <div className="min-h-screen pt-32 pb-24 px-4 relative overflow-hidden bg-transparent">
        
        {/* Glows */}
        <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-pink-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h1 className="text-6xl md:text-7xl font-black text-white tracking-tighter mb-4 italic uppercase">
              Let's <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Connect</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium italic">
              Suntem online și gata să îți punem setup-ul pe picioare.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* INFO CONTACT */}
            <div className="lg:col-span-5 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {[
                  { label: "Email Oficial", val: "contact@karixcomputers.ro", icon: "📧", color: "indigo" },
                  { label: "Suport Telefon", val: "0770 619 935", icon: "📞", color: "pink" },
                  { label: "Sediu", val: "Oradea, Bihor, România", icon: "📍", color: "emerald" }
                ].map((item, idx) => (
                  <div key={idx} className="p-6 rounded-[24px] bg-white/[0.03] border border-white/10 backdrop-blur-xl flex items-center gap-5 group hover:bg-white/[0.06] transition-all">
                    <div className={`h-14 w-14 rounded-2xl bg-${item.color}-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}>{item.icon}</div>
                    <div className="text-left">
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{item.label}</p>
                      <p className="text-white font-bold text-lg">{item.val}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SOCIAL MEDIA PLATFORMS */}
            <div className="lg:col-span-7 space-y-5">
              {SOCIAL_PLATFORMS.map((platform) => (
                <a
                  key={platform.name}
                  href={platform.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between p-8 rounded-[32px] bg-white/[0.01] border backdrop-blur-sm transition-all duration-500 hover:scale-[1.02] group relative overflow-hidden ${platform.glassStyle}`}
                >
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex items-center gap-6 relative z-10">
                    <div className={`p-4 rounded-2xl bg-white/5 backdrop-blur-sm group-hover:scale-110 transition-transform duration-500 ${platform.iconColor}`}>
                      {platform.icon}
                    </div>
                    <div className="text-left">
                      <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">
                        {platform.name}
                      </h3>
                      <p className="text-gray-500 text-sm mt-1 font-medium tracking-tight">{platform.username}</p>
                    </div>
                  </div>

                  <div className="relative z-10 hidden sm:block">
                    <div className="h-12 w-12 rounded-full border border-white/10 flex items-center justify-center text-white/30 group-hover:text-white group-hover:border-white/40 transition-all duration-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </a>
              ))}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}