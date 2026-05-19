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
 * 🚀 UNIFIED ORDER SYSTEM (FUNCȚIA MASTER)
 * Include suport pentru PDF-uri (Factură SmartBill)
 * ============================================================
 */
export async function sendUnifiedOrderEmail(to, orderData, isAdmin = false, invoiceBuffer = null) {
  try {
    const products = (orderData.cartItems || orderData.items || []).map(i => ({
      ...i,
      displayName: i.productName || i.name || "Produs/Serviciu Karix"
    }));

    const rawAddress = (orderData.shippingAddress || (orderData.client ? `${orderData.client.addressDetails}, ${orderData.client.city}, ${orderData.client.county}` : "")).toLowerCase();
    
    // 👉 Verificăm dacă e FANbox (orice adresă care conține 'fanbox' sau metoda e fanbox)
    const isFanbox = orderData.pickupType === "fanbox" || orderData.serviceDeliveryMethod === "fanbox" || rawAddress.includes("fanbox");
    
    // 👉 Oradea doar dacă nu e fanbox
    const isOradea = !isFanbox && (orderData.pickupType === "KarixPersonal" || rawAddress.includes("oradea"));
    
    // 👉 Verificăm dacă e serviciu folosind lowercase și fără diacritice
    const hasService = orderData.isServiceOrder === true || products.some(i => {
        if (i.isServiceItem === true || i.category === 'service') return true;
        const n = (i.displayName || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return ['service', 'mentenanta', 'curatare', 'reparatie', 'drift', 'hall', 'stick'].some(kw => n.includes(kw));
    });
    
    const hasPC = products.some(i => !i.isServiceItem && i.category !== 'service' && !['service', 'mentenanta', 'curatare', 'reparatie', 'drift', 'hall', 'stick'].some(kw => (i.displayName || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(kw)));

    console.log(`[MAIL SYSTEM] #${orderData.orderId}: hasService=${hasService}, hasPC=${hasPC}, isOradea=${isOradea}, isFanbox=${isFanbox}`);

    let templateName = "orderPlaced.html"; 
    let subject = isAdmin ? "🟢 VÂNZARE NOUĂ" : "Confirmare Comandă - Karix Computers";

    if (hasService) {
      if (hasPC) {
        templateName = isOradea ? "oradeaHybridOrder.html" : "serviceOradeaNotification.html";
        subject = isAdmin ? "🟣 MIXED ORDER" : "Confirmare Comandă Mix (PC + Service) - Karix Computers";
      } else {
        // 👉 AICI ESTE PROTECȚIA! Dacă e FANbox și e mail către client, nu trimitem mail-ul ăsta vechi!
        if (isFanbox && !isAdmin) {
             console.log(`[MAIL SYSTEM] Interceptare: Comanda e FANbox, OPRIM sendUnifiedOrderEmail către client.`);
             return; 
        }
        templateName = isOradea ? "oradeaPickup.html" : "servicePlaced.html";
        subject = isAdmin ? "🛠️ SERVICE NOU" : "Instrucțiuni Expediere Service - Karix Computers";
      }
    } else if (isOradea && hasPC) {
      templateName = "oradeaDeliveryPC.html";
      subject = isAdmin ? "🟢 VÂNZARE PC (Oradea)" : "Livrare Personală în Oradea - Karix Computers";
    }

    // 👉 Dacă e plată prin transfer bancar și nu e admin, trimitem instrucțiunile cu Proforma!
    if (!isAdmin && orderData.paymentMethod === 'transfer_bancar' && !isFanbox) {
      templateName = "orderPlacedBankTransfer.html";
      subject = `Așteptăm Plata (Proformă Atașată) - Comanda #${orderData.id || orderData.orderId}`;
    }

    if (isAdmin) {
      templateName = "adminOrderNotification.html";
      subject = `${subject} #${orderData.id || orderData.orderId}`;
    }

    const itemsHtml = products.map(item => {
      const n = (item.displayName || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const isActuallyService = item.isServiceItem || item.category === 'service' || ['service', 'mentenanta', 'curatare', 'reparatie', 'drift', 'hall', 'stick'].some(kw => n.includes(kw));
      
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

    // --- REPARAȚIE LOGICĂ MATEMATICĂ (TOTAL VS SUBTOTAL) ---
    const totalCents = orderData.total || orderData.totalCents || 0;
    const subtotalCents = products.reduce((acc, i) => acc + ((i.priceCentsAtBuy || i.priceCents || 0) * (i.qty || 1)), 0);
    
    // Luăm shipping-ul din baza de date, dar dacă e 0 și Totalul e mai mare, calculăm diferența
    let realShippingCents = orderData.shippingCents ?? 0;
    if (realShippingCents === 0 && totalCents > subtotalCents) {
        realShippingCents = totalCents - subtotalCents;
    }

    const shippingValue = realShippingCents <= 0 ? "GRATUIT" : `${(realShippingCents / 100).toFixed(2)} RON`;
    const shippingSectionHtml = `
      <tr>
        <td align="right" style="padding: 15px 12px; border-bottom: 1px solid #1e293b !important;">
          <span style="color: #94a3b8 !important; text-transform: uppercase; font-size: 10px; letter-spacing: 1px;">Logistică:</span>
        </td>
        <td align="right" style="padding: 15px 12px; border-bottom: 1px solid #1e293b !important;">
          <strong style="color: #ffffff !important; font-size: 14px;">${shippingValue}</strong>
        </td>
      </tr>
    `;

    let discountSectionHtml = "";
    if (orderData.couponCode) {
      // Calculăm discount-ul folosind valoarea logistică reală pentru a păstra balanța
      const discountAmount = (subtotalCents + realShippingCents) - totalCents;
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
      shippingSection: shippingSectionHtml,
      total: (totalCents / 100).toFixed(2),
      finalTotal: (totalCents / 100).toFixed(2),
      date: new Date().toLocaleString('ro-RO'),
      accountUrl: `https://karixcomputers.ro/orders`
    });

    const mailOptions = { 
        to: isAdmin ? (process.env.ADMIN_EMAIL || "karixcomputers@gmail.com") : to, 
        subject, 
        html,
        attachments: []
    };

    if (invoiceBuffer) {
        mailOptions.attachments.push({
            filename: `Factura_Karix_${orderData.id || orderData.orderId}.pdf`,
            content: invoiceBuffer,
            contentType: 'application/pdf'
        });
    }

    await sendHtmlMail(mailOptions);

  } catch (err) {
    console.error("❌ Eroare sendUnifiedOrderEmail:", err);
  }
}

/**
 * Confirmare comandă principală
 */
export async function sendOrderPlaced(to, orderData, isAdmin = false) {
  const templateName = isAdmin ? "adminOrderNotification.html" : "orderPlaced.html";
  const tpl = loadTemplate(templateName);

  const products = orderData.cartItems || orderData.items || [];

  const itemsHtml = products.map(item => {
    const borderColor = "#1e293b";
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

  // Secțiune Logistică
  const shipCents = orderData.shippingCents || 0;
  const shipText = shipCents === 0 ? "GRATUIT" : `${(shipCents / 100).toFixed(2)} RON`;
  const shippingSectionHtml = `
    <tr>
      <td align="right" style="padding: 15px 12px; border-bottom: 1px solid #1e293b !important;">
        <span style="color: #94a3b8 !important; text-transform: uppercase; font-size: 10px; letter-spacing: 1px;">Logistică:</span>
      </td>
      <td align="right" style="padding: 15px 12px; border-bottom: 1px solid #1e293b !important;">
        <strong style="color: #ffffff !important; font-size: 14px;">${shipText}</strong>
      </td>
    </tr>
  `;

  let discountSectionHtml = "";
  const totalCents = orderData.total || orderData.totalCents || 0;
  
  if (orderData.couponCode) {
    const subtotal = products.reduce((acc, i) => acc + ((i.priceCentsAtBuy || i.priceCents || 0) * (i.qty || 1)), 0);
    const discountAmountCents = (subtotal + shipCents) - totalCents;

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

  const name = orderData.client?.name || orderData.customerName || orderData.shippingName || "Client Karix";
  const phone = orderData.client?.phone || orderData.phone || orderData.shippingPhone || "Nespecificat";
  const address = orderData.shippingAddress || (orderData.client ? `${orderData.client.addressDetails}, ${orderData.client.city}, ${orderData.client.county}` : "Nespecificată");

  const finalTotalFormatted = (totalCents / 100).toFixed(2);

  const html = render(tpl, {
    customerName: name,
    orderId: orderData.id || orderData.orderId || "N/A",
    deliveryAddress: address,
    phone: phone,
    itemsList: itemsHtml,
    discountSection: discountSectionHtml,
    shippingSection: shippingSectionHtml,
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

export async function sendServiceOrderPlaced(to, data) {
  try {
    // Verificăm dacă metoda aleasă de client este "oradea"
    const isOradea = data.method === "oradea";
    
    // 👉 REGLARE TEMPLATE-URI CONFORM CERINȚEI TALE:
    // Dacă e oradea -> servicePlacedOradea.html
    // Dacă e curier -> serviceCourierNotification.html
    const templateName = isOradea ? "servicePlacedOradea.html" : "serviceCourierNotification.html";

    // Setăm subiectul mailului
    const subject = isOradea 
      ? `Detalii preluare personală Oradea (#${data.orderId || "Garanție"})`
      : `Instrucțiuni trimitere prin curier (#${data.orderId || "Garanție"})`;

    const tpl = loadTemplate(templateName);

    const html = render(tpl, {
      customerName: data.customerName,
      orderId: data.orderId || "N/A",
      // Variabila se numește serviceList în funcție, asigură-te că în HTML ai {{serviceList}}
      serviceList: data.serviceList || "Solicitare Garanție / Service",
      deliveryAddress: data.deliveryAddress || "Adresa specificată",
      phone: data.phone || "Nespecificat",
      date: new Date().toLocaleString('ro-RO'),
      // Adăugăm și aceste variabile în caz că template-ul serviceCourierNotification le folosește
      productName: data.serviceList,
      issueDescription: data.issueDescription || "Nu a fost furnizată o descriere.",
      address: data.deliveryAddress
    });

    await sendHtmlMail({ to, subject, html });
  } catch (err) {
    console.error("❌ Eroare la trimiterea mail-ului de garanție către client:", err);
  }
}

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

export async function sendTicketResolvedEmail(to, data) {
  const tpl = loadTemplate("ticketResolved.html");
  const html = render(tpl, {
    customerName: data.customerName,
    ticketId: data.ticketId
  });
  await sendHtmlMail({ to, subject: `✅ Tichet rezolvat #${data.ticketId}`, html });
}

export async function sendAdminServiceCourierAlert(data) {
  try {
    const tpl = loadTemplate("adminServiceAlertCourier.html");
    const html = render(tpl, {
      productName: data.productName,
      orderId: data.orderId,
      customerName: data.customerName,
      customerPhone: data.customerPhone || data.phoneNumber,
      judet: data.judet,
      oras: data.oras,
      address: data.address,
      preferredDate: data.preferredDate,
      // 👉 ADAUGĂM DESCRIEREA DEFECTULUI
      issueDescription: data.issueDescription || "Nespecificată"
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
    const tpl = loadTemplate("adminServiceAlertOradea.html");
    const html = render(tpl, {
      productName: data.productName,
      // 👉 ADAUGĂM ORDER ID PENTRU ORADEA
      orderId: data.orderId,
      customerName: data.customerName,
      customerPhone: data.customerPhone || data.phoneNumber,
      preferredDate: data.preferredDate,
      issueDescription: data.issueDescription || "Nespecificată",
      address: data.address || "Oradea" 
    });

    await sendHtmlMail({ 
      to: env.ADMIN_EMAIL, 
      subject: `📍 SERVICE ORADEA: Ridicare de la ${data.customerName}`, 
      html 
    });
  } catch (err) {
    console.error("❌ Eroare sendAdminServiceOradeaAlert:", err);
  }
}

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

// ============================================================
// 🚀 NOU: FUNCȚIE TRIMITERE FACTURĂ FINALĂ (CONFIRMARE OP)
// ============================================================
export async function sendFinalInvoiceEmail(to, orderData, pdfBuffer) {
  try {
    const templateName = "finalInvoice.html";
    let html = "";
    
    // Verificăm dacă template-ul există, altfel construim un HTML de rezervă curat
    try {
      const tpl = loadTemplate(templateName);
      html = render(tpl, {
        customerName: orderData.shippingName || "Client Karix",
        orderId: orderData.id,
        date: new Date().toLocaleString('ro-RO')
      });
    } catch (e) {
      // Fallback HTML dacă nu ai creat încă fișierul finalInvoice.html în folderul templates
      html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto;">
          <h2 style="color: #4f46e5;">Plata a fost confirmată! 🎉</h2>
          <p>Salut, <strong>${orderData.shippingName || "Client"}</strong>,</p>
          <p>Îți confirmăm primirea plății pentru comanda <strong>#${orderData.id}</strong> achitată prin transfer bancar.</p>
          <p>Factura fiscală aferentă comenzii tale este atașată la acest email în format PDF.</p>
          <p>Echipa noastră va pregăti acum produsele pentru livrare. Vei primi un email separat când coletul este predat curierului.</p>
          <br>
          <p>Cu respect,<br>Echipa Karix Computers</p>
        </div>
      `;
    }

    const mailOptions = {
      to,
      subject: `Factură Fiscală - Comanda #${orderData.id} - Karix Computers`,
      html,
      attachments: []
    };

    if (pdfBuffer) {
      mailOptions.attachments.push({
        filename: `Factura_Karix_${orderData.id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    }

    await sendHtmlMail(mailOptions);
    console.log(`✅ FACTURA FINALA (OP) TRIMISA LA: ${to}`);
  } catch (err) {
    console.error("❌ Eroare sendFinalInvoiceEmail:", err);
  }
}

// ============================================================
// 🚀 NOU: FUNCȚIE ANULARE COMANDĂ DE CĂTRE ADMIN
// ============================================================
export async function sendAdminOrderCanceledEmail(to, data) {
  try {
    const tpl = loadTemplate("adminCanceledOrder.html");
    const html = render(tpl, {
      customerName: data.customerName,
      orderId: data.orderId,
      date: new Date().toLocaleString('ro-RO')
    });

    await sendHtmlMail({ 
      to, 
      subject: `Comandă Anulată #${data.orderId} - Karix Computers`, 
      html 
    });
    console.log(`✅ MAIL ANULARE (ADMIN) TRIMIS LA: ${to}`);
  } catch (err) {
    console.error("❌ Eroare sendAdminOrderCanceledEmail:", err);
  }
}


// ============================================================
// 🚀 NOU: FUNCȚIE RESPINGERE GARANȚIE CU POZE
// ============================================================
export async function sendWarrantyRejectedEmail(to, data, files = []) {
  try {
    const tpl = loadTemplate("warrantyRejected.html");
    const html = render(tpl, {
      customerName: data.customerName,
      productName: data.productName,
      orderId: data.orderId,
      reason: data.reason,
      date: new Date().toLocaleDateString('ro-RO')
    });

    // Transformăm fișierele din Multer în atașamente pentru Nodemailer
    const attachments = files.map(file => ({
      filename: file.originalname,
      content: file.buffer // Folosim buffer-ul direct din memorie
    }));

    await sendHtmlMail({ 
      to, 
      subject: `⚠️ Notificare importantă privind garanția: ${data.productName}`, 
      html,
      attachments
    });
    
    console.log(`✅ MAIL RESPINGERE GARANȚIE TRIMIS LA: ${to}`);
  } catch (err) {
    console.error("❌ Eroare sendWarrantyRejectedEmail:", err);
  }
}

export async function sendAssemblyOrderPlaced(to, data, pdfBuffer = null) {
  try {
    // 👉 Selectăm template-ul în funcție de locație
    const templateName = data.isOradea ? "assemblyPlacedOradea.html" : "assemblyPlacedClient.html";
    const tpl = loadTemplate(templateName);
    
    const subject = `Confirmare Asamblare PC (#${data.orderId}) - Karix Computers`;

    const html = render(tpl, {
      customerName: data.customerName,
      orderId: data.orderId,
      deliveryAddress: data.deliveryAddress,
      phone: data.phone,
      method: data.method,
      issueDescription: data.issueDescription,
      accountUrl: `https://karixcomputers.ro/orders`
    });

    const mailOptions = { to, subject, html };

    // 👉 Dacă avem un PDF generat (Factură/Proformă), îl atașăm
    if (pdfBuffer) {
      mailOptions.attachments = [{
        filename: `Document_Karix_${data.orderId}.pdf`,
        content: pdfBuffer
      }];
    }

    await sendHtmlMail(mailOptions);
  } catch (err) {
    console.error("❌ Eroare sendAssemblyOrderPlaced:", err);
  }
}

export async function sendAdminAssemblyAlert(data) {
  try {
    const tpl = loadTemplate("adminAssemblyAlert.html");
    const subject = `⚙️ ASAMBLARE PC: ${data.customerName}`;

    const html = render(tpl, {
      productName: data.productName,
      orderId: data.orderId,
      customerName: data.customerName,
      customerPhone: data.customerPhone || data.phoneNumber,
      method: data.method,
      address: data.address,
      issueDescription: data.issueDescription || "Nespecificat",
      adminUrl: `https://karixcomputers.ro/admin/orders`
    });

    await sendHtmlMail({ to: process.env.ADMIN_EMAIL || "karixcomputers@gmail.com", subject, html });
  } catch (err) {
    console.error("❌ Eroare sendAdminAssemblyAlert:", err);
  }
}

// ============================================================
// 🚀 NOU: MAIL INSTRUCȚIUNI FANBOX DUPĂ CONFIRMARE PLATĂ
// ============================================================
export async function sendFanboxInstructionsEmail(to, orderData, returnToFanbox = false, pdfBuffer = null) {
  try {
    const templateName = returnToFanbox ? "serviceFanboxToFanbox.html" : "serviceFanboxToHome.html";
    const tpl = loadTemplate(templateName);

    let rawAddress = orderData.shippingAddress || "";
    let fanboxName = "Locker-ul selectat la comandă";
    let homeDeliveryAddress = rawAddress;

    // 👉 TĂIEM STRING-UL CA SĂ SEPARĂM ACASĂ DE LOCKER
    if (rawAddress.includes("| Locker:")) {
        const parts = rawAddress.split("| Locker:");
        
        // 1. Adresa de acasă e tot ce e înainte de bară
        homeDeliveryAddress = parts[0].trim(); 
        
        // 2. Numele locker-ului e ce e după bară (tăiem și detaliile lungi cu cratimă de la FAN)
        let rawFanbox = parts[1].trim();
        fanboxName = rawFanbox.split("-")[0].trim(); 

    } else if (rawAddress.includes("Locker FANbox:")) {
        // Cazul în care a ales doar Locker (fără adresă acasă)
        fanboxName = rawAddress.split("-")[0].trim();
    }

    const html = render(tpl, {
      customerName: orderData.shippingName || "Client Karix",
      orderId: orderData.id,
      fanboxLocation: fanboxName,           // 👉 Aici va pune "Locker FANbox: FANbox Clujului 74 AB"
      deliveryAddress: homeDeliveryAddress, // 👉 Aici va pune "Str. Clujului, Nr. 74, Alba Iulia, Alba"
      accountUrl: `https://karixcomputers.ro/orders`
    });

    const mailOptions = {
      to,
      subject: `Plată Confirmată + Instrucțiuni Predare FANbox (#${orderData.id})`,
      html,
      attachments: []
    };

    if (pdfBuffer) {
      mailOptions.attachments.push({
        filename: `Factura_Karix_${orderData.id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    }

    await sendHtmlMail(mailOptions);
    console.log(`✅ MAIL INSTRUCȚIUNI FANBOX TRIMIS LA: ${to}`);
  } catch (err) {
    console.error("❌ Eroare sendFanboxInstructionsEmail:", err);
  }
}

// ============================================================
// 🚀 NOU: MAIL CHECKOUT FANBOX (Înainte de plata OP)
// ============================================================
export async function sendFanboxCheckoutEmail(to, orderData) {
  try {
    const tpl = loadTemplate("serviceFanboxCheckout.html");

    let fanboxName = orderData.fanboxLocation || "";
    if (fanboxName.includes("Locker FANbox:")) {
        fanboxName = fanboxName.split("-")[0].trim(); 
    }

    const html = render(tpl, {
      customerName: orderData.customerName,
      orderId: orderData.orderId,
      fanboxLocation: fanboxName,
      total: (orderData.total / 100).toFixed(2),
      accountUrl: `https://karixcomputers.ro/orders`
    });

    const mailOptions = {
      to,
      subject: `Solicitare Înregistrată FANbox (#${orderData.orderId}) - Așteptăm Plata`,
      html,
      attachments: []
    };

    await sendHtmlMail(mailOptions);
    console.log(`✅ MAIL CHECKOUT FANBOX TRIMIS LA: ${to}`);
  } catch (err) {
    console.error("❌ Eroare sendFanboxCheckoutEmail:", err);
  }
}

// ============================================================
// 🚀 NOU: FUNCȚIE CONFIRMARE OP PENTRU SERVICE
// ============================================================
export async function sendServiceOpConfirmedEmail(to, data, pdfBuffer) {
  try {
    const tpl = loadTemplate("service_op_confirmed.html");
    
    // Înlocuim variabilele simple
    let html = render(tpl, {
        customerName: data.customerName,
        orderId: data.orderId,
        reverseAwb: data.reverseAwb || "În procesare"
    });

    // Simulăm logica de {{#if isFanbox}} din Handlebars prin regex
    // Păstrăm doar blocul HTML aferent opțiunii selectate
    if (data.isFanbox) {
        html = html.replace(/{{#if isFanbox}}([\s\S]*?){{else if isOradea}}[\s\S]*?{{else}}[\s\S]*?{{\/if}}/g, "$1");
    } else if (data.isOradea) {
        html = html.replace(/{{#if isFanbox}}[\s\S]*?{{else if isOradea}}([\s\S]*?){{else}}[\s\S]*?{{\/if}}/g, "$1");
    } else {
        html = html.replace(/{{#if isFanbox}}[\s\S]*?{{else if isOradea}}[\s\S]*?{{else}}([\s\S]*?){{\/if}}/g, "$1");
    }

    const mailOptions = {
        to,
        subject: `✅ Plată confirmată - Pregătire Service #${data.orderId}`,
        html,
        attachments: []
    };

    if (pdfBuffer) {
        mailOptions.attachments.push({
            filename: `Factura_Karix_${data.orderId}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
        });
    }

    await sendHtmlMail(mailOptions);
    console.log(`✅ MAIL OP SERVICE TRIMIS LA: ${to}`);
  } catch (err) {
    console.error("❌ Eroare sendServiceOpConfirmedEmail:", err);
  }
}

// ============================================================
// 🚀 ASAMBLARE: PLASARE COMANDĂ OP (Așteptăm plata proformei)
// ============================================================
export async function sendAssemblyOpPlacedEmail(to, data, proformaBuffer) {
  try {
    const templateName = data.isOradea ? "assemblyPlacedOpOradea.html" : "assemblyPlacedOpClient.html";
    const tpl = loadTemplate(templateName);
    
    const html = render(tpl, {
        customerName: data.customerName,
        orderId: data.orderId,
        accountUrl: `https://karixcomputers.ro/orders`
    });

    const mailOptions = {
        to,
        subject: `[Așteptăm Plata OP] Comandă Asamblare #${data.orderId}`,
        html,
        attachments: []
    };

    if (proformaBuffer) {
        mailOptions.attachments.push({
            filename: `Proforma_Karix_${data.orderId}.pdf`,
            content: proformaBuffer,
            contentType: 'application/pdf'
        });
    }

    await sendHtmlMail(mailOptions);
    console.log(`✅ MAIL ASAMBLARE (PLACED OP) TRIMIS LA: ${to}`);
  } catch (err) {
    console.error("❌ Eroare sendAssemblyOpPlacedEmail:", err);
  }
}

// ============================================================
// 🚀 ASAMBLARE: CONFIRMARE PLATĂ OP DIN ADMIN (Acum adu/trimite piesele)
// ============================================================
export async function sendAssemblyOpConfirmedEmail(to, data, invoiceBuffer) {
  try {
    const templateName = data.isOradea ? "assemblyConfirmedOpOradea.html" : "assemblyConfirmedOpClient.html";
    const tpl = loadTemplate(templateName);
    
    const html = render(tpl, {
        customerName: data.customerName,
        orderId: data.orderId
    });

    const mailOptions = {
        to,
        subject: `✅ Plată Confirmată - Asamblare #${data.orderId}`,
        html,
        attachments: []
    };

    if (invoiceBuffer) {
        mailOptions.attachments.push({
            filename: `Factura_Karix_${data.orderId}.pdf`,
            content: invoiceBuffer,
            contentType: 'application/pdf'
        });
    }

    await sendHtmlMail(mailOptions);
    console.log(`✅ MAIL ASAMBLARE (CONFIRMAT OP) TRIMIS LA: ${to}`);
  } catch (err) {
    console.error("❌ Eroare sendAssemblyOpConfirmedEmail:", err);
  }
}

// ============================================================
// 🚀 ASAMBLARE: PIESE PRIMITE ÎN LABORATOR
// ============================================================
export async function sendAssemblyInPossessionEmail(to, data) {
  try {
    const tpl = loadTemplate("assemblyInPossession.html");
    const html = render(tpl, {
        customerName: data.customerName,
        orderId: data.orderId
    });
    
    await sendHtmlMail({ 
      to, 
      subject: `📦 Componente Recepționate - Asamblare #${data.orderId}`, 
      html 
    });
    console.log(`✅ MAIL ASAMBLARE POSESIE TRIMIS LA: ${to}`);
  } catch (err) {
    console.error("❌ Eroare sendAssemblyInPossessionEmail:", err);
  }
}

// ============================================================
// 🚀 NOU: FUNCȚIE AWB GARANȚIE RESPINSĂ
// ============================================================
export async function sendServiceAwbRejectedEmail(to, data) {
  try {
    const tpl = loadTemplate("serviceAwbRejected.html");
    const html = render(tpl, {
      customerName: data.customerName,
      productName: data.productName,
      awb: data.awb
    });

    await sendHtmlMail({ 
      to, 
      subject: `📦 Dispozitivul tău a fost expediat (Garanție Respinsă) - Karix`, 
      html
    });
    
    console.log(`✅ MAIL AWB RESPINS TRIMIS LA: ${to}`);
  } catch (err) {
    console.error("❌ Eroare sendServiceAwbRejectedEmail:", err);
  }
}


/**
 * Trimite e-mailul de invitație când adminul asociază contul (PENDING)
 */
export const sendPartnerInvitationEmail = async (toEmail, customerName) => {
  try {
    // Folosim process.cwd() în loc de __dirname pentru a păstra aceeași logică din proiect
    const filePath = path.resolve(process.cwd(), "src", "templates", "asociereafiliat.html");
    let htmlContent = fs.readFileSync(filePath, "utf8");

    // Înlocuim variabilele template-ului
    htmlContent = htmlContent
      .replace(/{{customerName}}/g, customerName)
      .replace(/{{accountUrl}}/g, "https://karixcomputers.ro/account");

    const mailOptions = {
      from: env.MAIL_FROM || '"Karix Computers" <noreply@karixcomputers.ro>', // Folosește env dacă e disponibil, altfel fallback
      to: toEmail,
      subject: "Felicitări! Ai fost selectat ca partener Karix Computers 🚀",
      html: htmlContent,
    };

    // Folosim sendHtmlMail nucleul tău sau direct transporter-ul dacă e exportat
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Eroare în sendPartnerInvitationEmail:", error);
    throw error;
  }
};

/**
 * Trimite e-mailul de confirmare după ce partenerul acceptă termenii (ACTIVE)
 */
export const sendPartnerActivationEmail = async (toEmail, customerName, affiliateCode) => {
  try {
    // Folosim process.cwd() în loc de __dirname
    const filePath = path.resolve(process.cwd(), "src", "templates", "acceptareafiliere.html");
    let htmlContent = fs.readFileSync(filePath, "utf8");

    // Înlocuim variabilele template-ului
    htmlContent = htmlContent
      .replace(/{{customerName}}/g, customerName)
      .replace(/{{affiliateCode}}/g, affiliateCode.toUpperCase())
      .replace(/{{accountUrl}}/g, "https://karixcomputers.ro/account");

    const mailOptions = {
      from: env.MAIL_FROM || '"Karix Computers" <noreply@karixcomputers.ro>',
      to: toEmail,
      subject: "Parteneriat Activat! Codul tău este pregătit pentru live 🎉",
      html: htmlContent,
    };

    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Eroare în sendPartnerActivationEmail:", error);
    throw error;
  }
};