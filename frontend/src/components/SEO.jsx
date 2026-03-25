import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, image, url }) {
  const siteName = "Karix Computers";
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const defaultDesc = "Calculatoare de performanță și service profesional în Oradea. Build-uri custom, mentenanță și suport tehnic de elită.";

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description || defaultDesc} />
      
      {/* Social Media (Facebook/WhatsApp) */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || defaultDesc} />
      <meta property="og:image" content={image || "/logo-share.png"} />
      <meta property="og:url" content={url || window.location.href} />
      <meta property="og:type" content="website" />
    </Helmet>
  );
}