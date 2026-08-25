import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, Shield, MapPin, User, Building, Truck, Store, ShoppingBag, Leaf, ExternalLink, Activity
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { useUser } from '../context/UserContext';

export default function CropJourney() {
  const [searchParams] = useSearchParams();
  const batchId = searchParams.get('batchId');
  const navigate = useNavigate();
  const { user } = useUser();
  const token = localStorage.getItem('token');
  
  const [journeyData, setJourneyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStage, setSelectedStage] = useState('wholesaler');
  const [transparencyScore, setTransparencyScore] = useState(0);
  const [checklist, setChecklist] = useState({
    govData: false, buyerVerified: false, digitalRecords: false, secureRecords: false, locationTracking: false
  });
  
  const [myJourneys, setMyJourneys] = useState([]);
  const [loadingMyJourneys, setLoadingMyJourneys] = useState(!batchId);
  const [showManualSearch, setShowManualSearch] = useState(false);

  useEffect(() => {
    if (batchId) {
      fetchJourney(batchId);
    } else if (token) {
      fetchMyJourneys();
    } else {
      setLoadingMyJourneys(false);
    }
  }, [batchId, token]);

  const fetchMyJourneys = async () => {
    setLoadingMyJourneys(true);
    try {
      const res = await fetch(`http://localhost:5001/api/transactions/user/my-journeys`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMyJourneys(data.journeys);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMyJourneys(false);
    }
  };

  const fetchJourney = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/api/transactions/journey/${id}`);
      const data = await res.json();
      if (data.success && data.journey) {
        setJourneyData(data.journey);
        calculateTransparency(data.journey);
      } else {
        setError('No traceability record found for this transaction.');
      }
    } catch (err) {
      setError('Unable to load crop journey. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTransparency = (journey) => {
    let score = 0;
    const checks = {
      govData: false, buyerVerified: false, digitalRecords: true, secureRecords: true, locationTracking: true
    };
    
    score += 20; // Digital Records (20)
    score += 20; // Secure Records (20)
    score += 20; // Location Tracking (20)
    
    // Check if stages are verified
    const verifiedStages = Object.values(journey).filter(stage => 
      stage?.status === 'verified' || (Array.isArray(stage) && stage.some(s => s.status === 'verified'))
    );
    if (verifiedStages.length > 0) {
      checks.buyerVerified = true;
      score += 20; // Buyer Verified (20)
    }

    if (journey.mandi && journey.mandi.status === 'government') {
      checks.govData = true;
      score += 20; // Government Data (20)
    }

    setChecklist(checks);
    setTransparencyScore(score);
  };

  if (!batchId) {
    if (loadingMyJourneys) {
      return <div className="min-h-screen bg-[#FDFCF5] flex items-center justify-center pt-20"><p className="font-bold text-emerald-800">Loading your journeys...</p></div>;
    }

    return (
      <div className="min-h-screen pt-24 px-4 pb-16 relative z-10 font-sans">
        <div className="max-w-[1000px] mx-auto bg-[#FDFCF5] rounded-3xl p-6 sm:p-10 shadow-2xl">
          
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-[#0C3B2E] flex items-center gap-2 mb-2">
                <Leaf className="w-8 h-8 text-emerald-500" />
                Your Crop Journeys
              </h1>
              <p className="text-gray-600 text-sm font-medium">Select a recent transaction to view its full traceability journey.</p>
            </div>
            {!showManualSearch && (
              <button 
                onClick={() => setShowManualSearch(true)}
                className="text-sm font-bold text-emerald-600 hover:text-emerald-700 underline"
              >
                Track a specific batch
              </button>
            )}
          </div>

          {showManualSearch && (
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 mb-8 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-[#0C3B2E] text-sm mb-1">Manual Tracking</h3>
                <p className="text-xs text-gray-500">Enter a Batch ID or Transaction ID directly.</p>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const inputVal = e.target.batchInput.value.trim();
                  if (inputVal) navigate(`/crop-journey?batchId=${inputVal}`);
                }}
                className="flex w-full sm:w-auto gap-2"
              >
                <input 
                  name="batchInput"
                  type="text" 
                  placeholder="e.g. WS-2026-08..."
                  className="w-full sm:w-64 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                />
                <button type="submit" className="bg-[#0C3B2E] hover:bg-emerald-900 text-white px-5 py-2 rounded-xl font-bold text-sm transition">
                  Search
                </button>
              </form>
            </div>
          )}

          {myJourneys.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-[#0C3B2E] mb-2">No crop journeys yet</h2>
              <p className="text-gray-500 text-sm">You haven't participated in any recorded transactions yet. Once you buy or sell crops on SAATHI, your supply chain journeys will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myJourneys.map(journey => (
                <div key={journey.batchId} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:border-emerald-300 hover:shadow-md transition cursor-pointer group" onClick={() => navigate(`/crop-journey?batchId=${journey.batchId}`)}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                        <Leaf className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#0C3B2E] capitalize">{journey.product}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{new Date(journey.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-emerald-600">{journey.quantity} {journey.unit}</div>
                      <div className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-1 inline-block ${journey.verificationStatus === 'VERIFIED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {journey.verificationStatus}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-3 flex justify-between items-center text-xs">
                    <div>
                      <span className="block text-[9px] font-bold text-gray-400 uppercase">Origin Farmer</span>
                      <span className="font-bold text-gray-700">{journey.originator || 'Unknown'}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] font-bold text-gray-400 uppercase">Latest Stage</span>
                      <span className="font-bold text-gray-700">{journey.stage.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
                    <span className="text-[10px] font-mono text-gray-400 font-bold truncate max-w-[150px]">{journey.batchId}</span>
                    <span className="text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      View Journey <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen bg-[#FDFCF5] flex items-center justify-center pt-20"><p className="font-bold text-emerald-800">Loading journey...</p></div>;
  }

  if (error || !journeyData) {
    return <div className="min-h-screen bg-[#FDFCF5] flex items-center justify-center pt-20"><p className="font-bold text-red-600">{error}</p></div>;
  }

  const extractStageData = (stageKey) => {
    if (stageKey === 'farmer') return journeyData.farmers && journeyData.farmers.length > 0 ? journeyData.farmers[0].data : null;
    return journeyData[stageKey]?.data;
  };

  const stages = [
    { key: 'farmer', label: 'Farmer', num: 1 },
    { key: 'mandi', label: 'Mandi', num: 2 },
    { key: 'wholesaler', label: 'Wholesaler', num: 3 },
    { key: 'distributor', label: 'Distributor', num: 4 },
    { key: 'retailer', label: 'Retailer', num: 5 },
    { key: 'consumer', label: 'Consumer', num: 6 }
  ];

  const chartData = [];
  stages.forEach(stage => {
    const data = extractStageData(stage.key);
    if (data && data.price) {
      chartData.push({ stage: stage.label, price: data.price, key: stage.key });
    }
  });

  const selectedData = extractStageData(selectedStage);
  const currentIndex = chartData.findIndex(d => d.key === selectedStage);
  let previousPrice = null;
  let currentPrice = null;
  
  if (currentIndex > 0) {
    previousPrice = chartData[currentIndex - 1].price;
    currentPrice = chartData[currentIndex].price;
  } else if (currentIndex === 0) {
    currentPrice = chartData[0].price;
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 relative z-10 font-sans">
      <div className="max-w-[1400px] mx-auto bg-[#FDFCF5] rounded-3xl p-4 sm:p-8 lg:p-10 shadow-2xl">
      
      {/* HEADER SECTION */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0C3B2E] flex items-center gap-2 mb-2">
              <Leaf className="w-8 h-8 text-emerald-500" />
              Crop Journey
            </h1>
            <p className="text-gray-600 text-sm font-medium">Track your crop from farm to consumer — every step, every price</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
            {['STATE', 'DISTRICT', 'BLOCK / TEHSIL', 'MARKET / MANDI', 'CROP / COMMODITY'].map(label => (
              <div key={label} className="min-w-[120px]">
                <label className="block text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-1">{label}</label>
                <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-700 truncate max-w-[140px]">
                  {label === 'CROP / COMMODITY' ? 'Wheat' : (extractStageData('farmer')?.location?.split(',')[0] || 'Auto-detected')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* MAIN LEFT COLUMN */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* TIMELINE PANEL */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-x-auto overflow-y-hidden hide-scrollbar">
              <div className="flex items-center justify-between relative z-10 px-2 sm:px-8 min-w-[600px] lg:min-w-0">
                {stages.map((stage) => {
                  const isActive = extractStageData(stage.key) != null;
                  const isSelected = selectedStage === stage.key;
                  return (
                    <div 
                      key={stage.key} 
                      onClick={() => isActive && setSelectedStage(stage.key)}
                      className={`flex flex-col items-center gap-2 z-10 relative cursor-pointer ${isActive ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400">{stage.num}</span>
                        <h3 className={`text-xs font-bold ${isSelected ? 'text-[#0C3B2E]' : 'text-gray-700'}`}>{stage.label}</h3>
                      </div>
                      <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden shadow-sm border-2 ${isSelected ? 'border-emerald-500 scale-110' : 'border-transparent'} transition-all`}>
                        <img src={`/images/journey/${stage.key}.jpg`} alt={stage.label} className="w-full h-full object-cover bg-gray-100" />
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mt-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Completed
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Connecting line */}
              <div className="absolute top-[4.5rem] left-12 right-12 h-1.5 bg-gray-100 rounded-full z-0 pointer-events-none min-w-[500px] lg:min-w-0">
                <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${Math.max(0, (chartData.length - 1) * 20)}%` }}></div>
              </div>
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* PRICE JOURNEY GRAPH */}
              <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-[#0C3B2E]">Price Journey <span className="text-gray-400 font-medium text-xs">(₹ per Quintal)</span></h3>
                  <div className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500">
                    Price per Quintal
                  </div>
                </div>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} tickFormatter={(val) => `₹${val}`} dx={-10} domain={['dataMin - 100', 'dataMax + 100']} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold', fontSize: '12px' }}
                        formatter={(value) => [`₹${value}`, 'Price']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#10B981" 
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* WHY PRICE CHANGED */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                <h3 className="font-bold text-[#0C3B2E] mb-6">Why Price Changed?</h3>
                <div className="space-y-4 flex-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span> Transport Cost</span>
                    <span className="font-semibold text-gray-400 italic">Not recorded</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span> Storage Cost</span>
                    <span className="font-semibold text-gray-400 italic">Not recorded</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span> Handling Cost</span>
                    <span className="font-semibold text-gray-400 italic">Not recorded</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span> Market Charges</span>
                    <span className="font-semibold text-gray-400 italic">Not recorded</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                  <span className="font-bold text-[#0C3B2E] text-sm">Total Increase</span>
                  <span className="font-extrabold text-emerald-600 text-lg">
                    {previousPrice && currentPrice ? `+₹${currentPrice - previousPrice}` : 'N/A'}
                  </span>
                </div>
              </div>

            </div>

            {/* BOTTOM CARDS */}
            <div>
              <h3 className="font-bold text-[#0C3B2E] mb-4">Journey Flow — Detailed Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {stages.map(stage => {
                  const data = extractStageData(stage.key);
                  const isAvailable = data != null;
                  return (
                    <div key={stage.key} className={`bg-white rounded-xl border border-gray-100 p-3 flex flex-col relative overflow-hidden ${!isAvailable ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-1.5 mb-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                          <img src={`/images/journey/${stage.key}.jpg`} className="w-4 h-4 rounded-full object-cover mix-blend-multiply opacity-70" alt="" />
                        </div>
                        <h4 className="font-bold text-[11px] text-[#0C3B2E]">{stage.label}</h4>
                      </div>
                      
                      {isAvailable ? (
                        <div className="space-y-2 flex-1">
                          <div>
                            <div className="text-[8px] font-bold text-gray-400 uppercase">Participant</div>
                            <div className="text-[10px] font-bold text-gray-700 truncate">{data.buyer || data.seller}</div>
                          </div>
                          <div>
                            <div className="text-[8px] font-bold text-gray-400 uppercase">Quantity</div>
                            <div className="text-[10px] font-bold text-gray-700">{data.quantity} {data.unit}</div>
                          </div>
                          <div>
                            <div className="text-[8px] font-bold text-gray-400 uppercase">Price</div>
                            <div className="text-[10px] font-bold text-emerald-700">₹{data.price}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-[10px] text-gray-400 font-medium italic">Pending</div>
                      )}
                      
                      <div className="mt-3 pt-2 border-t border-gray-50 flex justify-center">
                        <button 
                          onClick={() => isAvailable && setSelectedStage(stage.key)}
                          className="text-[9px] font-bold text-gray-500 hover:text-emerald-600 transition"
                        >
                          View Details v
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3 mt-6">
              <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-xs font-medium text-emerald-800 leading-relaxed">
                Government data verifies market-level information; downstream transaction details are shown only when recorded/verified through SAATHI.
              </p>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* TRANSPARENCY SCORE CARD */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-start gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-2 text-gray-500">
                  <Shield className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Transparency Score</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-extrabold text-emerald-500">{transparencyScore}</span>
                  <span className="text-lg font-bold text-gray-300">/ 100</span>
                </div>
                <div className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-600 text-[10px] font-bold">
                  Highly Transparent
                </div>
              </div>
              
              <div className="flex-1 space-y-2 border-l border-gray-100 pl-4">
                <div className="flex items-center justify-between text-[9px] font-bold">
                  <span className="text-gray-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Government Data</span>
                  <span className={checklist.govData ? 'text-gray-800' : 'text-gray-300'}>{checklist.govData ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center justify-between text-[9px] font-bold">
                  <span className="text-gray-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Buyer Verified</span>
                  <span className={checklist.buyerVerified ? 'text-gray-800' : 'text-gray-300'}>{checklist.buyerVerified ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center justify-between text-[9px] font-bold">
                  <span className="text-gray-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Digital Records</span>
                  <span className={checklist.digitalRecords ? 'text-gray-800' : 'text-gray-300'}>Yes</span>
                </div>
                <div className="flex items-center justify-between text-[9px] font-bold">
                  <span className="text-gray-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Secure Records</span>
                  <span className={checklist.secureRecords ? 'text-gray-800' : 'text-gray-300'}>Yes</span>
                </div>
                <div className="flex items-center justify-between text-[9px] font-bold">
                  <span className="text-gray-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Location Tracking</span>
                  <span className={checklist.locationTracking ? 'text-gray-800' : 'text-gray-300'}>Yes</span>
                </div>
              </div>
            </div>

            {/* STAGE DETAILS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Stage Details</span>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-100 mb-3">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> 
                    Stage {stages.find(s => s.key === selectedStage)?.num} of 6
                  </div>
                  <h2 className="text-2xl font-extrabold text-[#0C3B2E]">{stages.find(s => s.key === selectedStage)?.label}</h2>
                </div>

                {selectedData ? (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3 text-gray-500 font-medium">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center"><User className="w-4 h-4" /></div>
                        Participant Name
                      </div>
                      <div className="font-bold text-gray-900">{selectedData.buyer || selectedData.seller}</div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3 text-gray-500 font-medium">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center"><MapPin className="w-4 h-4" /></div>
                        Location
                      </div>
                      <div className="font-bold text-gray-900 truncate max-w-[140px] text-right">{selectedData.location || 'N/A'}</div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3 text-gray-500 font-medium">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center"><Activity className="w-4 h-4" /></div>
                        Price (₹/q)
                      </div>
                      <div className="font-bold text-gray-900">₹{selectedData.price}</div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3 text-gray-500 font-medium">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center"><Store className="w-4 h-4" /></div>
                        Quantity
                      </div>
                      <div className="font-bold text-gray-900">{selectedData.quantity} {selectedData.unit}</div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3 text-gray-500 font-medium">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center"><CheckCircle2 className="w-4 h-4" /></div>
                        Payment Status
                      </div>
                      <div className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] tracking-wider uppercase border border-emerald-100">
                        {selectedData.verificationStatus === 'VERIFIED' ? 'PAID' : 'PENDING'}
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3 text-gray-500 font-medium">
                        <ExternalLink className="w-4 h-4 text-gray-400" /> Transaction ID
                      </div>
                      <div className="bg-gray-100 px-2 py-1 rounded text-[10px] font-mono font-bold text-gray-600 truncate max-w-[140px]">
                        {selectedData.transactionId}
                      </div>
                    </div>
                    
                    <button className="w-full mt-4 bg-[#0C3B2E] text-white py-3 rounded-xl font-bold text-sm hover:bg-emerald-900 transition flex items-center justify-center gap-2">
                      View Source <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="py-10 text-center text-gray-400 text-sm font-medium italic">
                    This stage has not yet been recorded in SAATHI.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
