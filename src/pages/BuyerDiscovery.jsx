import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import BuyerDashboard from '../components/buyer-discovery/BuyerDashboard';
import FarmerDashboard from '../components/buyer-discovery/FarmerDashboard';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')
).replace(/\/$/, '');
const apiUrl = (path) => `${API_BASE_URL}${path}`;

export default function BuyerDiscovery() {
  const { user, updateUser } = useUser();
  const [application, setApplication] = useState(null);
  const [checkingApp, setCheckingApp] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'BUYER' && user.role !== 'WHOLESALER' && user.role !== 'RETAILER' && user.role !== 'DISTRIBUTOR' && user.role !== 'FARMER') {
      const checkApp = async () => {
        let phoneToCheck = user?.phone || user?.mobile || '';
        if (phoneToCheck) {
          phoneToCheck = phoneToCheck.replace(/^\+91/, '').replace(/\s/g, '');
        }
        const emailToCheck = user?.email;
        if (!phoneToCheck && !emailToCheck) return;
        
        setCheckingApp(true);
        try {
          const queryParams = new URLSearchParams();
          if (phoneToCheck) queryParams.append('phone', phoneToCheck);
          if (emailToCheck) queryParams.append('email', emailToCheck);
          
          const token = localStorage.getItem('token');
          const response = await fetch(apiUrl(`/api/buyers/my-application?${queryParams.toString()}`), {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          if (response.ok && data.success && data.application) {
            if (data.application.verificationStatus === 'APPROVED') {
              let newRole = 'BUYER';
              const typeUpper = (data.application.buyerType || '').toUpperCase();
              if (typeUpper.includes('WHOLESALER')) newRole = 'WHOLESALER';
              else if (typeUpper.includes('RETAILER')) newRole = 'RETAILER';
              else if (typeUpper.includes('DISTRIBUTOR')) newRole = 'DISTRIBUTOR';
              
              updateUser({ role: newRole });
            } else {
              setApplication(data.application);
            }
          }
        } catch (err) {
          console.error(err);
        } finally {
          setCheckingApp(false);
        }
      };
      checkApp();
    }
  }, [user, updateUser]);

  const isBuyerRole = user && ['BUYER', 'WHOLESALER', 'RETAILER', 'DISTRIBUTOR'].includes(user.role);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {application && application.verificationStatus !== 'APPROVED' && (
        <div className="mb-6 p-4 rounded-xl border bg-amber-50 border-amber-200 flex items-start gap-3">
          <span className="text-2xl">⏳</span>
          <div>
            <h3 className="font-bold text-amber-800">Your Buyer Application is {application.verificationStatus.replace('_', ' ')}</h3>
            <p className="text-sm text-amber-700 mt-1">
              {application.verificationStatus === 'ACTION_REQUIRED' 
                ? `Admin Message: ${application.adminRemarks || 'Please update your application.'}`
                : 'Our team is reviewing your details. Once approved, you will get full access to the buyer marketplace.'}
            </p>
          </div>
        </div>
      )}

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
      ) : checkingApp ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-[var(--saathi-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading your dashboard...</p>
        </div>
      ) : isBuyerRole ? (
        <BuyerDashboard />
      ) : user.role === 'FARMER' ? (
        <FarmerDashboard />
      ) : (
        <div className="text-center py-12">
          <p>Your account type ({user.role}) does not have access to this workflow yet. {application ? '' : 'Please register as a buyer first.'}</p>
          {!application && (
            <button 
              onClick={() => window.location.href = '/buyer-register'} 
              className="mt-4 px-6 py-2 bg-[var(--saathi-primary)] text-white rounded-lg font-bold"
            >
              Register as Buyer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
