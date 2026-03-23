import React, { createContext, useContext, useState, useEffect } from "react";
import { loginApi, logoutApi, verifyWithCodeApi, refreshApi } from "../api/auth";
import { setAccessToken as setGlobalAccessToken } from "../api/client";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessTokenState] = useState(null); 
  const [loading, setLoading] = useState(true);

  // Funcție helper pentru a seta token-ul peste tot simultan
  const updateAuth = (userData, token) => {
    if (userData) setUser(userData);
    if (token) {
      setAccessTokenState(token);
      setGlobalAccessToken(token); // Sincronizăm cu client.js
      localStorage.setItem("accessToken", token);
      localStorage.setItem("karix_logged_in", "true");
    }
  };

  const clearAuth = () => {
    setUser(null);
    setAccessTokenState(null);
    setGlobalAccessToken(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("karix_logged_in");
  };

  useEffect(() => {
    async function restoreSession() {
      try {
        const data = await refreshApi();
        if (data && data.user && data.accessToken) {
          updateAuth(data.user, data.accessToken);
        } else {
          clearAuth();
        }
      } catch (err) {
        console.warn("Sesiune inexistentă la pornire.");
        clearAuth();
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  // --- FUNCȚIA NOUĂ PENTRU GOOGLE ---
  const loginWithGoogle = (data) => {
    if (data && data.user && data.accessToken) {
      updateAuth(data.user, data.accessToken);
      return data.user;
    } else {
      throw new Error("Datele primite de la server sunt incomplete.");
    }
  };

  async function login(email, password) {
    const data = await loginApi(email, password); 
    const userObj = data.user || data;

    if (!userObj.isEmailVerified) {
      throw new Error("EMAIL_NOT_VERIFIED");
    }
    
    updateAuth(userObj, data.accessToken);
    return userObj;
  }

  async function verifyCode(email, code) {
    const data = await verifyWithCodeApi(email, code);
    if (data && data.user) {
      updateAuth(data.user, data.accessToken);
    }
    return data;
  }

  async function logout() {
    try {
      await logoutApi();
    } finally {
      clearAuth();
    }
  }

  return (
    <AuthCtx.Provider value={{ 
      user, 
      accessToken, 
      setUser, 
      login, 
      loginWithGoogle, // Exportăm funcția nouă
      logout, 
      verifyCode, 
      loading 
    }}>
      {!loading ? children : (
        <div className="min-h-screen bg-[#0b1020] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-indigo-300 font-medium animate-pulse">Se încarcă sesiunea...</p>
          </div>
        </div>
      )}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthCtx);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}