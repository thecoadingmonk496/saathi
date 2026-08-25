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
  AlertTriangle,
  BadgeCheck,
  Thermometer,
  Route,
  Ruler,
  Snowflake,
  Timer,
  LineChart
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
  const [districtsLoading, setDistrictsLoading] = useState(false);
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
      setDistrictsLoading(true);
      try {
        const list = await marketService.getGovernmentMandiDistricts(selectedState);
        if (Array.isArray(list) && list.length > 0) {
          setDistrictsList(list);
        } else {
          setDistrictsList(getDistricts(selectedState));
        }
      } catch (err) {
        setDistrictsList(getDistricts(selectedState));
      } finally {
        setDistrictsLoading(false);
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
    const colors = {
      'Farmer': 'text-green-700',
      'Mandi': 'text-amber-700',
      'Wholesaler': 'text-blue-700',
      'Logistics': 'text-yellow-600',
      'Retail': 'text-red-500',
      'Consumer': 'text-purple-600'
    };
    return <Icon className={`w-8 h-8 ${colors[stageName] || 'text-emerald-600'}`} strokeWidth={1.5} />;
  };

  const gaugeData = journeyData ? [
    { name: 'Farmer Share', value: journeyData.farmerSharePercent },
    { name: 'Other', value: 100 - journeyData.farmerSharePercent }
  ] : [];

  return (
    <div className="min-h-screen w-full bg-[#F8FAF9] pt-28 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-4 mb-10">
        <div className="relative w-48">
          <select
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setSelectedDistrict('');
              setHasManualOverride(true);
            }}
            className="w-full appearance-none rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 font-medium focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
          >
            <option value="">State</option>
            {statesList.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
        
        <div className="relative w-48">
          <select
            value={selectedDistrict}
            onChange={(e) => {
              setSelectedDistrict(e.target.value);
              setHasManualOverride(true);
            }}
            disabled={!selectedState || districtsLoading}
            className="w-full appearance-none rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 font-medium focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm disabled:opacity-50"
          >
            <option value="">{districtsLoading ? 'Loading...' : 'District'}</option>
            {districtsList.map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>

        <div className="relative flex-grow max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Sprout className="h-4 w-4 text-amber-500" />
          </div>
          <input
            type="text"
            placeholder="Wheat"
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            list="popular-crops"
            className="w-full rounded-full border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-700 font-medium focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
          />
          <datalist id="popular-crops">
            {popularCrops.map(crop => <option key={crop} value={crop} />)}
          </datalist>
        </div>

        <button
          onClick={() => handleTrackJourney()}
          disabled={loading || !selectedState || !selectedDistrict || !selectedCrop}
          className="ml-auto bg-[#38A169] hover:bg-[#2F855A] text-white text-sm font-semibold py-2.5 px-6 rounded-full shadow-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Track Journey
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center mb-8">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-red-800">{errorMsg}</h3>
          <p className="text-sm text-red-600 mt-1">Try selecting a different crop or nearby district.</p>
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
          <div className="flex flex-col md:flex-row items-baseline justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900 capitalize tracking-tight">
              {journeyData.crop} {journeyData.batchId ? `- Batch: ${journeyData.batchId}` : '- Batch: 4591A'}
            </h1>
            
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <div className="text-gray-500 font-medium text-lg text-right">
                {journeyData.district}, {journeyData.state}
              </div>
              <div className="text-right border-l border-gray-300 pl-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">{formatRupees(journeyData.mandiPrice.value)}</span>
                  <span className="text-gray-900 font-bold text-xl ml-1">per {journeyData.mandiPrice.unit.toLowerCase()}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Live Mandi Price
                </div>
              </div>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 p-8 mb-8">
            <div className="flex flex-col xl:flex-row items-center gap-8 mb-8">
              {/* Timeline */}
              <div className="flex-grow w-full relative pt-8 pb-4 overflow-x-auto no-scrollbar">
                <div className="relative flex items-start justify-between min-w-[700px] px-2">
                  {journeyData.stages.map((stage, idx) => (
                    <React.Fragment key={idx}>
                      <div className="flex flex-col items-center w-24 group relative shrink-0">
                        
                        {/* Top Percent Chip */}
                        {stage.changePercent !== 0 && (
                          <div className="absolute -top-6 bg-white border border-orange-200 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full z-20 shadow-sm whitespace-nowrap">
                            {Math.abs(stage.changePercent)}%
                          </div>
                        )}
                        
                        {/* Icon Bubble */}
                        <div className="relative z-10 w-20 h-20 bg-[#E6F4EA] rounded-full flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(0,0,0,0.05)] border border-emerald-100/50">
                          {getStageIcon(stage.stage)}
                        </div>
                        
                        {/* Details */}
                        <div className="text-center">
                          <div className="font-bold text-gray-700 text-sm mb-0.5">{stage.stage}</div>
                          <div className="font-bold text-gray-900 text-lg mb-2">{formatRupees(stage.price)}</div>
                        </div>

                        {/* Bottom Tag Pill */}
                        {stage.changePercent !== 0 ? (
                          <div className="flex flex-col items-center">
                            <div className="bg-[#FFF4E5] text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                              <svg className="w-3 h-3 text-amber-600" viewBox="0 0 24 24" fill="currentColor"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7" stroke="white" strokeWidth="2"></line></svg>
                              {Math.abs(stage.changePercent)}%
                            </div>
                            {idx === journeyData.stages.length - 1 && (
                              <span className="text-[10px] text-gray-400 mt-1 font-medium">Markup</span>
                            )}
                          </div>
                        ) : (
                          <div className="h-5"></div>
                        )}
                        
                        {/* Tooltip Note */}
                        <div className="absolute top-24 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-medium p-2 rounded-lg w-32 text-center pointer-events-none z-30">
                          {stage.note}
                        </div>
                      </div>

                      {/* Dotted Line & Arrow for intermediate nodes */}
                      {idx < journeyData.stages.length - 1 && (
                        <div className="flex-grow flex items-center mt-10 px-1 pointer-events-none -mx-2">
                          <div className="flex-grow h-[2px]" style={{ backgroundImage: 'linear-gradient(to right, #34D399 50%, transparent 50%)', backgroundSize: '8px 2px', backgroundRepeat: 'repeat-x' }}></div>
                          <svg className="w-4 h-4 text-emerald-400 -ml-1 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="w-px bg-gray-200 self-stretch hidden xl:block mx-4"></div>

              {/* Gauge */}
              <div className="w-64 flex-shrink-0 flex flex-col items-center justify-center">
                <div className="relative w-48 h-48 mb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gaugeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill="#38A169" />
                        <Cell fill="#E2E8F0" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center flex-col pt-2">
                    <span className="text-4xl font-black text-gray-900">{journeyData.farmerSharePercent}%</span>
                    <span className="text-xs font-bold text-gray-700 mt-1">Farmer's Share</span>
                  </div>
                </div>
                
                <div className="text-center text-xs font-semibold text-gray-600 space-y-1">
                  <p>Avg. Farmer Markup: <span className="font-bold text-gray-900">{Math.abs(journeyData.stages?.[0]?.changePercent || 0)}%</span></p>
                  {journeyData.arrivalVolume && (
                     <p>Total Traceable Volume: <span className="font-bold text-gray-900">{journeyData.arrivalVolume.value} {journeyData.arrivalVolume.unit}</span></p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Divider */}
            <hr className="border-gray-100 my-6" />

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Quality */}
              <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <BadgeCheck className="w-5 h-5" />
                  <h3 className="text-base font-bold">Quality Profile</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-white border border-blue-200 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">Grade A</span>
                  <span className="bg-white border border-blue-200 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">12% Moisture</span>
                  <span className="bg-white border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
                    <Sprout className="w-3.5 h-3.5" /> Organic
                  </span>
                </div>
              </div>

              {/* Weather/Storage */}
              <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-100 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-amber-700">
                  <Thermometer className="w-5 h-5" />
                  <h3 className="text-base font-bold">Storage Conditions</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white rounded-xl p-3 border border-amber-100 flex flex-col shadow-sm">
                    <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mb-1">Temp</span>
                    <span className="font-black text-amber-900 text-lg">24°C</span>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-amber-100 flex flex-col shadow-sm">
                    <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mb-1">Humidity</span>
                    <span className="font-black text-amber-900 text-lg">60%</span>
                  </div>
                </div>
                <p className="text-xs text-amber-800 font-medium mt-1">Warehouse Rating: <span className="font-black">A+</span></p>
              </div>

              {/* Logistics */}
              <div className="bg-purple-50/50 rounded-2xl p-5 border border-purple-100 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-purple-700">
                  <Route className="w-5 h-5" />
                  <h3 className="text-base font-bold">Logistics Details</h3>
                </div>
                <ul className="text-sm text-purple-900 space-y-3 font-semibold">
                  <li className="flex items-center gap-3"><Ruler className="w-4 h-4 text-purple-500" /> Distance: 350 km</li>
                  <li className="flex items-center gap-3"><Snowflake className="w-4 h-4 text-purple-500" /> Refrigerated Truck</li>
                  <li className="flex items-center gap-3"><Timer className="w-4 h-4 text-purple-500" /> Est. Transit: 48 hrs</li>
                </ul>
              </div>

              {/* Market */}
              <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <LineChart className="w-5 h-5" />
                  <h3 className="text-base font-bold">Market Insight</h3>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-emerald-100 shadow-sm">
                    <span className="text-xs text-emerald-800 font-semibold">Demand</span>
                    <span className="text-xs font-black text-emerald-600 uppercase">High</span>
                  </div>
                  <div className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-emerald-100 shadow-sm">
                    <span className="text-xs text-emerald-800 font-semibold">Volatility</span>
                    <span className="text-xs font-black text-orange-600">+2.4%</span>
                  </div>
                  <div className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-emerald-100 shadow-sm">
                    <span className="text-xs text-emerald-800 font-semibold">Harvest</span>
                    <span className="text-xs font-black text-emerald-600 uppercase">Peak</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Verified Buyers */}
            <div>
              <h3 className="text-sm font-bold text-gray-600 mb-3">
                Verified Buyers Nearby
              </h3>
              
              {journeyData.verifiedBuyers && journeyData.verifiedBuyers.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {journeyData.verifiedBuyers.map((buyer, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm text-sm font-semibold text-gray-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      {buyer.name}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 font-medium bg-white px-4 py-2 rounded-xl inline-block border border-gray-200">No verified buyers found in {journeyData.district} at the moment.</p>
              )}
            </div>
          </div>
          
        </div>
      )}
      </div>
    </div>
  );
}
