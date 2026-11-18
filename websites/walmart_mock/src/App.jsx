import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { PickupPage } from './pages/Pickup.jsx'
import { windowLabel } from './data/pickup.js'
import { ManageRegistry, NewRegistry, RegistryHome, SharedRegistry } from './pages/Registry.jsx'
import { ReceiptPage } from './pages/Receipt.jsx'
import { ReturnDetails, StartReturn } from './pages/Returns.jsx'
import { OrderDetails, PurchaseHistory } from './pages/Orders.jsx'
import { CheckoutPage, ConfirmationPage } from './pages/Checkout.jsx'
import { CartPage } from './pages/Cart.jsx'
import { Home, ProductPage, SearchPage } from './pages/Shop.jsx'
import { Shell } from './components/Shell.jsx'
import { RecordRoute } from './components/RecordRoute.jsx'
import { Missing, money } from './components/UI.jsx'
import { StoreProvider, useStore } from './context/Store.jsx'
import { activeLines, array, cartStore, cents, find, validHold } from './data/model.js'

function ShoppingShell() {
  const { state } = useStore()
  const products = new Map(array(state.catalog).map(product => [product.id, product]))
  const lines = activeLines(state.cart)
  const quantity = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0)
  const subtotal = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * cents(products.get(line.productId)?.price), 0)
  const store = cartStore(state)
  const hold = validHold(state)
  const pickup = hold && store ? `${store.name} · ${windowLabel(find(state.pickupSlots, hold.slotId), store.timezone)}` : store?.name
  return <Shell cartQuantity={quantity} cartSubtotal={money(subtotal / 100)} pickup={pickup} />
}

export default function App() {
  return <BrowserRouter><StoreProvider><Routes>
    <Route element={<ShoppingShell />}>
      <Route index element={<Home />} />
      <Route path="search" element={<SearchPage />} />
      <Route path="item/:productId" element={<RecordRoute param="productId" component={ProductPage} />} />
      <Route path="cart" element={<CartPage />} />
      <Route path="checkout" element={<CheckoutPage />} />
      <Route path="pickup/reserve" element={<PickupPage />} />
      <Route path="account/purchase-history" element={<PurchaseHistory />} />
      <Route path="orders/:orderId" element={<RecordRoute param="orderId" component={OrderDetails} />} />
      <Route path="orders/:orderId/receipt" element={<RecordRoute param="orderId" component={ReceiptPage} />} />
      <Route path="orders/:orderId/confirmation" element={<RecordRoute param="orderId" component={ConfirmationPage} />} />
      <Route path="orders/:orderId/returns/new" element={<RecordRoute param="orderId" component={StartReturn} />} />
      <Route path="returns/:returnId" element={<RecordRoute param="returnId" component={ReturnDetails} />} />
      <Route path="registry" element={<RegistryHome />} />
      <Route path="registry/new" element={<NewRegistry />} />
      <Route path="registry/:registryId/manage" element={<RecordRoute param="registryId" component={ManageRegistry} />} />
      <Route path="registry/:registryId" element={<RecordRoute param="registryId" component={SharedRegistry} />} />
      <Route path="*" element={<Missing />} />
    </Route>
  </Routes></StoreProvider></BrowserRouter>
}
