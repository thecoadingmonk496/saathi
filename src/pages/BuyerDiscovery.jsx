import { useUser } from '../context/UserContext';
import BuyerDashboard from '../components/buyer-discovery/BuyerDashboard';
import FarmerDashboard from '../components/buyer-discovery/FarmerDashboard';

export default function BuyerDiscovery() {
  const { user } = useUser();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 border-b border-[var(--saathi-border-light)] pb-4">
        <h1 className="text-3xl font-bold text-[var(--saathi-text)]">SAATHI Market Match</h1>
        <p className="text-[var(--saathi-text-secondary)] mt-2">
          Connect directly to negotiate, verify crop quality, and transact securely.
        </p>
      </div>

      {!user ? (
        <div className="text-center py-12">
          <p>Please log in to access the Buyer Discovery platform.</p>
        </div>
      ) : user.role === 'BUYER' ? (
        <BuyerDashboard />
      ) : user.role === 'FARMER' ? (
        <FarmerDashboard />
      ) : (
        <div className="text-center py-12">
          <p>Your account type ({user.role}) does not have access to this workflow yet.</p>
        </div>
      )}
    </div>
  );
}
