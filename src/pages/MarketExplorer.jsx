import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Leaf,
  Shield,
  CheckCircle2,
  ChevronDown,
  X,
  MapPin,
  Lock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Link as LinkIcon
} from 'lucide-react';
import { marketService } from '../api/marketService';

// Recharts Custom Marker
const CustomizedDot = (props) => {
  const { cx, cy } = props;
  return (
    <circle cx={cx} cy={cy} r={4} fill="#fff" stroke="#10B981" strokeWidth={2.5} />
  );
};

const CustomizedLabel = (props) => {
  const { x, y, value } = props;
  if (value === null || value === undefined) return null;
  return (
    <text x={x} y={y - 12} fill="#111827" fontSize={11} fontWeight="bold" textAnchor="middle">
      {`₹${value.toLocaleString('en-IN')}`}
    </text>
  );
};

export default function MarketExplorer() {
  const [statesOfIndia, setStatesOfIndia] = useState([]);
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [availableMarkets, setAvailableMarkets] = useState([]);

  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedMandi, setSelectedMandi] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');

  const [mandiRecord, setMandiRecord] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [latestDataInfo, setLatestDataInfo] = useState(null);

  const cropsList = ["Wheat", "Rice", "Maize", "Cotton", "Sugarcane", "Mustard", "Soyabean", "Potato"];

  // 1. Fetch States on mount
  useEffect(() => {
    marketService.getGovernmentMandiStates().then(states => {
      setStatesOfIndia(states || []);
      if (states && states.length > 0) setSelectedState(states[0]);
    });
  }, []);

  // 2. Fetch Districts when State changes
  useEffect(() => {
    if (selectedState) {
      marketService.getGovernmentMandiDistricts(selectedState).then(districts => {
        setAvailableDistricts(districts || []);
        setSelectedDistrict('');
        setSelectedBlock('');
        setSelectedMandi('');
        setAvailableMarkets([]);
        setMandiRecord(null);
        setLatestDataInfo(null);
        setApiError(null);
      });
    }
  }, [selectedState]);

  // 3 & 4. Fetch Markets when State+District+Crop changes
  useEffect(() => {
    if (selectedState && selectedDistrict && selectedCrop) {
      marketService.getGovernmentMandiPrices({
        state: selectedState,
        district: selectedDistrict,
        commodity: selectedCrop,
        limit: 100
      }).then(res => {
        if (res.success && res.records) {
          const uniqueMarkets = [...new Set(res.records.map(r => r.market))].filter(Boolean);
          setAvailableMarkets(uniqueMarkets);
          if (uniqueMarkets.length > 0 && !uniqueMarkets.includes(selectedMandi)) {
            setSelectedMandi(uniqueMarkets[0]);
          }
        } else {
          setAvailableMarkets([]);
        }
      });
    }
  }, [selectedState, selectedDistrict, selectedCrop]);

  const handleViewJourney = async () => {
    if (!selectedState || !selectedDistrict || !selectedCrop || !selectedMandi) return;
    
    setLoadingData(true);
    setApiError(null);
    setMandiRecord(null);
    setLatestDataInfo(null);

    const res = await marketService.getGovernmentMandiPrices({
      state: selectedState,
      district: selectedDistrict,
      commodity: selectedCrop,
      market: selectedMandi,
      limit: 1
    });

    setLoadingData(false);

    if (!res.success) {
      setApiError('Government market data is temporarily unavailable.');
      return;
    }

    if (res.records && res.records.length > 0) {
      setMandiRecord(res.records[0]);
      setLatestDataInfo({
        isLatestAvailable: res.isLatestAvailable,
        latestArrivalDate: res.latestArrivalDate
      });
    } else {
      setMandiRecord(false); // Indicates no records found
    }
  };

  const priceData = [
    { name: 'Farmer', price: null, increase: null },
    { name: 'Mandi', price: mandiRecord ? mandiRecord.modal_price : null, increase: null },
    { name: 'Wholesaler', price: null, increase: null },
    { name: 'Distributor', price: null, increase: null },
    { name: 'Retailer', price: null, increase: null },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans pb-12 pt-16 text-[#111827]">
      
      {/* Top Header Section with Warm Earthy Background */}
      <div className="relative border-b border-[#E5E7EB] bg-gradient-to-br from-[#FDFCF8] via-[#F9F6EE] to-[#F3EFE6] overflow-hidden">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")' }}></div>
        
        <div className="relative z-10 max-w-[1600px] mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Title & Filters (Col-span-8) */}
            <div className="lg:col-span-8">
              <div className="mb-5">
                <h1 className="text-3xl font-bold flex items-center gap-2 text-[#111827]">
                  <Leaf className="text-[#10B981] h-8 w-8" fill="#10B981" />
                  Crop Journey
                </h1>
                <p className="text-sm font-medium text-[#6B7280] mt-1.5">
                  Track your crop from farm to consumer — every step, every price
                </p>
              </div>

              {/* Filter Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  {/* State */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">State</label>
                    <div className="relative">
                      <select 
                        value={selectedState} 
                        onChange={(e) => setSelectedState(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] focus:bg-white transition-colors">
                        {statesOfIndia.map(state => <option key={state} value={state}>{state}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  {/* District */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">District</label>
                    <div className="relative">
                      <select 
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] focus:bg-white transition-colors">
                        <option value="">Select District</option>
                        {availableDistricts.map(dist => <option key={dist} value={dist}>{dist}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  {/* Crop */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">Crop / Commodity</label>
                    <div className="relative">
                      <select 
                        value={selectedCrop}
                        onChange={(e) => setSelectedCrop(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] focus:bg-white transition-colors">
                        <option value="">Select Crop</option>
                        {cropsList.map(crop => <option key={crop} value={crop}>{crop}</option>)}
                      </select>
                      <X onClick={() => setSelectedCrop('')} className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600" />
                    </div>
                  </div>
                  {/* Market */}
                  <div className="lg:col-span-2">
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">Market / Mandi</label>
                    <div className="relative">
                      <select 
                        value={selectedMandi}
                        onChange={(e) => setSelectedMandi(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] focus:bg-white transition-colors disabled:opacity-50"
                        disabled={availableMarkets.length === 0}
                      >
                        {availableMarkets.length === 0 && <option value="">No markets found</option>}
                        {availableMarkets.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  {/* View Journey Button */}
                  <div className="flex items-end">
                    <button 
                      onClick={handleViewJourney} 
                      disabled={loadingData || !selectedState || !selectedDistrict || !selectedCrop || !selectedMandi}
                      className="w-full bg-[#0C3B2E] hover:bg-[#1B4D3E] text-white font-bold py-2 rounded-lg transition text-sm disabled:opacity-50">
                      {loadingData ? 'Loading...' : 'View Journey'}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Breadcrumb */}
              <div className="mt-3 text-xs font-medium text-[#6B7280] flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-amber-600" />
                Showing data for: <span className="font-semibold text-gray-800">{selectedState || 'State'} {'>'} {selectedDistrict || 'District'} {'>'} {selectedCrop || 'Crop'} {'>'} {selectedMandi || 'Market'}</span>
              </div>
            </div>

            {/* Right: Metrics (Col-span-4) */}
            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-4 h-full pt-1 lg:pt-0">
              {/* Transparency Score */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex-1 flex flex-col justify-center min-w-[180px]">
                <div className="flex items-center gap-2 mb-3 text-[#111827] font-semibold text-sm">
                  <Shield className="h-4 w-4 text-gray-500" />
                  Transparency Score
                </div>
                <div className="text-4xl font-extrabold text-[#10B981] flex items-baseline gap-1">
                  {mandiRecord ? '92' : '--'}<span className="text-xl text-gray-400 font-medium">/100</span>
                </div>
                {mandiRecord && <div className="text-xs font-bold text-[#10B981] mt-2 bg-[#ECFDF5] px-2 py-1 rounded-md inline-block self-start border border-[#10B981]/20">Highly Transparent</div>}
              </div>

              {/* Verification Checklist & Last Updated */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-1 flex flex-col justify-between min-w-[220px]">
                <div className="grid grid-cols-1 gap-2 text-[11px] font-semibold text-gray-600">
                  <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><CheckCircle2 className={`h-3.5 w-3.5 ${mandiRecord ? 'text-[#10B981]' : 'text-gray-300'}`}/> Government Data</span> <span className="text-gray-400">{mandiRecord ? 'Verified' : '--'}</span></div>
                  <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-gray-300"/> Buyer Verified</span> <span className="text-gray-400">--</span></div>
                  <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-gray-300"/> Digital Records</span> <span className="text-gray-400">--</span></div>
                  <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><CheckCircle2 className={`h-3.5 w-3.5 ${mandiRecord ? 'text-[#10B981]' : 'text-gray-300'}`}/> Secure Records</span> <span className="text-gray-400">{mandiRecord ? 'Yes' : '--'}</span></div>
                  <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><CheckCircle2 className={`h-3.5 w-3.5 ${mandiRecord ? 'text-[#10B981]' : 'text-gray-300'}`}/> Location Tracking</span> <span className="text-gray-400">{mandiRecord ? 'Yes' : '--'}</span></div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-end justify-between">
                  <div>
                    <div className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-300"></span> 
                      {latestDataInfo?.isLatestAvailable ? 'Latest Available Data' : 'Market Data Date'}
                    </div>
                    <div className="text-xs font-bold text-gray-800">{mandiRecord ? mandiRecord.arrival_date : '--'}</div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                     <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${mandiRecord ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>data.gov.in</div>
                     <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${mandiRecord ? 'bg-[#10B981] text-white border-transparent' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>AGMARKNET</div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        
        {apiError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {apiError}
          </div>
        )}
        
        {mandiRecord === false && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl mb-6 font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p>No government mandi record found for this combination.</p>
              <p className="text-sm font-medium mt-1">Try another market, commodity or date.</p>
            </div>
          </div>
        )}

        {loadingData ? (
          <div className="animate-pulse flex flex-col space-y-6">
            <div className="h-24 bg-gray-200 rounded-xl"></div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
               <div className="lg:col-span-8 h-80 bg-gray-200 rounded-xl"></div>
               <div className="lg:col-span-4 h-80 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        ) : mandiRecord ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Main Area (Col-span-8) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* Progress Stepper - Compact Horizontal */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 overflow-x-auto">
                <div className="flex items-center min-w-max px-2">
                  {[
                    { num: 1, name: 'Farmer', loc: mandiRecord.district, active: false, imgUrl: '/images/journey/farmer.jpg' },
                    { num: 2, name: 'Mandi', loc: mandiRecord.market, active: true, imgUrl: '/images/journey/mandi.jpg' },
                    { num: 3, name: 'Wholesaler', loc: '--', active: false, imgUrl: '/images/journey/wholesaler.jpg' },
                    { num: 4, name: 'Distributor', loc: '--', active: false, imgUrl: '/images/journey/distributor.jpg' },
                    { num: 5, name: 'Retailer', loc: '--', active: false, imgUrl: '/images/journey/retailer.jpg' },
                    { num: 6, name: 'Consumer', loc: '--', active: false, imgUrl: '/images/journey/consumer.jpg' },
                  ].map((step, idx) => (
                    <React.Fragment key={step.name}>
                      <div className={`relative px-4 py-2 rounded-lg flex items-center gap-3 w-[190px] shrink-0 ${step.active ? 'border border-[#10B981] bg-[#ECFDF5]/30' : 'border border-transparent hover:bg-gray-50'}`}>
                        <img src={step.imgUrl} alt={step.name} className="w-12 h-12 rounded object-cover shadow-sm shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0 ${step.active ? 'bg-[#10B981] text-white' : 'bg-gray-100 text-gray-500'}`}>{step.num}</span>
                            <span className="font-bold text-[13px] text-[#111827] truncate">{step.name}</span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-medium truncate mt-0.5">{step.loc}</span>
                          {step.active ? (
                            <span className="text-[9px] font-bold text-[#10B981] mt-0.5">Current Stage</span>
                          ) : (
                            <span className="text-[9px] font-bold text-gray-400 flex items-center gap-0.5 mt-0.5"><CheckCircle2 className="h-3 w-3 text-gray-300" /> Pending</span>
                          )}
                        </div>
                      </div>
                      {idx < 5 && <ArrowRight className="h-4 w-4 text-gray-300 shrink-0 mx-1" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Price Chart & Breakdown */}
              <div className="flex flex-col xl:flex-row gap-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                
                {/* Chart */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-base font-bold text-[#111827]">Price Journey <span className="text-xs font-medium text-gray-400 ml-1">(₹ per Quintal)</span></h3>
                    <div className="relative">
                      <select className="appearance-none rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-3 pr-8 text-[11px] font-bold text-gray-600 focus:outline-none">
                        <option>Price per Quintal</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  
                  <div className="h-[260px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={priceData} margin={{ top: 20, right: 30, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 600 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }} domain={[(mandiRecord.modal_price || 2000) - 1000, (mandiRecord.modal_price || 2000) + 1000]} tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} cursor={{ stroke: '#E5E7EB', strokeWidth: 2, strokeDasharray: '3 3' }} />
                        <Line 
                          type="monotone" 
                          dataKey="price" 
                          stroke="#10B981" 
                          strokeWidth={2.5} 
                          dot={<CustomizedDot />} 
                          label={<CustomizedLabel />}
                          activeDot={{ r: 5, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="w-full xl:w-64 shrink-0 flex flex-col justify-between pt-4 xl:pt-0 border-t xl:border-t-0 xl:border-l border-gray-100 xl:pl-6">
                  <div>
                    <h3 className="text-sm font-bold text-[#111827] mb-5">Why Price Changed?</h3>
                    <ul className="space-y-3.5">
                      <li className="flex justify-between items-center text-xs font-semibold text-[#6B7280]">
                        <span className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-gray-400"></span>Downstream Data</span>
                        <span className="font-bold text-[#111827]">Not available</span>
                      </li>
                      <li className="flex justify-between items-center text-xs font-semibold text-[#6B7280]">
                        <span className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-gray-400"></span>Mandi Modal Price</span>
                        <span className="font-bold text-[#10B981]">₹{mandiRecord.modal_price?.toLocaleString('en-IN')}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Journey Flow Detailed Information Grid (Compact Row) */}
              <div className="bg-transparent">
                <div className="flex justify-between items-end mb-3">
                  <h3 className="text-base font-bold text-[#111827]">Journey Flow — Detailed Information</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { title: 'Farmer', imgUrl: '/images/journey/farmer.jpg', data: [['Location', mandiRecord.district], ['Status', 'SAATHI data not yet available']] },
                    { title: 'Mandi', imgUrl: '/images/journey/mandi.jpg', data: [['Market', mandiRecord.market], ['Commodity', mandiRecord.commodity], ['Variety', mandiRecord.variety || 'FAQ'], ['Modal Price', `₹${mandiRecord.modal_price?.toLocaleString('en-IN') || 0} /q`], ['Date', mandiRecord.arrival_date]] },
                    { title: 'Wholesaler', imgUrl: '/images/journey/wholesaler.jpg', data: [['Status', 'SAATHI data not yet available']] },
                    { title: 'Distributor', imgUrl: '/images/journey/distributor.jpg', data: [['Status', 'SAATHI data not yet available']] },
                    { title: 'Retailer', imgUrl: '/images/journey/retailer.jpg', data: [['Status', 'SAATHI data not yet available']] },
                    { title: 'Consumer', imgUrl: '/images/journey/consumer.jpg', data: [['Status', 'Not available']] },
                  ].map((item, idx) => (
                    <div key={item.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-3.5 flex flex-col relative group hover:border-[#10B981]/40 transition-all h-full overflow-hidden">
                      <div className="flex items-center gap-2 mb-3">
                        <img src={item.imgUrl} alt={item.title} className="w-5 h-5 rounded-sm object-cover" />
                        <h4 className="font-bold text-[13px] text-gray-800">{item.title}</h4>
                      </div>
                      <div className="flex-1 relative mb-4">
                        <div className="space-y-2 relative z-10">
                          {item.data.map(([label, val]) => (
                            <div key={label} className="grid grid-cols-1 gap-0.5 text-[10px]">
                              <span className="text-gray-400 font-semibold">{label}</span>
                              <span className="font-bold text-gray-700 leading-tight bg-white/70 inline-block px-1 -mx-1 rounded">{val}</span>
                            </div>
                          ))}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-20 h-20 opacity-90 z-0">
                          <img src={item.imgUrl} alt={item.title} className="w-full h-full object-contain drop-shadow-md rounded-lg" style={{ maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 50%, rgba(0,0,0,0.2) 100%)', WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 50%, rgba(0,0,0,0.2) 100%)' }} />
                        </div>
                      </div>
                      <button className="w-full relative z-10 text-[10px] font-bold text-gray-600 bg-white border border-gray-200 rounded py-1.5 hover:bg-gray-50 transition mt-auto shadow-sm">View Details ∨</button>
                      {idx < 5 && <ArrowRight className="hidden lg:block absolute -right-2 top-[30%] h-3 w-3 text-gray-300 z-10 bg-[#F9FAFB]" />}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Sidebar Area (Col-span-4) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Stage Details Panel */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#FDFDFD]">
                   <h3 className="font-bold text-[13px] text-gray-500 uppercase tracking-wider">Stage Details</h3>
                   <X className="h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600" />
                </div>
                <div className="p-6">
                  <div className="mb-6">
                    <div className="inline-flex items-center gap-1.5 bg-[#ECFDF5] text-[#10B981] font-bold text-xs px-2.5 py-1 rounded-full mb-3 border border-[#10B981]/20">
                      <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
                      Stage 2 of 6
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Mandi Market</h2>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                      <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center border border-gray-100">
                        <img src="/images/details/warehouse.jpg" alt="Market" className="w-full h-full object-cover mix-blend-multiply" />
                      </div>
                      <div className="flex-1 flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-800">Market Name</span>
                        <span className="text-sm font-bold text-gray-900 text-right">{mandiRecord.market}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                      <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center border border-gray-100">
                        <img src="/images/details/pin.jpg" alt="Location" className="w-full h-full object-cover mix-blend-multiply scale-110" />
                      </div>
                      <div className="flex-1 flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-800">Location</span>
                        <span className="text-sm font-bold text-gray-900 text-right">{mandiRecord.district}, {mandiRecord.state}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                      <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center border border-gray-100">
                        <Leaf className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="flex-1 flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-800">Commodity</span>
                        <span className="text-sm font-bold text-gray-900 text-right">{mandiRecord.commodity}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                      <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center border border-gray-100">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-800">Variety / Grade</span>
                        <span className="text-sm font-bold text-gray-900 text-right">{mandiRecord.variety} / {mandiRecord.grade}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                      <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center border border-gray-100">
                        <img src="/images/details/boxes.jpg" alt="Price" className="w-full h-full object-cover mix-blend-multiply scale-125" />
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold text-gray-800">Modal Price (₹/q)</span>
                          <span className="text-sm font-bold text-[#10B981] text-right">₹{mandiRecord.modal_price?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>Min: ₹{mandiRecord.min_price?.toLocaleString('en-IN')}</span>
                          <span>Max: ₹{mandiRecord.max_price?.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                      <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center border border-gray-100">
                        <img src="/images/details/calendar.jpg" alt="Date" className="w-full h-full object-cover mix-blend-multiply scale-110" />
                      </div>
                      <div className="flex-1 flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-800">Arrival Date</span>
                        <span className="text-sm font-bold text-gray-900 text-right">{mandiRecord.arrival_date}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                      <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center border border-gray-100">
                         <LinkIcon className="h-4 w-4 text-gray-400 -rotate-45" />
                      </div>
                      <div className="flex-1 flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-800">Source</span>
                        <span className="text-[11px] font-mono font-medium text-gray-600 bg-gray-100 border border-gray-200 px-2 py-1 rounded">AGMARKNET</span>
                      </div>
                    </div>
                  </div>

                  <a href="https://agmarknet.gov.in" target="_blank" rel="noreferrer" className="w-full bg-[#0C3B2E] hover:bg-[#1B4D3E] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition text-sm shadow-md">
                    View Source <ArrowRight className="h-4 w-4 -rotate-45" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-gray-400">
            <Leaf className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="font-semibold">Select your filters and click "View Journey" to see government mandi data.</p>
          </div>
        )}

        {/* Footer Alert */}
        <div className="bg-[#ECFDF5] border border-[#10B981]/30 rounded-xl p-4 flex items-center gap-3 mt-4 mx-auto max-w-[1600px] shadow-sm">
          <div className="bg-white rounded-full p-1.5 shrink-0 shadow-sm border border-[#10B981]/20">
            <Lock className="h-4 w-4 text-[#10B981]" />
          </div>
          <p className="text-[13px] font-semibold text-[#064E3B]">
            Government data verifies market-level information; downstream transaction details are shown only when recorded/verified through SAATHI.
          </p>
        </div>

      </div>
    </div>
  );
}
