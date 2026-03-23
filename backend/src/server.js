import { app } from "./app.js";
import { env } from "./config/env.js";
import os from "os"; // Modul nativ Node.js pentru info sistem

const HOST = '0.0.0.0';
const PORT = env.PORT || 4000;

// Funcție pentru a lua IP-ul local automat
const getNetworkIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

app.listen(PORT, HOST, () => {
  const networkIP = getNetworkIP();
  
  console.log(`\n--- 🚀 KARIX BACKEND ACTIVE ---`);
  console.log(`💻 Local:   http://localhost:${PORT}`);
  console.log(`📱 Network: http://${networkIP}:${PORT}`);
  console.log(`-----------------------------------\n`);
});