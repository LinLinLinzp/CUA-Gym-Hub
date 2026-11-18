import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Header from './components/Header.jsx'
import { Empty, FeedbackProvider, sessionPath } from './components/ui.jsx'
import { StoreProvider } from './store.jsx'
import { OrderDetails, Purchases } from './pages/Orders.jsx'
import { Checkout } from './pages/Checkout.jsx'
import { Circle } from './pages/Circle.jsx'
import { Cart } from './pages/Cart.jsx'
import { Catalog, Home, Product } from './pages/Shop.jsx'
import { Returns } from './pages/Returns.jsx'

function Layout() {
  return <><Header /><main className="container page" id="main" tabIndex={-1}><Outlet /></main></>
}

export default function App({ initialState }) {
  return <BrowserRouter><StoreProvider initialState={initialState}><FeedbackProvider><Routes>
    <Route element={<Layout />}>
      <Route index element={<Home />} />
      <Route path="/s" element={<Catalog />} />
      <Route path="/c/:categoryId" element={<Catalog />} />
      <Route path="/p/:productId" element={<Product />} />
      <Route path="/circle/dashboard" element={<Circle />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/co-cart" element={<Navigate to={sessionPath('/cart')} replace />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/orders" element={<Purchases />} />
      <Route path="/orders/:orderId" element={<OrderDetails />} />
      <Route path="/orders/:orderId/return" element={<Returns />} />
      <Route path="*" element={<Empty title="Page unavailable" to="/" action="Back to Target">The page you’re looking for may have moved.</Empty>} />
    </Route>
  </Routes></FeedbackProvider></StoreProvider></BrowserRouter>
}
