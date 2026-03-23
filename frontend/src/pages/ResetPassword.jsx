import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPasswordApi } from "../api/auth";

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const token = sp.get("token");

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!token) return setError("Token lipsă.");
    if (pw.length < 6) return setError("Parola trebuie să aibă minim 6 caractere.");
    if (pw !== pw2) return setError("Parolele nu coincid.");

    setLoading(true);
    try {
      await resetPasswordApi(token, pw);
      setDone(true);
    } catch (err) {
      setError(err.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-extrabold text-white">Setează parolă nouă</h1>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {done ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-200">
            Parola a fost schimbată ✅.
            <div className="mt-3">
              <Link to="/auth/login" className="underline text-gray-200 hover:text-white">
                Mergi la login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <div>
              <label className="text-sm text-gray-200">Parolă nouă</label>
              <input
                type="password"
                className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-gray-100 outline-none focus:border-white/20"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="text-sm text-gray-200">Confirmă parola</label>
              <input
                type="password"
                className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-gray-100 outline-none focus:border-white/20"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <button
              disabled={loading}
              className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-pink-500 disabled:opacity-60"
            >
              {loading ? "Se salvează..." : "Schimbă parola"}
            </button>

            <div className="text-sm text-gray-300">
              <Link to="/auth/login" className="underline hover:text-white">
                Înapoi la login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
