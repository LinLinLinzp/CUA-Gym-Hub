import { Route, Routes } from 'react-router-dom'
import { ConfirmProvider } from './components/Confirm.jsx'
import { Missing } from './components/Empty.jsx'
import { Shell } from './components/Shell.jsx'
import { Browse } from './pages/Browse.jsx'
import { Credits } from './pages/Credits.jsx'
import { Library } from './pages/Library.jsx'
import { OrderDetails, Purchases } from './pages/Purchases.jsx'
import { TitleDetails } from './pages/TitleDetails.jsx'
import { WishList } from './pages/WishList.jsx'

export function App() {
  return (
    <ConfirmProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Library />} />
          <Route path="library" element={<Library />} />
          <Route path="browse" element={<Browse />} />
          <Route path="title/:titleId" element={<TitleDetails />} />
          <Route path="wishlist" element={<WishList />} />
          <Route path="account/credits" element={<Credits />} />
          <Route path="account/purchases" element={<Purchases />} />
          <Route path="account/purchases/:purchaseId" element={<OrderDetails />} />
          <Route path="*" element={<Missing title="Page not found" />} />
        </Route>
      </Routes>
    </ConfirmProvider>
  )
}
