import fs from "fs";
import path from "path";
import { transporter } from "../config/mailer.js";
import { env } from "../config/env.js";

/**
 * Încarcă un template HTML folosind o cale absolută sigură.
 */
function loadTemplate(name) {
  try {
    const p = path.resolve(process.cwd(), "src", "templates", name);
    if (!fs.existsSync(p)) {
      console.error(`❌ TEMPLATE MISSING: Fișierul nu există la calea: ${p}`);
      throw new Error(`Template not found: ${name}`);
    }
    return fs.readFileSync(p, "utf8");
  } catch (err) {
    console.error(`❌ LOAD TEMPLATE ERROR (${name}):`, err.message);
    throw err;
  }
}

/**
 * Înlocuiește variabilele de tip {{cheie}} sau {{CHEIE_SNAKE}} cu valori reale
 */
function render(tpl, vars = {}) {
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) {
    const val = String(v ?? ""); 
    out = out.split(`{{${k}}}`).join(val);
    const upperSnake = k.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
    out = out.split(`{{${upperSnake}}}`).join(val);
  }
  return out;
}

/**
 * Nucleul de trimitere mail
 */
export async function sendHtmlMail({ to, subject, html, attachments = [] }) {
  try {
    const recipient = to || env.ADMIN_EMAIL || env.MAIL_FROM;
    
    console.log(`✉️ Trimitere mail: [To: ${recipient}] [Subject: ${subject}]`);
    
    // Acum await-ul va funcționa corect
    const info = await transporter.sendMail({ 
      from: env.MAIL_FROM, 
      to: recipient, 
      subject, 
      html,
      attachments
    });
    
    console.log(`✅ MAIL SENT: ID ${info.messageId}`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error("❌ SMTP ERROR:", err?.message || err);
    return { ok: false, error: err?.message || "mail_failed" };
  }
}

/**
 * ============================================================
 * 🚀 NOU: UNIFIED ORDER SYSTEM (FUNCȚIA MASTER ADĂUGATĂ)
 * Această funcție decide singură ce template și subiect să folosească.
 * O poți folosi în noul flow din orders.routes.js
 * ============================================================
 */
export async function sendUnifiedOrderEmail(to, orderData, isAdmin = false) {
  try {
    // 0. Standardizăm produsele și denumirile
    const products = (orderData.cartItems || orderData.items || []).map(i => ({
      ...i,
      displayName: i.productName || i.name || "Produs/Serviciu Karix"
    }));

    // Verificăm dacă este Oradea
    const isOradea = orderData.pickupType === "KarixPersonal" || 
                     orderData.client?.city?.toLowerCase().includes("oradea");
    
    // 1. Detectăm tipul de conținut (Prioritizăm flag-ul isServiceOrder trimis din rute)
    const hasService = orderData.isServiceOrder === true || products.some(i => i.isServiceItem === true || i.category === 'service');
    const hasPC = products.some(i => !i.isServiceItem && i.category !== 'service');

    // LOG DE DEBUG (Apare în pm2 logs) - Verifică asta dacă mai ai probleme!
    console.log(`[MAIL SYSTEM] #${orderData.orderId}: hasService=${hasService}, hasPC=${hasPC}, isOradea=${isOradea}`);

    // 2. Alegem Template-ul și Subiectul
    let templateName = "orderPlaced.html"; // Default: Doar PC
    let subject = isAdmin ? "🟢 VÂNZARE NOUĂ" : "Confirmare Comandă - Karix Computers";

    if (hasService) {
      if (hasPC) {
        // MIXED (PC + Service)
        templateName = isOradea ? "oradeaHybridOrder.html" : "serviceOradeaNotification.html";
        subject = isAdmin ? "🟣 MIXED ORDER" : "Confirmare Comandă Mix (PC + Service) - Karix Computers";
      } else {
        // DOAR SERVICE
        templateName = isOradea ? "oradeaPickup.html" : "servicePlaced.html";
        subject = isAdmin ? "🛠️ SERVICE NOU" : "Instrucțiuni Expediere Service - Karix Computers";
      }
    } else if (isOradea && hasPC) {
      // Doar PC, dar în Oradea
      templateName = "oradeaDeliveryPC.html";
      subject = isAdmin ? "🟢 VÂNZARE PC (Oradea)" : "Livrare Personală în Oradea - Karix Computers";
    }

    // Dacă e mail pentru Admin, suprascriem template-ul dar păstrăm subiectul
    if (isAdmin) {
      templateName = "adminOrderNotification.html";
      subject = `${subject} #${orderData.id || orderData.orderId}`;
    }

    // 3. Generăm lista de produse HTML unificată
    const itemsHtml = products.map(item => {
      const s = item.specs || {}; 
      // Verificăm dacă e hardware sau serviciu pentru designul rândului
      const isActuallyService = item.isServiceItem || item.category === 'service';
      
      let details = !isActuallyService 
        ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 4px; font-style: italic;">⚡ PC</div>`
        : `<div style="font-size: 11px; color: #6366f1; margin-top: 4px; font-weight: bold; font-style: italic;">🛠️ Serviciu</div>`;
      
      const price = ((item.priceCentsAtBuy || item.priceCents || 0) / 100).toFixed(2);
      
      return `
        <tr>
          <td style="border-bottom: 1px solid #1e293b; padding: 15px 0; vertical-align: top;">
            <strong style="text-transform: uppercase; font-size: 13px; color: #ffffff !important;">${item.displayName}</strong> 
            <span style="color: #64748b; font-size: 11px;">(x${item.qty || 1})</span>
            ${details}
          </td>
          <td align="right" style="border-bottom: 1px solid #1e293b; color: #ffffff !important; font-weight: 800; padding: 15px 0; font-size: 14px; vertical-align: top;">${price} RON</td>
        </tr>
      `;
    }).join("");

    // 4. Secțiune Date B2B (PJ)
    let billingHtml = "";
    if (orderData.client?.isCompany) {
      billingHtml = `
        <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid #4f46e5; padding: 15px; border-radius: 12px; margin-top: 20px; text-align: left;">
          <strong style="color: #818cf8; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Date Facturare Firmă:</strong><br>
          <span style="color: #ffffff; font-size: 15px; font-weight: bold;">${orderData.client.companyName}</span><br>
          <span style="color: #94a3b8; font-size: 12px;">CUI: ${orderData.client.cui} | Reg. Com: ${orderData.client.regCom}</span>
        </div>
      `;
    }

    // 5. Discount Calculation
    let discountSectionHtml = "";
    const totalCents = orderData.total || orderData.totalCents || 0;
    if (orderData.couponCode) {
      const subtotal = products.reduce((acc, i) => acc + ((i.priceCentsAtBuy || i.priceCents || 0) * (i.qty || 1)), 0);
      const shipping = (subtotal >= 500000 || isOradea) ? 0 : 2500;
      const discountAmount = (subtotal + shipping) - totalCents;
      if (discountAmount > 0) {
        discountSectionHtml = `
          <tr>
            <td align="right" style="padding: 15px 12px; border-bottom: 1px solid #1e293b !important;">
              <span style="color: #10b981 !important; font-weight: bold; text-transform: uppercase; font-size: 10px;">Voucher (${orderData.couponCode}):</span>
            </td>
            <td align="right" style="padding: 15px 12px; border-bottom: 1px solid #1e293b !important;">
              <strong style="color: #10b981 !important; font-size: 14px;">-${(discountAmount/100).toFixed(2)} RON</strong>
            </td>
          </tr>
        `;
      }
    }

    const finalClientName = orderData.client?.isCompany ? orderData.client.companyName : (orderData.client?.name || orderData.customerName || "Client Karix");
    const finalAddress = orderData.shippingAddress || (orderData.client ? `${orderData.client.addressDetails}, ${orderData.client.city}, ${orderData.client.county}` : "Nespecificată");

    const tpl = loadTemplate(templateName);
    const html = render(tpl, {
      customerName: finalClientName,
      orderId: orderData.id || orderData.orderId,
      deliveryAddress: finalAddress,
      phone: orderData.client?.phone || orderData.phone || "Nespecificat",
      itemsList: itemsHtml,
      billingSection: billingHtml,
      discountSection: discountSectionHtml,
      total: (totalCents / 100).toFixed(2),
      finalTotal: (totalCents / 100).toFixed(2),
      date: new Date().toLocaleString('ro-RO'),
      accountUrl: `https://karixcomputers.ro/orders`
    });

    await sendHtmlMail({ 
        to: isAdmin ? (process.env.ADMIN_EMAIL || "karixcomputers@gmail.com") : to, 
        subject, 
        html 
    });

  } catch (err) {
    console.error("❌ Eroare sendUnifiedOrderEmail:", err);
  }
}

/**
 * Confirmare comandă principală (Factura) - PĂSTRATĂ INTACTĂ
 */
export async function sendOrderPlaced(to, orderData, isAdmin = false) {
  const templateName = isAdmin ? "adminOrderNotification.html" : "orderPlaced.html";
  const tpl = loadTemplate(templateName);

  // 1. Identificăm produsele (Frontend: cartItems | Backend: items)
  const products = orderData.cartItems || orderData.items || [];

  const itemsHtml = products.map(item => {
    const borderColor = "#1e293b";
    // Căutăm specificațiile (item.specs sau direct pe item)
    const s = item.specs || item; 
    const isHardwarePC = s.cpu || s.gpu || s.ram;

    let detailsContent = "";
    if (isHardwarePC) {
      detailsContent = `
        <div style="font-size: 11px; color: #94a3b8; margin-top: 4px; line-height: 1.4; font-style: italic;">
          ⚡ CPU: ${s.cpu || 'N/A'} | 🎮 GPU: ${s.gpu || 'N/A'} <br>
          📟 RAM: ${s.ram || 'N/A'} | 💾 SSD: ${s.storage || 'N/A'} <br>
          ❄️ CLR: ${s.cooler || 'N/A'} | 🔌 PSU: ${s.psu || 'N/A'}
        </div>
      `;
    } else {
      detailsContent = `
        <div style="font-size: 11px; color: #6366f1; margin-top: 4px; font-weight: bold; font-style: italic;">
          🛠️ Serviciu 
        </div>
      `;
    }

    // REPARAȚIE PREȚ: Căutăm orice variantă de preț vine din DB/Frontend
    const rawPrice = item.priceCentsAtBuy || item.priceCents || item.price || 0;
    const priceFormatted = (rawPrice / 100).toFixed(2);

    return `
      <tr>
        <td style="border-bottom: 1px solid ${borderColor}; padding: 15px 0; font-family: 'Segoe UI', Arial, sans-serif; color: #ffffff !important;">
          <strong style="text-transform: uppercase; font-size: 13px; color: #ffffff !important;">${item.productName || item.name || 'Produs'}</strong> 
          <span style="color: #64748b; font-size: 11px;">(x${item.qty || 1})</span>
          ${detailsContent}
        </td>
        <td align="right" style="border-bottom: 1px solid ${borderColor}; color: #ffffff !important; font-weight: 800; padding: 15px 0; font-size: 14px;">
          ${priceFormatted} RON
        </td>
      </tr>
    `;
  }).join("");

  // 2. Secțiunea de Discount
  let discountSectionHtml = "";
  const totalCents = orderData.total || orderData.totalCents || 0;
  
  if (orderData.couponCode) {
    const subtotal = products.reduce((acc, i) => acc + ((i.priceCentsAtBuy || i.priceCents || 0) * (i.qty || 1)), 0);
    const shipping = (subtotal >= 500000 || orderData.pickupType === "KarixPersonal") ? 0 : 2500;
    const discountAmountCents = (subtotal + shipping) - totalCents;

    if (discountAmountCents > 0) {
      discountSectionHtml = `
        <tr>
          <td style="padding: 15px 12px; text-align: right; border-bottom: 1px solid #1e293b !important;">
            <span style="color: #10b981 !important; font-weight: bold; text-transform: uppercase; font-size: 10px; letter-spacing: 1px;">
              Voucher Aplicat (${orderData.couponCode}):
            </span>
          </td>
          <td style="padding: 15px 12px; text-align: right; border-bottom: 1px solid #1e293b !important;">
            <strong style="color: #10b981 !important; font-size: 14px;">-${(discountAmountCents / 100).toFixed(2)} RON</strong>
          </td>
        </tr>
      `;
    }
  }

  // 3. Extragere date client (Fallback total)
  const name = orderData.client?.name || orderData.customerName || orderData.shippingName || "Client Karix";
  const phone = orderData.client?.phone || orderData.phone || orderData.shippingPhone || "Nespecificat";
  const address = orderData.shippingAddress || (orderData.client ? `${orderData.client.addressDetails}, ${orderData.client.city}, ${orderData.client.county}` : "Nespecificată");

  // 4. Render cu TOATE cheile posibile (ca să nu mai apară {{placeholder}})
  const finalTotalFormatted = (totalCents / 100).toFixed(2);

  const html = render(tpl, {
    customerName: name,
    orderId: orderData.id || orderData.orderId || "N/A",
    deliveryAddress: address,
    phone: phone,
    itemsList: itemsHtml,
    discountSection: discountSectionHtml,
    // Trimitem ambele variante de cheie ca să fim siguri
    total: finalTotalFormatted, 
    finalTotal: finalTotalFormatted, 
    accountUrl: `https://karixcomputers.ro/orders`,
    date: new Date().toLocaleString('ro-RO')
  });

  const subject = isAdmin 
    ? `🟢 VÂNZARE NOUĂ #${orderData.id || orderData.orderId} - ${name}`
    : `Confirmare Comandă #${orderData.id || orderData.orderId} - Karix Computers`;

  const recipient = isAdmin ? (process.env.ADMIN_EMAIL || "contact@karixcomputers.ro") : to;

  try {
    await sendHtmlMail({ to: recipient, subject, html });
  } catch (err) {
    console.error("Eroare mail:", err.message);
  }
}

/**
 * Service: Comandă plasată (Notificare Client) - PĂSTRATĂ INTACTĂ
 */
export async function sendServiceOrderPlaced(to, data) {
  try {
    const tpl = loadTemplate("servicePlaced.html");
    const html = render(tpl, {
      customerName: data.customerName,
      orderId: data.orderId,
      serviceList: data.serviceList || "Solicitare Service Karix Computers",
      deliveryAddress: data.deliveryAddress || "Predare personală Oradea",
      phone: data.phone || "Nespecificat",
      date: new Date().toLocaleString('ro-RO')
    });

    await sendHtmlMail({ 
      to, 
      subject: `Pregătește coletul! Trimitem noi curierul (#${data.orderId})`, 
      html 
    });
  } catch (err) {
    console.error("Error sending Service Order email:", err);
  }
}

/**
 * Service: Am intrat în posesia device-ului - PĂSTRATĂ INTACTĂ
 */
export async function sendServiceInPossessionEmail(to, data) {
  try {
    const tpl = loadTemplate("serviceInPossession.html");
    const html = render(tpl, {
      customerName: data.customerName,
      orderId: data.orderId,
      date: new Date().toLocaleString('ro-RO')
    });
    await sendHtmlMail({ 
      to, 
      subject: `[Karix Computers] 📦 Dispozitivul tău a ajuns în laboratorul nostru! (#${data.orderId})`, 
      html 
    });
  } catch (err) { console.error("Error sendServiceInPossessionEmail:", err); }
}

/**
 * Service: Reparat / Finalizat - PĂSTRATĂ INTACTĂ
 */
export async function sendServiceFinishedEmail(to, data) {
  try {
    const tpl = loadTemplate("serviceFinished.html");
    const html = render(tpl, {
      customerName: data.customerName,
      productName: data.productName,
      orderId: data.orderId,
      date: new Date().toLocaleString('ro-RO')
    });
    await sendHtmlMail({ 
      to, 
      subject: `[Karix Computers] ✨ Vești bune! Dispozitivul tău este GATA (#${data.orderId})`, 
      html 
    });
  } catch (err) { console.error("Error sendServiceFinishedEmail:", err); }
}

/**
 * Service: Expediat înapoi spre client (Retur) - PĂSTRATĂ INTACTĂ
 */
export async function sendServiceShippedBackEmail(to, data) {
  try {
    const tpl = loadTemplate("serviceShippedBack.html");
    const html = render(tpl, {
      customerName: data.customerName,
      awb: data.awb || "În curs de generare",
      orderId: data.orderId,
      date: new Date().toLocaleString('ro-RO')
    });
    await sendHtmlMail({ 
      to, 
      subject: `[Karix Computers] 🚚 Dispozitivul tău se întoarce acasă! (#${data.orderId})`, 
      html 
    });
  } catch (err) { console.error("Error sendServiceShippedBackEmail:", err); }
}

/**
 * Oradea Logic - PĂSTRATĂ INTACTĂ
 */
export async function sendOradeaPickupEmail(to, data) {
  try {
    const products = data.cartItems || data.items || [];

    const isServiceKeywords = ['service', 'mentenanta', 'curatare', 'reparatie', 'montaj', 'diagnosticare'];
    
    const hasPC = products.some(i => (i.specs && i.specs.cpu) || !isServiceKeywords.some(kw => (i.name || "").toLowerCase().includes(kw)));
    const hasService = products.some(i => isServiceKeywords.some(kw => (i.name || "").toLowerCase().includes(kw)));

    let templateName = "oradeaPickup.html";
    let subject = `Ridicare dispozitiv în Oradea (#${data.orderId}) - Karix Computers`;

    if (hasPC && hasService) {
      templateName = "oradeaHybridOrder.html";
      subject = `Livrare & Ridicare Service în Oradea (#${data.orderId}) - Karix Computers`;
    } else if (hasPC) {
      templateName = "oradeaDeliveryPC.html";
      subject = `Livrare în Oradea (#${data.orderId}) - Karix Computers`;
    }

    const name = data.client?.name || data.customerName || "Client Karix";
    const phone = data.client?.phone || data.phone || "Nespecificat";
    const address = data.deliveryAddress || 
                    (data.client ? `${data.client.addressDetails}, ${data.client.city}, ${data.client.county}` : "Adresă nespecificată");

    const tpl = loadTemplate(templateName);
    const html = render(tpl, {
      customerName: name,
      orderId: data.orderId,
      deliveryAddress: address,
      phone: phone,
      date: new Date().toLocaleString('ro-RO')
    });

    await sendHtmlMail({ to, subject, html });
  } catch (err) { 
    console.error("Error sendOradeaPickupEmail:", err); 
  }
}

/**
 * Status: Gata de livrare (PC-uri) - PĂSTRATĂ INTACTĂ
 */
export async function sendOrderReadyEmail(to, data) {
  try {
    const tpl = loadTemplate("orderready.html");
    const html = render(tpl, {
      customerName: data.customerName,
      orderId: data.orderId,
      date: new Date().toLocaleString('ro-RO')
    });
    await sendHtmlMail({ to, subject: `PC-ul tău este gata de livrare! 📦 (#${data.orderId})`, html });
  } catch (err) { console.error(err); }
}

/**
 * Status: Predat curier (PC-uri) - PĂSTRATĂ INTACTĂ
 */
export async function sendOrderShippedEmail(to, data) {
  try {
    const tpl = loadTemplate("ordershipped.html");
    const html = render(tpl, {
      customerName: data.customerName,
      orderId: data.orderId,
      awb: data.awb || "În curs de procesare",
      date: new Date().toLocaleString('ro-RO')
    });
    await sendHtmlMail({ to, subject: `Comanda ta a plecat! AWB: ${data.awb} 🚚`, html });
  } catch (err) { console.error(err); }
}

/**
 * Status: Comandă Anulată (Refund) - PĂSTRATĂ INTACTĂ
 */
export async function sendOrderCanceledEmail(to, data) {
  try {
    const tpl = loadTemplate("orderCanceled.html");
    const html = render(tpl, {
      customerName: data.customerName,
      orderId: data.orderId,
      total: data.total,
      date: new Date().toLocaleString('ro-RO')
    });

    await sendHtmlMail({ 
      to, 
      subject: `Anulare Comandă #${data.orderId} - Karix Computers`, 
      html 
    });
  } catch (err) {
    console.error("Error sendOrderCanceledEmail:", err);
  }
}

export async function sendVerifyEmail(to, verifyCode) {
  const tpl = loadTemplate("verifyEmail.html");
  const html = render(tpl, { verifyCode });
  await sendHtmlMail({ to, subject: `Cod activare: ${verifyCode}`, html });
}

export async function sendPaymentConfirmed(to, orderId) {
  const tpl = loadTemplate("paymentConfirmed.html");
  const html = render(tpl, { orderId });
  await sendHtmlMail({ to, subject: "Plată confirmată - Karix Computers", html });
}

export async function sendResetPassword(to, resetUrl, name = "client") {
  const tpl = loadTemplate("resetPassword.html");
  const html = render(tpl, { resetUrl, name });
  await sendHtmlMail({ to, subject: "Resetare parolă Karix Computers", html });
}

/**
 * Service: Ireparabil - PĂSTRATĂ INTACTĂ
 */
export async function sendServiceUnrepairableEmail(to, data) {
  try {
    const tpl = loadTemplate("serviceUnrepairable.html");
    const html = render(tpl, {
      customerName: data.customerName,
      productName: data.productName,
      orderId: data.orderId,
      date: new Date().toLocaleString('ro-RO')
    });
    await sendHtmlMail({ 
      to, 
      subject: `[Karix Computers] Detalii importante despre service-ul tău (#${data.orderId})`, 
      html 
    });
  } catch (err) { console.error("Error sendServiceUnrepairableEmail:", err); }
}

/**
 * TICKET: Client - Confirmare deschidere - PĂSTRATĂ INTACTĂ
 */
export async function sendTicketOpenedEmail(to, data) {
  const tpl = loadTemplate("ticketOpened.html");
  const html = render(tpl, {
    customerName: data.customerName,
    subject: data.subject,
    ticketId: data.ticketId,
    ticketUrl: `${env.CLIENT_URL}/tickets/${data.ticketId}`
  });
  await sendHtmlMail({ to, subject: `🎫 Tichet deschis: ${data.subject} (#${data.ticketId})`, html });
}

/**
 * TICKET: Admin - Notificare tichet nou - PĂSTRATĂ INTACTĂ
 */
export async function sendAdminTicketAlert(data) {
  try {
    const tpl = loadTemplate("adminNewTicket.html");
    const html = render(tpl, {
      ticketId: data.ticketId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      subject: data.subject,
      messagePreview: data.messagePreview,
      adminUrl: `${env.CLIENT_URL}/admin/tickets/${data.ticketId}`
    });

    const adminEmail = env.ADMIN_EMAIL || env.MAIL_FROM;

    await sendHtmlMail({ 
      to: adminEmail, 
      subject: `⚠️ TICHTET NOU [#${data.ticketId}] - ${data.subject}`, 
      html 
    });
  } catch (err) {
    console.error("Error sendAdminTicketAlert:", err);
  }
}

/**
 * TICKET: Răspuns nou - PĂSTRATĂ INTACTĂ
 */
export async function sendTicketResponseEmail(to, data) {
  const tpl = loadTemplate("ticketResponse.html");
  const html = render(tpl, {
    customerName: data.customerName,
    ticketId: data.ticketId,
    messagePreview: data.messagePreview.substring(0, 100),
    ticketUrl: `${env.CLIENT_URL}/tickets/${data.ticketId}`
  });
  await sendHtmlMail({ to, subject: `💬 Răspuns nou la tichetul #${data.ticketId}`, html });
}

/**
 * TICKET: Rezolvat - PĂSTRATĂ INTACTĂ
 */
export async function sendTicketResolvedEmail(to, data) {
  const tpl = loadTemplate("ticketResolved.html");
  const html = render(tpl, {
    customerName: data.customerName,
    ticketId: data.ticketId
  });
  await sendHtmlMail({ to, subject: `✅ Tichet rezolvat #${data.ticketId}`, html });
}

/* --- FUNCTII NOI SERVICE (ALERTE ADMIN - RAUL) --- PĂSTRATE INTACTE */

export async function sendAdminServiceCourierAlert(data) {
  try {
    const tpl = loadTemplate("serviceCourierNotification.html");
    const html = render(tpl, {
      productName: data.productName,
      orderId: data.orderId,
      customerName: data.customerName,
      customerPhone: data.customerPhone || data.phoneNumber,
      judet: data.judet,
      oras: data.oras,
      address: data.address,
      preferredDate: data.preferredDate
    });

    await sendHtmlMail({ 
      to: env.ADMIN_EMAIL, 
      subject: `🚚 SERVICE CURIER: ${data.customerName} - ${data.productName}`, 
      html 
    });
  } catch (err) {
    console.error("❌ Eroare sendAdminServiceCourierAlert:", err);
  }
}

export async function sendAdminServiceOradeaAlert(data) {
  try {
    const tpl = loadTemplate("serviceOradeaNotification.html");
    const html = render(tpl, {
      productName: data.productName,
      customerName: data.customerName,
      customerPhone: data.customerPhone || data.phoneNumber,
      preferredDate: data.preferredDate,
      issueDescription: data.issueDescription
    });

    await sendHtmlMail({ 
      to: env.ADMIN_EMAIL, 
      subject: `📍 SERVICE ORADEA: ${data.customerName}`, 
      html 
    });
  } catch (err) {
    console.error("❌ Eroare sendAdminServiceOradeaAlert:", err);
  }
}

/**
 * RETUR: Confirmare către Client (Bani + Ambalare) - PĂSTRATĂ INTACTĂ
 */
export async function sendReturnConfirmation(to, data) {
  try {
    const templateFile = data.method === 'personal' 
      ? "returnConfirmationPersonal.html" 
      : "returnConfirmation.html";

    const tpl = loadTemplate(templateFile);

    const html = render(tpl, {
      customerName: data.customerName,
      orderNumber: data.orderNumber,
      itemsList: data.itemsList,
      pickupAddress: data.pickupAddress,
      iban: data.iban,
      titular: data.titular,
      clientUrl: env.CLIENT_URL || 'http://localhost:5173'
    });

    const subject = data.method === 'personal'
      ? `[Karix Computers] Programare Ridicare Personală (#${data.orderNumber})`
      : `[Karix Computers] Instrucțiuni Retur și Rambursare (#${data.orderNumber})`;

    await sendHtmlMail({ to, subject, html });
    
  } catch (err) {
    console.error("❌ Eroare sendReturnConfirmation:", err);
  }
}

/**
 * RETUR: Alertă către Admin (Tine) - PĂSTRATĂ INTACTĂ
 */
export async function sendAdminReturnAlert(data) {
  try {
    const tpl = loadTemplate("adminReturnAlert.html");
    const html = render(tpl, {
      orderNumber: data.orderNumber,
      customerName: data.customerName,
      phoneNumber: data.phoneNumber,
      reason: data.reason,
      itemsList: data.itemsList,
      pickupAddress: data.pickupAddress,
      iban: data.iban,
      titular: data.titular,
      adminUrl: `${env.CLIENT_URL}/admin/returns` 
    });

    await sendHtmlMail({ 
      to: env.ADMIN_EMAIL || "karixcomputers@gmail.com", 
      subject: `⚠️ CERERE RETUR NOUĂ: #${data.orderNumber}`, 
      html 
    });
  } catch (err) {
    console.error("❌ Eroare sendAdminReturnAlert:", err);
  }
}

/**
 * RETUR: Recepționat OK - Totul e bine (Client) - PĂSTRATĂ INTACTĂ
 */
export async function sendReturnReceivedOkEmail(to, data) {
  try {
    const tpl = loadTemplate("return-received-ok.html");
    const html = render(tpl, { 
      customerName: data.customerName, 
      orderNumber: data.orderNumber 
    });
    await sendHtmlMail({ 
      to, 
      subject: `[Karix Computers] 📦 Dispozitiv recepționat - Totul este în regulă (#${data.orderNumber})`, 
      html 
    });
  } catch (err) { console.error("Eroare sendReturnReceivedOkEmail:", err); }
}

/**
 * RETUR: Recepționat cu Probleme - PĂSTRATĂ INTACTĂ
 */
export async function sendReturnReceivedIssuesEmail(to, data) {
  try {
    const tpl = loadTemplate("return-received-issues.html");
    const html = render(tpl, { 
      customerName: data.customerName, 
      orderNumber: data.orderNumber,
      description: data.description, 
      date: data.date || new Date().toLocaleDateString('ro-RO') 
    });

    await sendHtmlMail({ 
      to, 
      subject: `[Karix Computers] ⚠️ Probleme constatate la recepția returului (#${data.orderNumber})`, 
      html,
      attachments: data.attachments 
    });
  } catch (err) { console.error("Eroare sendReturnReceivedIssuesEmail:", err); }
}

/**
 * RETUR: Banii au fost plătiți (Client) - PĂSTRATĂ INTACTĂ
 */
export async function sendReturnPaidEmail(to, data) {
  try {
    const tpl = loadTemplate("return-paid.html");
    const html = render(tpl, { 
      customerName: data.customerName, 
      orderNumber: data.orderNumber, 
      iban: data.iban 
    });
    await sendHtmlMail({ 
      to, 
      subject: `[Karix Computers] ✅ Banii au fost trimiși! (#${data.orderNumber})`, 
      html 
    });
  } catch (err) { console.error("Eroare sendReturnPaidEmail:", err); }
}

export async function sendReturnRejectedEmail(to, data) {
  try {
    const tpl = loadTemplate("return-rejected.html");
    const html = render(tpl, { 
      customerName: data.customerName, 
      orderNumber: data.orderNumber 
    });
    await sendHtmlMail({ 
      to, 
      subject: `[Karix Computers] Cerere de retur respinsă (#${data.orderNumber})`, 
      html 
    });
  } catch (err) { console.error("Error sendReturnRejectedEmail:", err); }
}

/**
 * VARIANTA 2: Expediat înapoi spre client (cea cu AWB și template nou) - PĂSTRATĂ INTACTĂ
 */
export async function sendServiceShippedWithAwbEmail(to, data) {
  try {
    const tpl = loadTemplate("serviceShippedBackAwb.html");
    
    const html = render(tpl, {
      customerName: data.customerName,
      orderId: data.orderId,
      awb: data.awb || "În curs de procesare", 
      date: new Date().toLocaleDateString('ro-RO')
    });

    await sendHtmlMail({ 
      to, 
      subject: `🚚 Pachetul tău Karix a fost expediat! (AWB: ${data.awb})`, 
      html 
    });
  } catch (err) {
    console.error("❌ Eroare la trimiterea mail-ului cu AWB:", err);
  }
}

/**
 * Retur Respins: Trimitere AWB de înapoiere către client - PĂSTRATĂ INTACTĂ
 */
export async function sendReturnRejectedAwbEmail(to, data) {
  try {
    const tpl = loadTemplate("returnRejectedAwb.html");
    
    const html = render(tpl, {
      customerName: data.customerName,
      orderNumber: data.orderNumber,
      awb: data.awb,
      date: new Date().toLocaleDateString('ro-RO')
    });

    await sendHtmlMail({
      to,
      subject: `🚚 Informații expediere retur #${data.orderNumber}`,
      html
    });
  } catch (err) {
    console.error("❌ Eroare la trimiterea mail-ului cu AWB Retur:", err);
  }
}

export const sendConfiguratorEmail = async (data) => {
    try {
        const fs = await import('fs');
        const path = await import('path');
        
        const adminTemplatePath = path.resolve('src/templates/configurator_template.html');
        const clientTemplatePath = path.resolve('src/templates/configurator_client_template.html');
        
        let adminHtml = fs.readFileSync(adminTemplatePath, "utf8");
        let clientHtml = fs.readFileSync(clientTemplatePath, "utf8");

        const replacePlaceholders = (html) => {
            return html
                .replace(/{{user_email}}/g, data.user_email || '')
                .replace(/{{cpu}}/g, data.components?.cpu || 'Neselectat')
                .replace(/{{gpu}}/g, data.components?.gpu || 'Neselectat')
                .replace(/{{ram}}/g, data.components?.ram || 'Neselectat')
                .replace(/{{storage}}/g, data.components?.storage || 'Neselectat')
                .replace(/{{motherboard}}/g, data.components?.motherboard || 'Neselectat')
                .replace(/{{cooler}}/g, data.components?.cooler || 'Neselectat')
                .replace(/{{psu}}/g, data.components?.psu || 'Neselectat')
                .replace(/{{case}}/g, data.components?.case || 'Neselectat')
                .replace(/{{extra_info}}/g, data.extra_info || "Fără detalii suplimentare");
        };

        adminHtml = replacePlaceholders(adminHtml);
        clientHtml = replacePlaceholders(clientHtml);

        const senderEmail = env.SMTP_USER; 
        const adminReceiver = "karixcomputers@gmail.com"; 

        const adminSubject = `🔔 CONFIGURAȚIE NOUĂ - ${data.user_email}`;
        const adminMailOptions = {
            from: `"Karix Build" <${senderEmail}>`,
            to: adminReceiver, 
            subject: adminSubject,
            html: adminHtml,
            replyTo: data.user_email
        };

        const clientSubject = `Confirmare Configurare PC - Karix Computers`;
        const clientMailOptions = {
            from: `"Karix Computers" <${senderEmail}>`,
            to: data.user_email,
            subject: clientSubject,
            html: clientHtml
        };

        console.log(`✉️ Trimitere mail: [To: ${adminReceiver}] [Subject: ${adminSubject}]`);
        const infoAdmin = await transporter.sendMail(adminMailOptions);
        console.log(`✅ MAIL SENT TO ADMIN: ID ${infoAdmin.messageId}`);

        console.log(`✉️ Trimitere mail: [To: ${data.user_email}] [Subject: ${clientSubject}]`);
        const infoClient = await transporter.sendMail(clientMailOptions);
        console.log(`✅ MAIL SENT TO CLIENT: ID ${infoClient.messageId}`);

        return { success: true };
    } catch (error) {
        console.error("❌ Eroare mail service:", error.message);
        throw error;
    }
};

// Funcția pentru mail-ul de Bun Venit (Sincronizată cu restul sistemului) - PĂSTRATĂ INTACTĂ
export const sendWelcomeEmail = async (email, customerName) => {
  try {
    const tpl = loadTemplate("welcome.html");

    const html = render(tpl, {
      customerName: customerName
    });

    await sendHtmlMail({
      to: email,
      subject: 'Bun venit în universul Karix Computers! 🚀',
      html
    });

    console.log(`✅ Email de bun venit trimis către: ${email}`);
    return { success: true };

  } catch (error) {
    console.error("❌ Eroare la trimiterea email-ului de welcome:", error);
    return { success: false, error };
  }
};