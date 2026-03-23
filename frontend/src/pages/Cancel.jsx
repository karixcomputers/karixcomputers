import React from "react";
import { Link } from "react-router-dom";

export default function Cancel() {
  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="border rounded-2xl p-6 bg-white">
        <h1 className="text-2xl font-bold">Plată anulată ❌</h1>
        <p className="text-sm text-gray-600 mt-2">Poți încerca din nou oricând.</p>
        <div className="mt-4 flex gap-3">
          <Link to="/cart" className="border rounded-lg px-4 py-2 font-semibold">Înapoi la coș</Link>
          <Link to="/shop" className="border rounded-lg px-4 py-2">Shop</Link>
        </div>
      </div>
    </div>
  );
}
