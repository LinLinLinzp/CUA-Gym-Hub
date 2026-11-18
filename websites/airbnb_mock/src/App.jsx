import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./store/AppContext";
import SaveProvider from "./components/SaveWishlist";
import Layout from "./components/Layout";
import { ScrollTop, NotFound } from "./components/navigation";
import { Home, Search } from "./pages/Browse";
import Listing, { PhotoTour } from "./pages/Listing";
import Checkout from "./pages/Checkout";
import { Trips, TripDetail, CancelTrip, ChangeTrip } from "./pages/Trips";
import Messages, { NewMessage } from "./pages/Messages";
import { Reviews, ReviewEditor } from "./pages/Reviews";
import { Wishlists, RecentlyViewed, WishlistDetail } from "./pages/Wishlists";
import {
  Notifications,
  Profile,
  HostHomes,
  Account,
  Help,
  Activities,
} from "./pages/Supporting";
export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <SaveProvider>
          <ScrollTop />
          <Routes>
            <Route path="/rooms/:id/photos" element={<PhotoTour />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/s/:slug/homes" element={<Search />} />
              <Route path="/rooms/:id" element={<Listing />} />
              <Route path="/book/stays/:id" element={<Checkout />} />
              <Route path="/trips" element={<Trips />} />
              <Route path="/trips/:id" element={<TripDetail />} />
              <Route
                path="/trips/:id/confirmation"
                element={<TripDetail confirmation />}
              />
              <Route
                path="/trips/:id/receipt"
                element={<TripDetail receipt />}
              />
              <Route path="/trips/:id/cancel" element={<CancelTrip />} />
              <Route path="/trips/:id/change" element={<ChangeTrip />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/new" element={<NewMessage />} />
              <Route path="/messages/:id" element={<Messages />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route
                path="/reviews/write/:id"
                element={<ReviewEditor key="write" />}
              />
              <Route
                path="/reviews/edit/:id"
                element={<ReviewEditor key="edit" edit />}
              />
              <Route path="/wishlists" element={<Wishlists />} />
              <Route
                path="/wishlists/recently-viewed"
                element={<RecentlyViewed />}
              />
              <Route path="/wishlists/:id" element={<WishlistDetail />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route
                path="/users/show/:id"
                element={<Profile key={window.location.pathname} />}
              />
              <Route path="/host/homes" element={<HostHomes />} />
              <Route path="/account-settings" element={<Account />} />
              <Route path="/account-settings/:section" element={<Account />} />
              <Route path="/experiences" element={<Activities />} />
              <Route path="/experiences/:id" element={<Activities detail />} />
              <Route
                path="/services"
                element={<Activities kind="services" />}
              />
              <Route
                path="/services/:id"
                element={
                  <Activities key="service-detail" kind="services" detail />
                }
              />
              <Route path="/help" element={<Help />} />
              <Route path="/help/article/:id" element={<Help />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </SaveProvider>
      </BrowserRouter>
    </AppProvider>
  );
}
