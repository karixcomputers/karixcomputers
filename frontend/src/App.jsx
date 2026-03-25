import React from "react";
import { Routes, Route } from "react-router-dom";
// --- IMPORT NOU PENTRU GOOGLE ---
import { GoogleOAuthProvider } from '@react-oauth/google';

// Componente globale
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import NetworkBackground from "./components/NetworkBackground.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx"; 

// Pagini
import Home from "./pages/Home.jsx";
import Shop from "./pages/Shop.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import Success from "./pages/Success.jsx";
import Cancel from "./pages/Cancel.jsx";
import Account from "./pages/Account.jsx";
import Orders from "./pages/Orders.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import VerifyCode from "./pages/VerifyCode.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import Suport from "./pages/Suport.jsx";
import Servicii from "./pages/Servicii.jsx";
import Terms from "./pages/Terms.jsx";
import Warranty from "./pages/Warranty.jsx";
import Retur from "./pages/Retur.jsx";
import Confidentialitate from "./pages/Confidentialitate.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminHistory from "./pages/AdminHistory";
import AdminInventory from "./pages/AdminInventory.jsx";
import Warranties from "./pages/Warranties.jsx";
import AdminWarranties from "./pages/AdminWarranties"; 
import OrderCanceled from "./pages/OrderCanceled.jsx"; 
import Tickets from "./pages/Tickets.jsx";
import TicketDetail from "./pages/TicketDetail.jsx";
import AdminTickets from "./pages/AdminTickets.jsx";
import ServiceRequest from "./pages/ServiceRequest";
import AdminService from "./pages/AdminService.jsx";
import ReturnRequest from "./pages/ReturnRequest.jsx";
import AdminReturns from "./pages/AdminReturns"; 
import AdminServiceHistory from "./pages/AdminServiceHistory";
import Wishlist from "./pages/Wishlist";
import KarixAI from "./components/KarixAI";
import CookieBanner from "./components/CookieBanner";
import Configurator from "./pages/Configurator.jsx";
import AdminCoupons from "./pages/AdminCoupons"; 
import ProductDetails from "./pages/ProductDetails"; 
import AdminReviews from "./pages/AdminReviews";
import AdminConfigurator from "./pages/AdminConfigurator.jsx";

// Context
import { WishlistProvider } from "./context/WishlistContext";

export default function App() {
  return (
    <WishlistProvider>
      {/* --- WRAPPER GOOGLE ADĂUGAT AICI --- */}
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        
        <div className="bg-[#0b1020] text-gray-200 min-h-screen flex flex-col relative overflow-x-hidden">
          
          <ScrollToTop />

          <div className="fixed inset-0 z-0 pointer-events-none">
            <NetworkBackground />
          </div>

          <div className="relative z-10 flex flex-col flex-1 w-full">
            <Header />
            
            <main className="flex-1 w-full relative z-20">
              <Routes>
                {/* Rute Publice */}
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/success" element={<Success />} />
                <Route path="/cancel" element={<Cancel />} />
                <Route path="/servicii" element={<Servicii />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/suport" element={<Suport />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/configurator" element={<Configurator />} />
                <Route path="*" element={<NotFound />} />
                
                <Route path="/product/:id" element={<ProductDetails />} />

                {/* Rute Legale */}
                <Route path="/terms" element={<Terms />} />
                <Route path="/warranty" element={<Warranty />} />
                <Route path="/retur" element={<Retur />} />
                <Route path="/confidentialitate" element={<Confidentialitate />} />

                {/* Rute Autentificare */}
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/register" element={<Register />} />
                <Route path="/auth/verify" element={<VerifyCode />} />
                <Route path="/auth/verify-email" element={<VerifyEmail />} />
                <Route path="/auth/forgot" element={<ForgotPassword />} />
                <Route path="/auth/reset" element={<ResetPassword />} />

                {/* Rute Protejate (Utilizator) */}
                <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                <Route path="/account/warranties" element={<ProtectedRoute><Warranties /></ProtectedRoute>} />
                <Route path="/service-request" element={<ProtectedRoute><ServiceRequest /></ProtectedRoute>} />
                <Route path="/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
                <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />

                {/* Rute Administrare */}
                <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/history" element={<ProtectedRoute requireAdmin><AdminHistory /></ProtectedRoute>} />
                <Route path="/admin/inventory" element={<ProtectedRoute requireAdmin><AdminInventory /></ProtectedRoute>} />
                <Route path="/admin/warranties" element={<ProtectedRoute requireAdmin><AdminWarranties /></ProtectedRoute>} />
                <Route path="/admin/tickets" element={<ProtectedRoute requireAdmin><AdminTickets /></ProtectedRoute>} />
                <Route path="/admin/service" element={<ProtectedRoute requireAdmin><AdminService /></ProtectedRoute>} />
                <Route path="/admin/returns" element={<ProtectedRoute requireAdmin><AdminReturns /></ProtectedRoute>} />
                <Route path="/admin/service/history" element={<ProtectedRoute requireAdmin><AdminServiceHistory /></ProtectedRoute>} />
                <Route path="/admin/coupons" element={<ProtectedRoute requireAdmin><AdminCoupons /></ProtectedRoute>} />
                <Route path="/admin/reviews" element={<ProtectedRoute><AdminReviews /></ProtectedRoute>} />
                <Route path="/admin/configurator" element={<ProtectedRoute><AdminConfigurator /></ProtectedRoute>} />

                <Route path="/order-canceled" element={<OrderCanceled />} />
                <Route path="/return-request" element={<ProtectedRoute><ReturnRequest /></ProtectedRoute>} />
              </Routes>
            </main>
            
            <Footer />
            <CookieBanner />
            <KarixAI />
          </div>
        </div>

      </GoogleOAuthProvider>
    </WishlistProvider>
  );
}