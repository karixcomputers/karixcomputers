import React, { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordApi } from "../api/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPasswordApi(email);
      setDone(true);
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-extrabold text-white">Resetare parolă</h1>
        <p className="text-sm text-gray-300 mt-1">
          Introdu emailul și îți trimitem un link de resetare.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {done ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-200">
            Dacă emailul există, vei primi un mesaj în inbox ✅.
            <div className="mt-3">
              <Link to="/auth/login" className="underline text-gray-200 hover:text-white">
                Înapoi la login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <label className="text-sm text-gray-200">Email</label>
              <input
                className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-gray-100 outline-none focus:border-white/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplu.ro"
                autoComplete="email"
              />
            </div>

            <button
              disabled={loading}
              className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-pink-500 disabled:opacity-60"
            >
              {loading ? "Se trimite..." : "Trimite link"}
            </button>

            <div className="text-sm text-gray-300">
              Ți-ai amintit parola?{" "}
              <Link to="/auth/login" className="underline hover:text-white">
                Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
