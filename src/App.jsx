import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import HeroBackground from './components/HeroBackground';
import Layout from './components/Layout';
import PersistentFooter from './components/PersistentFooter';
import { UserProvider, useUser } from './context/UserContext';
import { LocationProvider } from './context/LocationContext';
import BuyerDiscovery from './pages/BuyerDiscovery';
import BuyerOrders from './pages/BuyerOrders';
import Dashboard from './pages/Dashboard';
import Government from './pages/Government';
import MarketPrices from './pages/MarketPrices';
import MarketExplorer from './pages/MarketExplorer';
import Login from './pages/Login';
import Notifications from './pages/Notifications';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import BuyerRegister from './pages/BuyerRegister';
import BuyerStatus from './pages/BuyerStatus';
import BuyerUpdate from './pages/BuyerUpdate';
import WholesalerDiscovery from './pages/WholesalerDiscovery';
import WholesalerOrders from './pages/WholesalerOrders';
import DistributorDiscovery from './pages/DistributorDiscovery';
import DistributorOrders from './pages/DistributorOrders';
import RetailerDiscovery from './pages/RetailerDiscovery';
import RetailerOrders from './pages/RetailerOrders';
import ConsumerDiscovery from './pages/ConsumerDiscovery';
import ConsumerOrders from './pages/ConsumerOrders';
import CropJourney from './pages/CropJourney';

function ProtectedPage({ children }) {
  const { isLoggedIn } = useUser();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

function CatchAllRedirect() {
  const { isLoggedIn } = useUser();

  return <Navigate to={isLoggedIn ? '/' : '/login'} replace />;
}

function GlobalHeroBackground() {
  const { pathname } = useLocation();
  const pageOwnsHero = pathname === '/' || pathname === '/ai';

  if (pageOwnsHero) {
    return null;
  }

  return <HeroBackground />;
}

export default function App() {
  return (
    <UserProvider>
      <LocationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />

            <Route path="/" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
            <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
            <Route path="/buyers" element={<ProtectedPage><BuyerDiscovery /></ProtectedPage>} />
            <Route path="/buyer/orders" element={<ProtectedPage><BuyerOrders /></ProtectedPage>} />
            <Route path="/wholesalers" element={<ProtectedPage><WholesalerDiscovery /></ProtectedPage>} />
            <Route path="/wholesaler/orders" element={<ProtectedPage><WholesalerOrders /></ProtectedPage>} />
            <Route path="/distributors" element={<ProtectedPage><DistributorDiscovery /></ProtectedPage>} />
            <Route path="/distributor/orders" element={<ProtectedPage><DistributorOrders /></ProtectedPage>} />
            <Route path="/retailers" element={<ProtectedPage><RetailerDiscovery /></ProtectedPage>} />
            <Route path="/retailer/orders" element={<ProtectedPage><RetailerOrders /></ProtectedPage>} />
            <Route path="/consumers" element={<ProtectedPage><ConsumerDiscovery /></ProtectedPage>} />
            <Route path="/consumer/orders" element={<ProtectedPage><ConsumerOrders /></ProtectedPage>} />
            <Route path="/prices" element={<ProtectedPage><MarketPrices /></ProtectedPage>} />
            <Route path="/explorer" element={<ProtectedPage><MarketExplorer /></ProtectedPage>} />
            <Route path="/crop-journey" element={<ProtectedPage><CropJourney /></ProtectedPage>} />
            <Route path="/government" element={<ProtectedPage><Government /></ProtectedPage>} />
            <Route path="/profile" element={<ProtectedPage><Profile /></ProtectedPage>} />
            <Route path="/ai" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
            
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<Admin />} />

            <Route path="/buyer-register" element={<BuyerRegister />} />
            <Route path="/buyer-status" element={<BuyerStatus />} />
            <Route path="/buyer-update/:id" element={<BuyerUpdate />} />

            <Route path="/notifications" element={<ProtectedPage><Notifications /></ProtectedPage>} />
            <Route path="*" element={<CatchAllRedirect />} />
          </Routes>
        </BrowserRouter>
      </LocationProvider>
    </UserProvider>
  );
}
