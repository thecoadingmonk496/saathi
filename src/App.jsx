import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { UserProvider, useUser } from './context/UserContext';
import { LocationProvider } from './context/LocationContext';

// Existing Pages
import Dashboard from './pages/Dashboard';
import MarketPrices from './pages/MarketPrices';
import MarketExplorer from './pages/MarketExplorer';
import MandiInformation from './pages/MandiInformation';
import BuyerDiscovery from './pages/BuyerDiscovery';
import Reviews from './pages/Reviews';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Government from './pages/Government';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';

// Multi-Tier Supply Chain & Order Pages
import CropJourney from './pages/CropJourney';
import WholesalerDiscovery from './pages/WholesalerDiscovery';
import WholesalerOrders from './pages/WholesalerOrders';
import DistributorDiscovery from './pages/DistributorDiscovery';
import DistributorOrders from './pages/DistributorOrders';
import RetailerDiscovery from './pages/RetailerDiscovery';
import RetailerOrders from './pages/RetailerOrders';
import ConsumerDiscovery from './pages/ConsumerDiscovery';
import ConsumerOrders from './pages/ConsumerOrders';
import BuyerOrders from './pages/BuyerOrders';
import BuyerRegister from './pages/BuyerRegister';
import BuyerStatus from './pages/BuyerStatus';
import BuyerUpdate from './pages/BuyerUpdate';

function ProtectedPage({ children }) {
  const { isLoggedIn } = useUser();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <UserProvider>
      <LocationProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth Routes */}
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />

            {/* Public Landing Page */}
            <Route path="/" element={<Layout><Dashboard /></Layout>} />
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/about" element={<Layout><About /></Layout>} />

            {/* Protected Core Market Routes */}
            <Route path="/prices" element={<ProtectedPage><MarketPrices /></ProtectedPage>} />
            <Route path="/mandis" element={<ProtectedPage><MandiInformation /></ProtectedPage>} />
            <Route path="/buyers" element={<ProtectedPage><BuyerDiscovery /></ProtectedPage>} />
            <Route path="/explorer" element={<ProtectedPage><MarketExplorer /></ProtectedPage>} />
            <Route path="/crop-journey" element={<ProtectedPage><CropJourney /></ProtectedPage>} />
            <Route path="/reviews" element={<ProtectedPage><Reviews /></ProtectedPage>} />
            <Route path="/government" element={<ProtectedPage><Government /></ProtectedPage>} />
            <Route path="/ai" element={<ProtectedPage><Dashboard /></ProtectedPage>} />

            {/* Protected Supply Chain Discovery Routes */}
            <Route path="/wholesalers" element={<ProtectedPage><WholesalerDiscovery /></ProtectedPage>} />
            <Route path="/distributors" element={<ProtectedPage><DistributorDiscovery /></ProtectedPage>} />
            <Route path="/retailers" element={<ProtectedPage><RetailerDiscovery /></ProtectedPage>} />
            <Route path="/consumers" element={<ProtectedPage><ConsumerDiscovery /></ProtectedPage>} />

            {/* Buyer Onboarding & Self-Service */}
            <Route path="/buyer-register" element={<BuyerRegister />} />
            <Route path="/buyer-status" element={<BuyerStatus />} />
            <Route path="/buyer-update/:id" element={<BuyerUpdate />} />

            {/* Protected Order & Account Routes */}
            <Route path="/buyer/orders" element={<ProtectedPage><BuyerOrders /></ProtectedPage>} />
            <Route path="/wholesaler/orders" element={<ProtectedPage><WholesalerOrders /></ProtectedPage>} />
            <Route path="/distributor/orders" element={<ProtectedPage><DistributorOrders /></ProtectedPage>} />
            <Route path="/retailer/orders" element={<ProtectedPage><RetailerOrders /></ProtectedPage>} />
            <Route path="/consumer/orders" element={<ProtectedPage><ConsumerOrders /></ProtectedPage>} />
            <Route path="/profile" element={<ProtectedPage><Profile /></ProtectedPage>} />
            <Route path="/notifications" element={<ProtectedPage><Notifications /></ProtectedPage>} />

            {/* Admin Management */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<Admin />} />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </LocationProvider>
    </UserProvider>
  );
}
