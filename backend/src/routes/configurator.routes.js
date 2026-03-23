import express from "express";
const router = express.Router();
// Atenție: Verifică dacă mailService.js se află exact în folderul services
import { sendConfiguratorEmail } from "../services/mail.service.js"; 

router.post("/send", async (req, res) => {
  try {
    console.log("📩 Cerere configurator primită de la:", req.body.user_email);
    
    // Apelăm funcția din mailService pe care am făcut-o anterior
    await sendConfiguratorEmail(req.body);
    
    res.status(200).json({ 
      success: true, 
      message: "Configurația a fost trimisă către admin și client!" 
    });
  } catch (error) {
    console.error("❌ Eroare în configurator.routes:", error);
    res.status(500).json({ 
      success: false, 
      error: "Eroare la procesarea mail-urilor." 
    });
  }
});

export default router;