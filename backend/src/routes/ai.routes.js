import express from "express";
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import { requireAuth } from "../middleware/auth.js";
import { sendAdminTicketAlert } from "../services/mail.service.js";

const prisma = new PrismaClient();
const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const tools = [
  {
    type: "function",
    function: {
      name: "get_user_account_data",
      description: "Interoghează baza de date Karix pentru detalii despre comenzi, retururi, service sau wishlist.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["comenzi", "retururi", "service", "wishlist"] },
          orderId: { type: "string", description: "ID-ul comenzii." }
        },
        required: ["category"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_support_ticket",
      description: "Generează un tichet de suport oficial.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string" },
          category: { type: "string", enum: ["Hardware", "Software", "Garantie", "Altele"] },
          priority: { type: "string", enum: ["normal", "urgent"] },
          message: { type: "string" }
        },
        required: ["subject", "category", "priority", "message"]
      }
    }
  }
];

router.post("/chat", requireAuth, async (req, res) => {
  try {
    const { message, history } = req.body;
    const userId = req.user.id || req.user.sub;
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    const realName = dbUser?.name || "Client";

    const systemPrompt = `
      Ești Karix AI, asistentul Karix Computers. Te adresezi lui ${realName}.
      REGULI:
      1. Răspunde DOAR în TEXT SIMPLU. Fără Markdown.
      2. Reprodu LITERAL textul oferit de unelte.
      3. Dacă user-ul întreabă de ultima comandă, nu cere ID.
    `;

    if (message.toLowerCase().includes("ajunge pachetul")) {
      return res.json({ reply: "Asamblarea durează 3-5 zile în funcție de disponibilitatea componentelor și livrarea durează 24-48 ore.\n\nTe mai pot ajuta cu altceva? (da/nu)" });
    }

    let response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...history.slice(-10), { role: "user", content: message }],
      tools: tools,
      temperature: 0,
    });

    let resMsg = response.choices[0].message;

    if (resMsg.tool_calls) {
      const toolCall = resMsg.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);
      let toolResult = "";

      const idFromMsg = message.match(/\d+/)?.[0];
      const finalId = args.orderId || idFromMsg;

      if (toolCall.function.name === "get_user_account_data") {
        if (args.category === "comenzi") {
          let order;
          if (finalId) {
            order = await prisma.order.findFirst({ where: { userId, id: parseInt(finalId.replace(/\D/g, '')) }, include: { items: true } });
          } else {
            order = await prisma.order.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { items: true } });
          }

          if (!order) {
            toolResult = `Nu am găsit nicio comandă${finalId ? ' cu ID #' + finalId : ''} în contul tău.`;
          } else {
            const item = order.items[0]; 
            const rawStatus = (item ? item.status : order.status).toLowerCase();
            const idStr = String(order.id).slice(-8);
            let orderFriendly = "";

            // --- TRANSLATOR STATUS COMANDĂ ---
            if (rawStatus === "in_asteptare") {
              orderFriendly = "este în așteptare și urmează să fie preluată de echipa noastră pentru procesare.";
            } else if (rawStatus === "in_procesare" || rawStatus === "in_pregatire") {
              orderFriendly = "se află în curs de procesare, asamblare sau testare tehnică.";
            } else if (rawStatus === "gata_de_livrare") {
              orderFriendly = "este pregătită de expediere și așteaptă curierul. Vei primi un email cu numărul de AWB imediat ce pachetul pleacă.";
            } else if (rawStatus === "predat_curier") {
              orderFriendly = "a fost predată curierului și este pe drum. Livrarea durează de obicei între 24 și 48 de ore.";
            } else if (rawStatus === "livrat") {
              orderFriendly = "a fost livrată cu succes. Sperăm că ești mulțumit de noul tău sistem Karix!";
            } else if (rawStatus === "anulat") {
              orderFriendly = "a fost anulată.";
            } else {
              orderFriendly = `este în stadiul: ${rawStatus.replace(/_/g, ' ').toUpperCase()}.`;
            }

            toolResult = `Comanda ta #${idStr} ${orderFriendly}`;
          }
        }
        else if (args.category === "retururi") {
          let ret;
          if (finalId) {
            ret = await prisma.returnRequest.findFirst({ where: { userId, orderNumber: finalId.toString() }, orderBy: { createdAt: 'desc' } });
          } else {
            ret = await prisma.returnRequest.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
          }

          if (!ret) {
            toolResult = finalId ? `Nu am găsit nicio cerere de retur pentru comanda #${finalId}.` : "Nu ai retururi înregistrate.";
          } else {
            const rs = ret.status.toLowerCase();
            let rf = "";

            if (rs === "pending") rf = "este în așteptare; echipa noastră o va analiza în cel mai scurt timp.";
            else if (rs === "received_ok") rf = "a ajuns în service și a fost verificată; totul este în regulă și urmează să se trimită banii în contul tău.";
            else if (rs === "processing") rf = "este în curs de procesare și verificare tehnică.";
            else if (rs === "rejected") rf = "a fost respinsă. Te rugăm să verifici email-ul pentru detalii.";
            else if (rs === "completed") rf = "a fost finalizată cu succes și plata a fost efectuată.";
            else rf = `are statusul: ${rs.toUpperCase()}.`;

            toolResult = `Cererea de retur pentru comanda #${ret.orderNumber} ${rf}`;
          }
        }
        else if (args.category === "service") {
          const srv = await prisma.serviceOrder.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
          if (!srv) {
            toolResult = "Nu ai nicio fișă de service activă.";
          } else {
            const ss = srv.status.toLowerCase();
            let sf = "";

            // --- TRANSLATOR STATUS SERVICE (GARANȚII) ---
            if (ss === "in_asteptare_ridicare") sf = "este în așteptarea curierului pentru a fi ridicat de la tine.";
            else if (ss === "posesie") sf = "a ajuns la noi și urmează să intre pe masa de testare.";
            else if (ss === "diagnosticare") sf = "este în curs de diagnosticare tehnică.";
            else if (ss === "reparat") sf = "a fost reparat cu succes și este gata.";
            else if (ss === "ireparabil") sf = "a fost declarat ireparabil. Te vom contacta pentru soluționare (înlocuire sau stornare).";
            else if (ss === "predat_curier") sf = "a fost expediat de la noi către adresa ta.";
            else if (ss === "livrat") sf = "a fost recepționat de tine. Sperăm că totul funcționează perfect acum!";
            else sf = `are statusul: ${ss.toUpperCase()}.`;

            toolResult = `Produsul tău (${srv.productName}) ${sf}`;
          }
        }
      }

      if (toolCall.function.name === "create_support_ticket") {
        const ticketId = Math.floor(100000 + Math.random() * 900000);
        await prisma.ticket.create({
          data: { id: ticketId, subject: args.subject, category: args.category, priority: args.priority, userId,
            messages: { create: { text: args.message, senderRole: "user" } } }
        });
        await sendAdminTicketAlert({ ticketId, customerName: realName, subject: args.subject, messagePreview: args.message }).catch(e => {});
        toolResult = `Tichetul #${ticketId} a fost creat. Te vom contacta în curând.`;
      }

      const finalResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...history.slice(-10), resMsg, { role: "tool", tool_call_id: toolCall.id, content: toolResult }],
        temperature: 0
      });
      resMsg = finalResponse.choices[0].message;
    }

    res.json({ reply: resMsg.content.replace(/\*/g, "").trim() + "\n\nTe mai pot ajuta cu altceva? (da/nu)" });

  } catch (error) {
    console.error("AI ERROR:", error);
    res.status(500).json({ reply: "Sistemul Karix AI întâmpină o eroare. Revino mai târziu." });
  }
});

export default router;