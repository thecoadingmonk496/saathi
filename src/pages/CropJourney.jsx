import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useLocationContext } from '../context/LocationContext';
import { marketService } from '../api/marketService';
import { locationStates, getDistricts } from '../utils/locationOptions';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  MapPin,
  TrendingUp,
  TrendingDown,
  Info,
  CheckCircle2,
  Sprout,
  Building,
  Warehouse,
  Truck,
  Store,
  ShoppingBag,
  Loader2,
  AlertTriangle
} from 'lucide-react';

const formatRupees = (price) => {
  if (price === undefined || price === null || isNaN(price)) return '—';
  return `₹${Number(price).toLocaleString('en-IN')}`;
};

export default function CropJourney() {
  const { t } = useUser();
  const { address } = useLocationContext();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  
  // Data Options
  const [statesList, setStatesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [hasManualOverride, setHasManualOverride] = useState(false);
  const popularCrops = ['Wheat', 'Paddy', 'Potato', 'Tomato', 'Onion', 'Mustard', 'Maize'];

  // API State
  const [loading, setLoading] = useState(false);
  const [journeyData, setJourneyData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // 1a. Load states list on mount
  useEffect(() => {
    const loadStates = async () => {
      try {
        const list = await marketService.getGovernmentMandiStates();
        if (Array.isArray(list) && list.length > 0) {
          setStatesList(list);
        } else {
          setStatesList(locationStates);
        }
      } catch (err) {
        setStatesList(locationStates);
      }
    };
    loadStates();
  }, []);

  // 1b. Load districts list when selectedState changes
  useEffect(() => {
    if (!selectedState) {
      setDistrictsList([]);
      return;
    }
    const loadDistricts = async () => {
      try {
        const list = await marketService.getGovernmentMandiDistricts(selectedState);
        if (Array.isArray(list) && list.length > 0) {
          setDistrictsList(list);
        } else {
          setDistrictsList(getDistricts(selectedState));
        }
      } catch (err) {
        setDistrictsList(getDistricts(selectedState));
      }
    };
    loadDistricts();
  }, [selectedState]);

  // 1c. Auto-fill location
  useEffect(() => {
    if (hasManualOverride || !address || statesList.length === 0) return;
    const detectState = address.state || '';
    const detectDistrict = address.district || '';

    if (detectState) {
      const matchedState = statesList.find(s => s.toLowerCase() === detectState.toLowerCase());
      if (matchedState) {
        setSelectedState(matchedState);
        marketService.getGovernmentMandiDistricts(matchedState)
          .then(list => {
            if (Array.isArray(list) && list.length > 0) {
              setDistrictsList(list);
              if (detectDistrict) {
                const matchedDistrict = list.find(d => d.toLowerCase() === detectDistrict.toLowerCase());
                if (matchedDistrict) setSelectedDistrict(matchedDistrict);
              }
            }
          });
      }
    }
  }, [address, statesList, hasManualOverride]);

  // 1d. Handle URL params
  useEffect(() => {
    const s = searchParams.get('state');
    const d = searchParams.get('district');
    const c = searchParams.get('crop');
    
    if (s) {
      setSelectedState(s);
      setHasManualOverride(true);
    }
    if (d) setSelectedDistrict(d);
    if (c) setSelectedCrop(c);

    // Auto-fetch if all 3 are present
    if (s && d && c && !hasSearched) {
      handleTrackJourney(s, d, c);
    }
  }, [searchParams]);

  const handleTrackJourney = async (st = selectedState, dt = selectedDistrict, cr = selectedCrop) => {
    if (!st || !dt || !cr) {
      setErrorMsg('Please select State, District, and Crop');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setHasSearched(true);
    setJourneyData(null);
    
    // Update URL silently
    setSearchParams({ state: st, district: dt, crop: cr }, { replace: true });

    try {
      const response = await marketService.getCropJourney({
        state: st,
        district: dt,
        crop: cr
      });
      
      if (response && response.available === false) {
        setErrorMsg(response.message || 'Price not available for this location and crop.');
      } else {
        setJourneyData(response);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to fetch crop journey data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const stageIcons = {
    'Farmer': Sprout,
    'Mandi': Building,
    'Wholesaler': Warehouse,
    'Logistics': Truck,
    'Retail': Store,
    'Consumer': ShoppingBag
  };

  const getStageIcon = (stageName) => {
    const Icon = stageIcons[stageName] || Info;
    return <Icon className="w-8 h-8 text-emerald-600" />;
  };

  const gaugeData = journeyData ? [
    { name: 'Farmer Share', value: journeyData.farmerSharePercent },
    { name: 'Other', value: 100 - journeyData.farmerSharePercent }
  ] : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900">Crop Journey Transparency</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl">
          Track the estimated value distribution of agricultural commodities from the farmer to the consumer, anchored on real-time government mandi prices.
        </p>
      </header>

      {/* Filter Row */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">State</label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict('');
                setHasManualOverride(true);
              }}
              className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold focus:border-[#2E7D32] focus:ring-[#2E7D32]"
            >
              <option value="">Select State</option>
              {statesList.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">District</label>
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setHasManualOverride(true);
              }}
              disabled={!selectedState || districtsLoading}
              className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold focus:border-[#2E7D32] focus:ring-[#2E7D32] disabled:opacity-50"
            >
              <option value="">{districtsLoading ? 'Loading...' : 'Select District'}</option>
              {districtsList.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Crop</label>
            <input
              type="text"
              placeholder="e.g. Wheat"
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              list="popular-crops"
              className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold focus:border-[#2E7D32] focus:ring-[#2E7D32]"
            />
            <datalist id="popular-crops">
              {popularCrops.map(crop => <option key={crop} value={crop} />)}
            </datalist>
          </div>
          <div>
            <button
              onClick={() => handleTrackJourney()}
              disabled={loading || !selectedState || !selectedDistrict || !selectedCrop}
              className="w-full bg-[#064E3B] hover:bg-[#064E3B]/90 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Track Journey
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-red-800">{errorMsg}</h3>
          <p className="text-sm text-red-600 mt-1">Try selecting a different crop or nearby district.</p>
        </div>
      )}

      {!hasSearched && !loading && !errorMsg && (
        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-12 text-center">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">Select a location and crop</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Choose a state, district, and crop above to see its mathematical supply chain journey based on live mandi prices.
          </p>
        </div>
      )}

      {loading && !journeyData && (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Computing price model...</p>
        </div>
      )}

      {journeyData && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Hero Row */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-3 border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5" /> Live Anchor Price
              </div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">{journeyData.crop}</h2>
              <div className="flex items-center justify-center sm:justify-start gap-1 mt-2 text-slate-500 font-medium">
                <MapPin className="w-4 h-4" />
                {journeyData.district}, {journeyData.state}
              </div>
            </div>
            
            <div className="flex-1 text-center sm:text-right border-t sm:border-t-0 sm:border-l border-slate-100 pt-6 sm:pt-0 sm:pl-8">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Live Mandi Price</div>
              <div className="text-4xl font-black text-[#2E7D32]">
                {formatRupees(journeyData.mandiPrice.value)}
              </div>
              <div className="text-sm font-bold text-slate-500 mt-1">
                {journeyData.mandiPrice.unit}
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Last updated: {journeyData.mandiPrice.lastUpdated}
              </div>
            </div>
          </div>

          {/* Timeline and Gauge Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            
            {/* Timeline */}
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 overflow-x-auto">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">Supply Chain Model</h3>
              
              <div className="relative min-w-[600px]">
                {/* Dotted connecting line */}
                <div className="absolute top-12 left-8 right-8 h-0.5 border-t-2 border-dashed border-emerald-200"></div>
                
                <div className="relative flex justify-between">
                  {journeyData.stages.map((stage, idx) => (
                    <div key={idx} className="flex flex-col items-center w-24 group">
                      
                      {/* Percent Chip */}
                      <div className="h-6 mb-2">
                        {stage.changePercent !== 0 && (
                          <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-sm ${
                            stage.changePercent < 0 
                              ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                              : 'bg-rose-100 text-rose-700 border border-rose-200'
                          }`}>
                            {stage.changePercent < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                            {Math.abs(stage.changePercent)}%
                          </div>
                        )}
                      </div>
                      
                      {/* Icon Bubble */}
                      <div className="relative z-10 w-16 h-16 bg-white rounded-full border-4 border-emerald-50 flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform">
                        {getStageIcon(stage.stage)}
                      </div>
                      
                      {/* Details */}
                      <div className="text-center">
                        <div className="font-bold text-slate-700 text-sm mb-1">{stage.stage}</div>
                        <div className="font-black text-slate-900 text-lg">{formatRupees(stage.price)}</div>
                      </div>

                      {/* Tooltip Note */}
                      <div className="absolute top-32 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-medium p-2 rounded-lg w-32 text-center pointer-events-none z-20">
                        {stage.note}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Farmer Share Gauge */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 flex flex-col items-center justify-center text-center">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Farmer's Share</h3>
              
              <div className="relative w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gaugeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#F1F5F9" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-black text-slate-900">{journeyData.farmerSharePercent}%</span>
                </div>
              </div>
              
              <p className="mt-4 text-sm font-semibold text-slate-600">
                Of every ₹1 spent by the consumer, the farmer receives ~{journeyData.farmerSharePercent} paise.
              </p>
              
              {journeyData.arrivalVolume && (
                <div className="mt-6 pt-4 border-t border-slate-100 w-full">
                  <div className="text-xs font-bold text-slate-400 uppercase">Today's Mandi Arrival</div>
                  <div className="text-lg font-black text-slate-700">
                    {journeyData.arrivalVolume.value} {journeyData.arrivalVolume.unit}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Verified Buyers */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-8">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Verified Buyers Nearby
            </h3>
            
            {journeyData.verifiedBuyers && journeyData.verifiedBuyers.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {journeyData.verifiedBuyers.map((buyer, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50/50 border border-emerald-100">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">
                      {buyer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-emerald-900">{buyer.name}</div>
                      <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{buyer.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 font-medium">No verified buyers found in {journeyData.district} at the moment.</p>
            )}
          </div>

          {/* Disclaimer */}
          <div className="text-center pb-8">
            <p className="text-xs text-slate-400 max-w-3xl mx-auto flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              Disclaimer: The Mandi Price represents actual live data reported by the government. All downstream prices (Wholesaler, Logistics, Retail, Consumer) and the Farmer's Share percentage are mathematically modelled estimates based on standard regional category markups and do not represent exact transactions.
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
