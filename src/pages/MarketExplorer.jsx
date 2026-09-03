const API_BASE = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '')).replace(/\/$/, '') + '/api';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Leaf,
  Shield,
  CheckCircle2,
  ChevronDown,
  X,
  MapPin,
  Clock,
  User,
  Check,
  TrendingUp,
  AlertTriangle,
  Building,
  Truck,
  Package,
  Store,
  ShoppingBag,
  ChevronRight,
  ChevronUp,
} from 'lucide-react';
import { marketService } from '../api/marketService';

const MOCK_JOURNEYS = {
  Wheat: {
    product: "Wheat",
    batchId: "SAATHI-TXN-28491",
    journey: {
      farmers: [
        {
          status: "verified",
          data: {
            transactionId: "TXN-WHT-FARM-01",
            seller: "Rajesh Kumar",
            location: "Chandauli, UP",
            quantity: 500,
            unit: "quintal",
            price: 2150,
            date: "2026-08-15T08:30:00Z"
          }
        }
      ],
      wholesaler: {
        status: "verified",
        data: {
          transactionId: "TXN-WHT-WHOL-02",
          buyer: "Kisan Agro Trading",
          location: "Varanasi Mandi, UP",
          quantity: 500,
          unit: "quintal",
          price: 2250,
          date: "2026-08-16T10:15:00Z"
        }
      },
      distributor: {
        status: "verified",
        data: {
          transactionId: "TXN-WHT-DIST-03",
          buyer: "UP State Logistics",
          location: "Lucknow Depot, UP",
          quantity: 500,
          unit: "quintal",
          price: 2350,
          date: "2026-08-18T14:45:00Z"
        }
      },
      retailer: {
        status: "verified",
        data: {
          transactionId: "TXN-WHT-RET-04",
          buyer: "FreshMart Supermarket",
          location: "Gomti Nagar, Lucknow",
          quantity: 50,
          unit: "quintal",
          price: 2500,
          date: "2026-08-20T09:20:00Z"
        }
      }
    }
  },
  Rice: {
    product: "Rice",
    batchId: "SAATHI-TXN-15943",
    journey: {
      farmers: [
        {
          status: "verified",
          data: {
            transactionId: "TXN-RCE-FARM-01",
            seller: "Suresh Patil",
            location: "Pune, MH",
            quantity: 200,
            unit: "quintal",
            price: 2900,
            date: "2026-08-12T07:15:00Z"
          }
        }
      ],
      wholesaler: {
        status: "verified",
        data: {
          transactionId: "TXN-RCE-WHOL-02",
          buyer: "Maha Agri Corp",
          location: "APMC Pune, MH",
          quantity: 200,
          unit: "quintal",
          price: 3100,
          date: "2026-08-13T11:00:00Z"
        }
      },
      distributor: {
        status: "verified",
        data: {
          transactionId: "TXN-RCE-DIST-03",
          buyer: "Western Supply Chain",
          location: "Mumbai Port Depot",
          quantity: 200,
          unit: "quintal",
          price: 3300,
          date: "2026-08-15T16:30:00Z"
        }
      },
      retailer: {
        status: "verified",
        data: {
          transactionId: "TXN-RCE-RET-04",
          buyer: "Sahakari Bhandar",
          location: "Dadar, Mumbai",
          quantity: 20,
          unit: "quintal",
          price: 3500,
          date: "2026-08-17T10:45:00Z"
        }
      }
    }
  },
  Potato: {
    product: "Potato",
    batchId: "SAATHI-TXN-59281",
    journey: {
      farmers: [
        {
          status: "verified",
          data: {
            transactionId: "TXN-POT-FARM-01",
            seller: "Amit Singh",
            location: "Agra, UP",
            quantity: 150,
            unit: "quintal",
            price: 1100,
            date: "2026-08-20T06:00:00Z"
          }
        }
      ],
      wholesaler: {
        status: "verified",
        data: {
          transactionId: "TXN-POT-WHOL-02",
          buyer: "Agra Cold Storage",
          location: "Agra Mandi, UP",
          quantity: 150,
          unit: "quintal",
          price: 1300,
          date: "2026-08-21T09:30:00Z"
        }
      },
      distributor: {
        status: "verified",
        data: {
          transactionId: "TXN-POT-DIST-03",
          buyer: "Delhi Fast Movers",
          location: "Azadpur Mandi, Delhi",
          quantity: 150,
          unit: "quintal",
          price: 1550,
          date: "2026-08-22T23:00:00Z"
        }
      },
      retailer: {
        status: "verified",
        data: {
          transactionId: "TXN-POT-RET-04",
          buyer: "Daily Needs Grocery",
          location: "Karol Bagh, Delhi",
          quantity: 10,
          unit: "quintal",
          price: 1800,
          date: "2026-08-24T08:15:00Z"
        }
      }
    }
  },
  Tomato: {
    product: "Tomato",
    batchId: "SAATHI-TXN-73412",
    journey: {
      farmers: [
        {
          status: "verified",
          data: {
            transactionId: "TXN-TOM-FARM-01",
            seller: "Lakshmi Narayana",
            location: "Madanapalle, AP",
            quantity: 80,
            unit: "quintal",
            price: 2000,
            date: "2026-08-25T05:30:00Z"
          }
        }
      ],
      wholesaler: {
        status: "verified",
        data: {
          transactionId: "TXN-TOM-WHOL-02",
          buyer: "AP Fresh Traders",
          location: "Madanapalle Mandi, AP",
          quantity: 80,
          unit: "quintal",
          price: 2400,
          date: "2026-08-25T11:00:00Z"
        }
      },
      distributor: {
        status: "verified",
        data: {
          transactionId: "TXN-TOM-DIST-03",
          buyer: "South Logistics",
          location: "Chennai Hub, TN",
          quantity: 80,
          unit: "quintal",
          price: 2800,
          date: "2026-08-26T04:00:00Z"
        }
      },
      retailer: {
        status: "verified",
        data: {
          transactionId: "TXN-TOM-RET-04",
          buyer: "Koyambedu Vegetables",
          location: "Koyambedu, Chennai",
          quantity: 5,
          unit: "quintal",
          price: 3200,
          date: "2026-08-26T07:30:00Z"
        }
      }
    }
  }
};

// -- Helper components --

const VerificationBadge = ({ status }) => {
  if (status === 'verified') return <div className="flex items-center gap-1 bg-[var(--saathi-surface-alt)] text-[var(--saathi-primary)] px-2.5 py-1 rounded-lg text-xs font-bold border border-[var(--saathi-border-light)]"><CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED</div>;
  if (status === 'pending') return <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-100"><Clock className="w-3.5 h-3.5" /> PENDING VERIFICATION</div>;
  if (status === 'failed') return <div className="flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-red-100"><AlertTriangle className="w-3.5 h-3.5" /> VERIFICATION FAILED</div>;
  return <div className="flex items-center gap-1 bg-[var(--saathi-surface-alt)] text-[var(--saathi-text-muted)] px-2.5 py-1 rounded-lg text-xs font-bold border border-[var(--saathi-border-light)]"><User className="w-3.5 h-3.5" /> UNVERIFIED</div>;
};

const ExpandableTransactionDetails = ({ data, isDemo, status }) => {
  const [expanded, setExpanded] = useState(false);
  if (!data) return null;

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="flex items-center gap-1.5 text-xs font-semibold text-[var(--saathi-primary)] hover:text-[var(--saathi-primary)] transition-colors"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        Transaction Details
      </button>
      
      {expanded && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[var(--saathi-surface-alt)]/50 rounded-lg p-3 text-xs border border-gray-100">
          <div>
            <div className="text-[var(--saathi-text-muted)] font-medium mb-0.5">Transaction ID</div>
            <div className="font-mono text-[var(--saathi-text-secondary)] font-semibold break-all">{data.transactionId || 'Not available'}</div>
          </div>
          <div>
            <div className="text-[var(--saathi-text-muted)] font-medium mb-0.5">Batch / Lot ID</div>
            <div className="font-mono text-[var(--saathi-text-secondary)] font-semibold break-all">{data.batchId || 'Not available'}</div>
          </div>
          <div>
            <div className="text-[var(--saathi-text-muted)] font-medium mb-0.5">Timestamp</div>
            <div className="text-[var(--saathi-text-secondary)] font-semibold">{data.date ? new Date(data.date).toLocaleString() : 'Not available'}</div>
          </div>
          <div>
            <div className="text-[var(--saathi-text-muted)] font-medium mb-0.5">Verification Record</div>
            <div className="font-mono text-[var(--saathi-text-secondary)] font-semibold break-all">{data.verificationRecordId || 'N/A'}</div>
          </div>
          {status === 'unverified' && (
            <div className="sm:col-span-2 text-gray-400 font-medium italic">
              This transaction has not yet been independently verified.
            </div>
          )}
          {isDemo && (
            <div className="sm:col-span-2 mt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold tracking-wider">
                DEMO DATA
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StageCard = ({ title, icon: Icon, color, data, status, isUnavailable, nextStageIcon }) => {
  if (isUnavailable || !data) {
    return (
      <div className="relative pl-8 md:pl-0">
        <div className="absolute left-[11px] top-6 bottom-[-24px] w-[2px] bg-gray-200 md:hidden z-0"></div>
        <div className="bg-white rounded-2xl border border-dashed border-[var(--saathi-border)] p-5 opacity-60 shadow-sm relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0`}>
              {Icon && <Icon className="w-4 h-4 text-gray-400" />}
            </div>
            <h3 className="font-bold text-[var(--saathi-text-muted)] text-base">{title}</h3>
          </div>
          <p className="text-xs text-gray-400 font-medium ml-11">Not yet recorded in SAATHI.</p>
        </div>
        {nextStageIcon && <div className="hidden md:flex justify-center py-3 text-gray-300"><div className="h-6 w-px bg-gray-200"></div></div>}
      </div>
    );
  }

  return (
    <div className="relative pl-8 md:pl-0">
       {nextStageIcon && <div className="absolute left-[11px] top-6 bottom-[-24px] w-[2px] bg-emerald-200 md:hidden z-0"></div>}

      <div className="bg-white rounded-2xl border border-[var(--saathi-border-light)] shadow-sm p-5 hover:shadow-md transition-shadow relative z-10 ring-1 ring-black/[0.02]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center shrink-0 shadow-sm`}>
              {Icon && <Icon className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h3 className="font-bold text-[var(--saathi-text)] text-lg">{title}</h3>
              <div className="text-xs font-semibold text-[var(--saathi-text-muted)] flex items-center gap-1 mt-0.5">
                <User className="w-3 h-3" /> {data?.buyer || data?.seller || 'Recorded Partner'}
              </div>
            </div>
          </div>
          <VerificationBadge status={status} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-2 bg-[var(--saathi-surface-alt)]/50 rounded-xl p-4 border border-gray-50">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Quantity</p>
            <p className="font-bold text-[var(--saathi-text)] text-sm">{data.quantity} {data.unit === 'quintal' ? 'QTL' : data.unit}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Price</p>
            <p className="font-bold text-[var(--saathi-primary)] text-sm">₹{data.price?.toLocaleString('en-IN')}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Location</p>
            <p className="font-semibold text-[var(--saathi-text-secondary)] text-sm truncate flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400 shrink-0"/>{data.location || 'Not available'}</p>
          </div>
        </div>

        <ExpandableTransactionDetails data={data} isDemo={data.transactionId?.includes('DEMO')} status={status} />
      </div>

       {nextStageIcon && (
        <div className="hidden md:flex justify-center py-4 text-emerald-300">
          <div className="h-6 w-[2px] bg-[var(--saathi-primary)] rounded-full"></div>
        </div>
      )}
    </div>
  );
};


// -- Main Component --

export default function MarketExplorer() {
  const [searchParams] = useSearchParams();
  const batchId = searchParams.get('batchId');
  
  const [batchJourneyData, setBatchJourneyData] = useState(null);
  const [productName, setProductName] = useState('Commodity');
  const [loadingData, setLoadingData] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Mandi Data states
  const [statesOfIndia, setStatesOfIndia] = useState([]);
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [availableMarkets, setAvailableMarkets] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedMandi, setSelectedMandi] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [mandiRecord, setMandiRecord] = useState(null);

  const cropsList = ["Wheat", "Rice", "Maize", "Cotton", "Sugarcane", "Mustard", "Soyabean", "Potato"];

  // Fetch batch journey if batchId exists
  useEffect(() => {
    if (batchId) {
      if (batchId.startsWith('SAATHI-TXN-')) {
        const cropKey = Object.keys(MOCK_JOURNEYS).find(k => MOCK_JOURNEYS[k].batchId === batchId);
        if (cropKey) {
          setBatchJourneyData(MOCK_JOURNEYS[cropKey].journey);
          setProductName(MOCK_JOURNEYS[cropKey].product);
          return;
        }
      }

      setLoadingData(true);
      fetch(`${API_BASE}/api/transactions/journey/${batchId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.journey) {
            setBatchJourneyData(data.journey);
            if (data.product) setProductName(data.product);
          } else {
             setApiError('No traceability record found for this batch.');
          }
          setLoadingData(false);
        })
        .catch(err => {
          console.error(err);
          setApiError('Unable to load crop journey. Please try again.');
          setLoadingData(false);
        });
    }
  }, [batchId]);

  // Fetch States on mount for Mandi section
  useEffect(() => {
    marketService.getGovernmentMandiStates().then(states => {
      const validStates = Array.isArray(states) ? states : [];
      setStatesOfIndia(validStates);
      if (validStates.length > 0) setSelectedState(validStates[0]);
    }).catch(err => {
      console.error('Failed to load states in MarketExplorer:', err);
      setStatesOfIndia([]);
    });
  }, []);

  // Fetch Districts when State changes
  useEffect(() => {
    if (selectedState) {
      marketService.getGovernmentMandiDistricts(selectedState).then(districts => {
        const validDistricts = Array.isArray(districts) ? districts : [];
        setAvailableDistricts(validDistricts);
        setSelectedDistrict('');
        setSelectedMandi('');
        setAvailableMarkets([]);
        setMandiRecord(null);
      }).catch(err => {
        console.error('Failed to load districts in MarketExplorer:', err);
        setAvailableDistricts([]);
      });
    }
  }, [selectedState]);

  // Fetch Markets when State+District+Crop changes
  useEffect(() => {
    if (selectedState && selectedDistrict && selectedCrop) {
      marketService.getGovernmentMandiPrices({
        state: selectedState,
        district: selectedDistrict,
        commodity: selectedCrop,
        limit: 100
      }).then(res => {
        if (res && res.success && Array.isArray(res.records)) {
          const uniqueMarkets = [...new Set(res.records.map(r => r.market))].filter(Boolean);
          setAvailableMarkets(uniqueMarkets);
          if (uniqueMarkets.length > 0 && !uniqueMarkets.includes(selectedMandi)) {
            setSelectedMandi(uniqueMarkets[0]);
          }
        } else {
          setAvailableMarkets([]);
        }
      }).catch(err => {
        console.error('Failed to load markets in MarketExplorer:', err);
        setAvailableMarkets([]);
      });
    }
  }, [selectedState, selectedDistrict, selectedCrop]);

  const handleSearchMandi = async () => {
    if (!selectedState || !selectedDistrict || !selectedCrop || !selectedMandi) return;
    try {
      const res = await marketService.getGovernmentMandiPrices({
        state: selectedState, district: selectedDistrict, commodity: selectedCrop, market: selectedMandi, limit: 1
      });
      if (res && res.success && Array.isArray(res.records) && res.records.length > 0) {
        setMandiRecord(res.records[0]);
      } else {
        setMandiRecord(false);
      }
    } catch {
      setMandiRecord(false);
    }
  };


  // --- Rendering logic ---

  if (loadingData) {
    return (
      <div className="min-h-screen bg-[var(--saathi-background)] flex flex-col items-center justify-center pt-16">
        <Leaf className="w-12 h-12 text-[var(--saathi-primary)] animate-bounce mb-4" />
        <h2 className="text-xl font-bold text-[var(--saathi-text)]">Loading crop journey...</h2>
        <p className="text-[var(--saathi-text-muted)] font-medium mt-2">Tracing origin records</p>
      </div>
    );
  }

  // Calculate Summary metrics
  const farmersList = batchJourneyData?.farmers || [];
  const totalFarmers = farmersList.length;
  const totalQuantity = farmersList.reduce((acc, f) => acc + (f.data?.quantity || 0), 0);
  
  let currentStageName = 'Farmer';
  let currentStageTime = null;
  let stagesRecorded = 1;

  if (farmersList.length > 0) {
     currentStageName = 'Buyer'; // Farm to Buyer is stage 1
     currentStageTime = farmersList[0].data?.date;
     stagesRecorded = 2;
  }
  if (batchJourneyData?.wholesaler?.status === 'verified') {
    currentStageName = 'Wholesaler';
    currentStageTime = batchJourneyData.wholesaler.data?.date;
    stagesRecorded = 3;
  }
  if (batchJourneyData?.distributor?.status === 'verified') {
    currentStageName = 'Distributor';
    currentStageTime = batchJourneyData.distributor.data?.date;
    stagesRecorded = 4;
  }
  if (batchJourneyData?.retailer?.status === 'verified') {
    currentStageName = 'Retailer';
    currentStageTime = batchJourneyData.retailer.data?.date;
    stagesRecorded = 5;
  }
  if (batchJourneyData?.consumer?.status === 'verified') {
    currentStageName = 'Consumer';
    currentStageTime = batchJourneyData.consumer.data?.date;
    stagesRecorded = 6;
  }

  const isCompleted = currentStageName === 'Consumer';

  return (
    <div className="min-h-screen bg-[var(--saathi-background)] font-sans pb-24 pt-16 text-[var(--saathi-text)]">
      
      {/* 1. HEADER SECTION */}
      <div className="bg-[var(--saathi-primary)] text-white pt-10 pb-20 px-6 relative overflow-hidden">
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="bg-[var(--saathi-primary)]/20 text-emerald-300 border border-[var(--saathi-primary)]/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Immutable Record
                </span>
                {(batchId?.includes('DEMO') || batchId?.startsWith('SAATHI-TXN-')) && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    SIMULATED DEMO
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2">
                Crop Journey
              </h1>
              <div className="text-emerald-100/80 font-medium text-lg flex items-center gap-2">
                <span className="capitalize">{productName}</span> 
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="font-mono text-sm opacity-80">Batch: {batchId || 'N/A'}</span>
              </div>
            </div>
            
            {batchJourneyData && (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center min-w-[200px]">
                <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">Current Location</p>
                <div className="text-2xl font-bold flex items-center justify-center gap-2">
                   {currentStageName}
                   {isCompleted && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
                </div>
                {currentStageTime && (
                  <p className="text-[10px] text-emerald-100/60 mt-1 font-medium">Last moved: {new Date(currentStageTime).toLocaleDateString()}</p>
                )}
                
                {batchId?.startsWith('SAATHI-TXN-') && (
                  <div className="mt-3 pt-3 border-t border-white/10 text-left">
                    <p className="text-emerald-300 text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><Shield className="w-3 h-3"/> Blockchain Verification</p>
                    <p className="text-xs text-white flex justify-between">Status: <span className="font-bold text-emerald-400">Verified ✓</span></p>
                    <p className="text-xs text-white/80 flex justify-between">Network: <span className="font-mono">Permissioned</span></p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-10 relative z-20">
        
        {apiError && !batchJourneyData ? (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center border border-gray-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-[var(--saathi-text)] mb-2">{apiError}</h2>
            <p className="text-[var(--saathi-text-muted)]">Please verify the Batch ID and try again.</p>
          </div>
        ) : !batchJourneyData ? (
          <div className="bg-white rounded-2xl shadow-xl p-10 text-center border border-gray-100 max-w-3xl mx-auto mt-10">
             <div className="w-16 h-16 bg-[var(--saathi-surface-alt)] rounded-full flex items-center justify-center mx-auto mb-4">
               <MapPin className="w-8 h-8 text-[var(--saathi-primary)]" />
             </div>
             <h2 className="text-xl font-bold text-[var(--saathi-text)] mb-2">Track Your Crop</h2>
             <p className="text-[var(--saathi-text-muted)] mb-8">Select a demo crop below to simulate a blockchain verification process, or enter a valid Batch ID.</p>
             
             {/* Demo Crops Section */}
             <div className="mb-10">
               <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Simulate Crop Journey</div>
               <div className="flex flex-wrap items-center justify-center gap-3">
                 {Object.keys(MOCK_JOURNEYS).map(crop => (
                   <button
                     key={crop}
                     onClick={() => window.location.href = `/explorer?batchId=${MOCK_JOURNEYS[crop].batchId}`}
                     className="px-5 py-2.5 rounded-xl border-2 border-[var(--saathi-primary)] text-[var(--saathi-primary)] font-bold hover:bg-[var(--saathi-surface-alt)] transition-colors flex items-center gap-2"
                   >
                     <Leaf className="w-4 h-4" /> {crop}
                   </button>
                 ))}
               </div>
             </div>
             
             <div className="flex items-center gap-4 max-w-sm mx-auto mb-6">
               <div className="h-px bg-gray-200 flex-1"></div>
               <span className="text-xs font-bold text-gray-400">OR</span>
               <div className="h-px bg-gray-200 flex-1"></div>
             </div>

             <form 
               onSubmit={(e) => {
                 e.preventDefault();
                 const inputVal = e.target.batchInput.value.trim();
                 if (inputVal) {
                   window.location.href = `/explorer?batchId=${inputVal}`;
                 }
               }}
               className="flex flex-col sm:flex-row items-center gap-2 max-w-sm mx-auto"
             >
               <input 
                 name="batchInput"
                 type="text" 
                 placeholder="Enter Batch ID..."
                 className="flex-1 w-full rounded-xl border border-[var(--saathi-border-light)] bg-[var(--saathi-surface-alt)] px-4 py-2.5 text-sm font-semibold text-[var(--saathi-text)] outline-none focus:border-[var(--saathi-primary)] focus:ring-4 focus:ring-[var(--saathi-primary)]"
               />
               <button type="submit" className="w-full sm:w-auto bg-[var(--saathi-primary)] hover:bg-[var(--saathi-primary-hover)] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition">
                 Search
               </button>
             </form>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: TIMELINE (col-span-8) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* SUMMARY PANEL */}
              <div className="bg-white rounded-2xl shadow-sm border border-[var(--saathi-border-light)] p-6 grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-gray-100">
                <div className="px-2 text-center">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Origin</div>
                  <div className="text-xl font-extrabold text-[var(--saathi-text)]">{totalFarmers} <span className="text-sm font-semibold text-[var(--saathi-text-muted)]">Farmers</span></div>
                </div>
                <div className="px-2 text-center">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Sourced</div>
                  <div className="text-xl font-extrabold text-[var(--saathi-primary)]">{totalQuantity} <span className="text-sm font-semibold opacity-70">QTL</span></div>
                </div>
                <div className="px-2 text-center">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Stages</div>
                  <div className="text-xl font-extrabold text-[var(--saathi-text)]">{stagesRecorded} <span className="text-sm font-semibold text-[var(--saathi-text-muted)]">/ 6</span></div>
                </div>
                <div className="px-2 text-center">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Verified</div>
                  <div className="text-xl font-extrabold text-[var(--saathi-text)]">{stagesRecorded} <span className="text-sm font-semibold text-[var(--saathi-text-muted)]">hops</span></div>
                </div>
              </div>

              <h2 className="text-lg font-bold text-[var(--saathi-text)] px-2 mt-8 mb-4 border-b border-[var(--saathi-border-light)] pb-2">Complete Supply Chain Traceability</h2>

              {/* VERTICAL TIMELINE */}
              <div className="relative pb-10">

                {/* 1. FARM ORIGINS (Multi-farmer support) */}
                <div className="relative pl-8 md:pl-0 mb-6">
                  {/* Mobile timeline connector */}
                  <div className="absolute left-[11px] top-6 bottom-[-24px] w-[2px] bg-emerald-200 md:hidden z-0"></div>
                  
                  <div className="flex items-center gap-2 mb-4 md:justify-center">
                    <div className="bg-[var(--saathi-border-light)] text-[var(--saathi-primary)] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-[var(--saathi-border)] z-10 bg-white">
                      Farm Origin
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                    {farmersList.map((farmer, idx) => (
                      <div key={farmer.data?.transactionId || idx} className="bg-white rounded-2xl border border-[var(--saathi-border-light)] shadow-sm p-4 relative ring-1 ring-black/[0.02] hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-3">
                           <div className="flex items-center gap-2.5">
                             <div className="w-8 h-8 rounded-full bg-[var(--saathi-surface-alt)] flex items-center justify-center shrink-0">
                               <Leaf className="w-4 h-4 text-[var(--saathi-primary)]" />
                             </div>
                             <div>
                               <h4 className="font-bold text-[var(--saathi-text)] text-sm">{farmer.data?.seller || 'Unknown Farmer'}</h4>
                               <p className="text-[10px] font-semibold text-[var(--saathi-text-muted)] flex items-center gap-0.5 mt-0.5"><MapPin className="w-3 h-3"/> {farmer.data?.location || 'Unknown'}</p>
                             </div>
                           </div>
                           <div className="text-[var(--saathi-primary)]"><CheckCircle2 className="w-4 h-4" /></div>
                        </div>
                        <div className="bg-[var(--saathi-surface-alt)] rounded-lg p-3 grid grid-cols-2 gap-2 text-xs border border-gray-100">
                          <div><span className="text-gray-400 font-bold text-[10px] uppercase">Qty</span><br/><span className="font-bold text-[var(--saathi-text)]">{farmer.data?.quantity} QTL</span></div>
                          <div><span className="text-gray-400 font-bold text-[10px] uppercase">Price</span><br/><span className="font-bold text-[var(--saathi-primary)]">₹{farmer.data?.price}</span></div>
                        </div>
                        <ExpandableTransactionDetails data={farmer.data} isDemo={farmer.data?.transactionId?.includes('DEMO')} status={farmer.status} />
                      </div>
                    ))}
                  </div>

                  {/* Desktop timeline connector */}
                  <div className="hidden md:flex justify-center py-4 text-emerald-300">
                    <div className="h-6 w-[2px] bg-[var(--saathi-primary)] rounded-full"></div>
                  </div>
                </div>

                {/* 2. BUYER (Aggregator) */}
                {/* Note: In this architecture, the buyer is technically the receiver of the farmer transactions. We consolidate them into a Buyer stage. */}
                {farmersList.length > 0 && (
                   <StageCard 
                     title="Buyer / Aggregator"
                     icon={Building}
                     color="bg-teal-500"
                     data={{
                       ...farmersList[0].data, 
                       quantity: totalQuantity, // Aggregate
                       seller: undefined // It's the buyer now
                     }}
                     status={farmersList[0].status}
                     nextStageIcon={true}
                   />
                )}

                {/* 3. WHOLESALER */}
                <StageCard 
                  title="Wholesaler"
                  icon={Truck}
                  color="bg-red-500"
                  data={batchJourneyData.wholesaler?.data}
                  status={batchJourneyData.wholesaler?.status}
                  isUnavailable={!batchJourneyData.wholesaler?.data}
                  nextStageIcon={true}
                />

                {/* 4. DISTRIBUTOR */}
                <StageCard 
                  title="Distributor"
                  icon={Package}
                  color="bg-indigo-500"
                  data={batchJourneyData.distributor?.data}
                  status={batchJourneyData.distributor?.status}
                  isUnavailable={!batchJourneyData.distributor?.data}
                  nextStageIcon={true}
                />

                {/* 5. RETAILER */}
                <StageCard 
                  title="Retailer"
                  icon={Store}
                  color="bg-purple-500"
                  data={batchJourneyData.retailer?.data}
                  status={batchJourneyData.retailer?.status}
                  isUnavailable={!batchJourneyData.retailer?.data}
                  nextStageIcon={true}
                />

                {/* 6. CONSUMER */}
                <StageCard 
                  title="Consumer"
                  icon={ShoppingBag}
                  color="bg-rose-500"
                  data={batchJourneyData.consumer?.data}
                  status={batchJourneyData.consumer?.status}
                  isUnavailable={!batchJourneyData.consumer?.data}
                  nextStageIcon={false}
                />

              </div>
            </div>

            {/* RIGHT COLUMN: GOVERNMENT & MARKETPLACE (col-span-4) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* GOVERNMENT MANDI RECORD */}
              <div className="bg-white rounded-2xl shadow-sm border border-[var(--saathi-border-light)] overflow-hidden sticky top-24">
                <div className="bg-[var(--saathi-primary)] px-5 py-4 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-200" />
                    <h3 className="font-bold text-sm">GOVERNMENT / MANDI</h3>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-blue-300" />
                </div>
                
                <div className="p-5">
                  <p className="text-xs font-medium text-[var(--saathi-text-muted)] mb-4 leading-relaxed">
                    Compare this commercial batch against official government Mandi records to verify fair pricing.
                  </p>

                  <div className="space-y-4">
                     <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">State</label>
                      <select 
                        value={selectedState} 
                        onChange={(e) => setSelectedState(e.target.value)}
                        className="w-full text-sm font-semibold border-[var(--saathi-border-light)] rounded-lg bg-[var(--saathi-surface-alt)] focus:ring-[var(--saathi-accent)] focus:border-[var(--saathi-accent)] py-2">
                        {(Array.isArray(statesOfIndia) ? statesOfIndia : []).map(state => <option key={state} value={state}>{state}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">District</label>
                      <select 
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        className="w-full text-sm font-semibold border-[var(--saathi-border-light)] rounded-lg bg-[var(--saathi-surface-alt)] focus:ring-[var(--saathi-accent)] focus:border-[var(--saathi-accent)] py-2">
                        <option value="">Select District</option>
                        {(Array.isArray(availableDistricts) ? availableDistricts : []).map(dist => <option key={dist} value={dist}>{dist}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Crop</label>
                      <select 
                        value={selectedCrop}
                        onChange={(e) => setSelectedCrop(e.target.value)}
                        className="w-full text-sm font-semibold border-[var(--saathi-border-light)] rounded-lg bg-[var(--saathi-surface-alt)] focus:ring-[var(--saathi-accent)] focus:border-[var(--saathi-accent)] py-2">
                        <option value="">Select Crop</option>
                        {(Array.isArray(cropsList) ? cropsList : []).map(crop => <option key={crop} value={crop}>{crop}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Market</label>
                      <select 
                        value={selectedMandi}
                        onChange={(e) => setSelectedMandi(e.target.value)}
                        disabled={!Array.isArray(availableMarkets) || availableMarkets.length === 0}
                        className="w-full text-sm font-semibold border-[var(--saathi-border-light)] rounded-lg bg-[var(--saathi-surface-alt)] focus:ring-[var(--saathi-accent)] focus:border-[var(--saathi-accent)] py-2 disabled:opacity-50">
                        {(!Array.isArray(availableMarkets) || availableMarkets.length === 0) && <option value="">No markets found</option>}
                        {(Array.isArray(availableMarkets) ? availableMarkets : []).map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <button 
                      onClick={handleSearchMandi} 
                      disabled={!selectedState || !selectedDistrict || !selectedCrop || !selectedMandi}
                      className="w-full bg-[var(--saathi-accent)] hover:bg-[var(--saathi-accent-dark)] text-white font-bold py-2.5 rounded-xl transition text-sm disabled:opacity-50 mt-2">
                      Fetch Official Price
                    </button>
                  </div>

                  {mandiRecord && (
                    <div className="mt-6 pt-5 border-t border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Official Modal Price</div>
                        <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-[var(--saathi-accent-dark)] border border-red-100">data.gov.in</div>
                      </div>
                      <div className="text-3xl font-extrabold text-blue-900 mb-1">
                        ₹{mandiRecord.modal_price} <span className="text-sm font-semibold text-[var(--saathi-text-muted)]">/ QTL</span>
                      </div>
                      <div className="text-xs font-semibold text-[var(--saathi-text-secondary)] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" /> {mandiRecord.market}, {mandiRecord.district}
                      </div>
                      <div className="text-[10px] font-medium text-gray-400 mt-3 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Arrival Date: {mandiRecord.arrival_date}
                      </div>
                    </div>
                  )}

                  {mandiRecord === false && (
                    <div className="mt-5 p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-xs font-semibold text-center">
                      No official records found for this selection.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
