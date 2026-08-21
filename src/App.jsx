import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import HeroBackground from './components/HeroBackground';
import Layout from './components/Layout';
import PersistentFooter from './components/PersistentFooter';
import { UserProvider, useUser } from './context/UserContext';
import { LocationProvider } from './context/LocationContext';
import BuyerDiscovery from './pages/BuyerDiscovery';
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
            <Route path="/prices" element={<ProtectedPage><MarketPrices /></ProtectedPage>} />
            <Route path="/explorer" element={<ProtectedPage><MarketExplorer /></ProtectedPage>} />
            <Route path="/government" element={<ProtectedPage><Government /></ProtectedPage>} />
            <Route path="/profile" element={<ProtectedPage><Profile /></ProtectedPage>} />
            <Route path="/ai" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
            <Route path="/admin" element={<ProtectedPage><Admin /></ProtectedPage>} />

            <Route path="/notifications" element={<ProtectedPage><Notifications /></ProtectedPage>} />
            <Route path="*" element={<CatchAllRedirect />} />
          </Routes>
        </BrowserRouter>
      </LocationProvider>
    </UserProvider>
  );
}
