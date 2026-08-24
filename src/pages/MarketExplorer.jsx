import React, { useState } from 'react';
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

// Recharts Custom Marker
const CustomizedDot = (props) => {
  const { cx, cy } = props;
  return (
    <circle cx={cx} cy={cy} r={4} fill="#fff" stroke="#10B981" strokeWidth={2.5} />
  );
};

const CustomizedLabel = (props) => {
  const { x, y, value } = props;
  return (
    <text x={x} y={y - 12} fill="#111827" fontSize={11} fontWeight="bold" textAnchor="middle">
      {`₹${value.toLocaleString('en-IN')}`}
    </text>
  );
};

export default function MarketExplorer() {
  const [selectedState, setSelectedState] = useState('Uttar Pradesh');
  const [selectedDistrict, setSelectedDistrict] = useState('Chandauli');
  const [selectedBlock, setSelectedBlock] = useState('Chakia');
  const [selectedMandi, setSelectedMandi] = useState('Chakia Mandi');
  const [selectedCrop, setSelectedCrop] = useState('Wheat');

  const statesOfIndia = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Lakshadweep", "Puducherry", "Jammu and Kashmir", "Ladakh"
  ];

  const upDistricts = [
    "Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri", "Kushinagar", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"
  ];

  const availableDistricts = selectedState === 'Uttar Pradesh' ? upDistricts : [selectedDistrict, "District 1", "District 2"];
  const cropsList = ["Wheat", "Rice", "Maize", "Cotton", "Sugarcane", "Mustard", "Soyabean", "Potato"];

  const priceData = [
    { name: 'Farmer', price: 2350, increase: null },
    { name: 'Mandi', price: 2400, increase: 50 },
    { name: 'Wholesaler', price: 2550, increase: 150 },
    { name: 'Distributor', price: 2750, increase: 200 },
    { name: 'Retailer', price: 3000, increase: 250 },
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* State */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">State</label>
                    <div className="relative">
                      <select 
                        value={selectedState} 
                        onChange={(e) => { setSelectedState(e.target.value); setSelectedDistrict(e.target.value === 'Uttar Pradesh' ? 'Chandauli' : 'Select District'); }}
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
                        {availableDistricts.map(dist => <option key={dist} value={dist}>{dist}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  {/* Block */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">Block / Tehsil</label>
                    <div className="relative">
                      <select 
                        value={selectedBlock}
                        onChange={(e) => setSelectedBlock(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] focus:bg-white transition-colors">
                        <option value="Chakia">Chakia</option>
                        <option value="Sakaldiha">Sakaldiha</option>
                        <option value="Chandauli">Chandauli</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  {/* Market */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">Market / Mandi</label>
                    <div className="relative">
                      <select 
                        value={selectedMandi}
                        onChange={(e) => setSelectedMandi(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 py-2 pl-3 pr-8 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] focus:bg-white transition-colors">
                        <option value="Chakia Mandi">Chakia Mandi</option>
                        <option value="Chandauli Mandi">Chandauli Mandi</option>
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
                        {cropsList.map(crop => <option key={crop} value={crop}>{crop}</option>)}
                      </select>
                      <X onClick={() => setSelectedCrop('')} className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Breadcrumb */}
              <div className="mt-3 text-xs font-medium text-[#6B7280] flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-amber-600" />
                Showing data for: <span className="font-semibold text-gray-800">{selectedState} {'>'} {selectedDistrict} {'>'} {selectedBlock} {'>'} {selectedMandi} {'>'} {selectedCrop}</span>
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
                  92<span className="text-xl text-gray-400 font-medium">/100</span>
                </div>
                <div className="text-xs font-bold text-[#10B981] mt-2 bg-[#ECFDF5] px-2 py-1 rounded-md inline-block self-start border border-[#10B981]/20">Highly Transparent</div>
              </div>

              {/* Verification Checklist & Last Updated */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-1 flex flex-col justify-between min-w-[220px]">
                <div className="grid grid-cols-1 gap-2 text-[11px] font-semibold text-gray-600">
                  <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]"/> Government Data</span> <span className="text-gray-400">Verified</span></div>
                  <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]"/> Buyer Verified</span> <span className="text-gray-400">Yes</span></div>
                  <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]"/> Digital Records</span> <span className="text-gray-400">Yes</span></div>
                  <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]"/> Secure Records</span> <span className="text-gray-400">Yes</span></div>
                  <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]"/> Location Tracking</span> <span className="text-gray-400">Yes</span></div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-end justify-between">
                  <div>
                    <div className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-300"></span> Last Updated
                    </div>
                    <div className="text-xs font-bold text-gray-800">24 Aug 2026, 11:30 AM</div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                     <div className="bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-100">data.gov.in</div>
                     <div className="bg-[#10B981] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">e-NAM</div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Main Area (Col-span-8) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Progress Stepper - Compact Horizontal */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 overflow-x-auto">
              <div className="flex items-center min-w-max px-2">
                {[
                  { num: 1, name: 'Farmer', loc: 'Chandauli, UP', active: false, imgUrl: '/images/journey/farmer.jpg' },
                  { num: 2, name: 'Mandi', loc: 'Chakia, UP', active: false, imgUrl: '/images/journey/mandi.jpg' },
                  { num: 3, name: 'Wholesaler', loc: 'Varanasi, UP', active: false, imgUrl: '/images/journey/wholesaler.jpg' },
                  { num: 4, name: 'Distributor', loc: 'Varanasi, UP', active: false, imgUrl: '/images/journey/distributor.jpg' },
                  { num: 5, name: 'Retailer', loc: 'Varanasi, UP', active: false, imgUrl: '/images/journey/retailer.jpg' },
                  { num: 6, name: 'Consumer', loc: 'End Customer', active: true, imgUrl: '/images/journey/consumer.jpg' },
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
                          <span className="text-[9px] font-bold text-gray-400 flex items-center gap-0.5 mt-0.5"><CheckCircle2 className="h-3 w-3 text-[#10B981]" /> Completed</span>
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
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }} domain={[1800, 3200]} ticks={[1800, 2200, 2600, 3000]} tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} cursor={{ stroke: '#E5E7EB', strokeWidth: 2, strokeDasharray: '3 3' }} />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#10B981" 
                        strokeWidth={2.5} 
                        dot={<CustomizedDot />} 
                        label={<CustomizedLabel />}
                        activeDot={{ r: 5, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  
                  {/* Plus Labels mapped roughly to the lines */}
                  <div className="absolute left-[26%] top-[68%] text-[11px] font-extrabold text-[#10B981]">+₹50</div>
                  <div className="absolute left-[45%] top-[55%] text-[11px] font-extrabold text-[#10B981]">+₹150</div>
                  <div className="absolute left-[65%] top-[45%] text-[11px] font-extrabold text-[#10B981]">+₹200</div>
                  <div className="absolute left-[85%] top-[35%] text-[11px] font-extrabold text-[#10B981]">+₹250</div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="w-full xl:w-64 shrink-0 flex flex-col justify-between pt-4 xl:pt-0 border-t xl:border-t-0 xl:border-l border-gray-100 xl:pl-6">
                <div>
                  <h3 className="text-sm font-bold text-[#111827] mb-5">Why Price Changed?</h3>
                  <ul className="space-y-3.5">
                    <li className="flex justify-between items-center text-xs font-semibold text-[#6B7280]">
                      <span className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-gray-400"></span>Transport Cost</span>
                      <span className="font-bold text-[#111827]">+₹120</span>
                    </li>
                    <li className="flex justify-between items-center text-xs font-semibold text-[#6B7280]">
                      <span className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-gray-400"></span>Storage Cost</span>
                      <span className="font-bold text-[#111827]">+₹80</span>
                    </li>
                    <li className="flex justify-between items-center text-xs font-semibold text-[#6B7280]">
                      <span className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-gray-400"></span>Handling Cost</span>
                      <span className="font-bold text-[#111827]">+₹140</span>
                    </li>
                    <li className="flex justify-between items-center text-xs font-semibold text-[#6B7280]">
                      <span className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-gray-400"></span>Market Charges & Taxes</span>
                      <span className="font-bold text-[#111827]">+₹60</span>
                    </li>
                    <li className="flex justify-between items-center text-xs font-semibold text-[#6B7280]">
                      <span className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-gray-400"></span>Estimated Margin</span>
                      <span className="font-bold text-[#111827]">+₹350</span>
                    </li>
                  </ul>
                </div>
                
                <div className="mt-6 pt-3 border-t-2 border-gray-100 flex justify-between items-center">
                  <span className="text-sm font-bold text-[#111827]">Total Increase</span>
                  <span className="text-lg font-extrabold text-[#10B981]">+₹650</span>
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
                  { title: 'Farmer', imgUrl: '/images/journey/farmer.jpg', data: [['Location', 'Chandauli, UP'], ['Quantity', '100 Quintal'], ['Price Received', '₹2,350 /q'], ['Date', '24 Aug 2026']] },
                  { title: 'Mandi', imgUrl: '/images/journey/mandi.jpg', data: [['Market', 'Chakia Mandi'], ['Quantity', '1,240 Quintal'], ['Modal Price', '₹2,400 /q'], ['Date', '24 Aug 2026']] },
                  { title: 'Wholesaler', imgUrl: '/images/journey/wholesaler.jpg', data: [['Buyer Name', 'Shiv Traders'], ['Quantity', '100 Quintal'], ['Purchase Price', '₹2,550 /q'], ['Date', '25 Aug 2026']] },
                  { title: 'Distributor', imgUrl: '/images/journey/distributor.jpg', data: [['Location', 'Varanasi, UP'], ['Quantity', '98 Quintal'], ['Transport Cost', '₹120 /q'], ['Date', '26 Aug 2026']] },
                  { title: 'Retailer', imgUrl: '/images/journey/retailer.jpg', data: [['Retailer Name', 'Kashi Store'], ['Quantity', '98 Quintal'], ['Retail Price', '₹3,000 /q'], ['Date', '27 Aug 2026']] },
                  { title: 'Consumer', imgUrl: '/images/journey/consumer.jpg', data: [['Estimated Price', '₹3,000 /q'], ['Quantity', '98 Quintal'], ['Date', '27 Aug 2026']] },
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
                    Stage 1 of 6
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">Wholesaler</h2>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                    <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center border border-gray-100">
                      <img src="/images/details/warehouse.jpg" alt="Warehouse" className="w-full h-full object-cover mix-blend-multiply" />
                    </div>
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-800">Wholesaler Name</span>
                      <span className="text-sm font-bold text-gray-900 text-right">Sharma Traders</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                    <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center border border-gray-100">
                      <img src="/images/details/pin.jpg" alt="Location" className="w-full h-full object-cover mix-blend-multiply scale-110" />
                    </div>
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-800">Location</span>
                      <span className="text-sm font-bold text-gray-900 text-right">Varanasi, UP</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                    <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center border border-gray-100">
                      <img src="/images/details/boxes.jpg" alt="Price" className="w-full h-full object-cover mix-blend-multiply scale-125" />
                    </div>
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-800">Wholesale Price (₹/q)</span>
                      <span className="text-sm font-bold text-gray-900 text-right">₹2,550</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                    <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center border border-gray-100">
                      <img src="/images/details/calculator.jpg" alt="Quantity" className="w-full h-full object-cover mix-blend-multiply scale-110" />
                    </div>
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-800">Quantity Purchased</span>
                      <span className="text-sm font-bold text-gray-900 text-right">1,000 Quintal</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                    <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center border border-gray-100">
                      <img src="/images/details/document.jpg" alt="Date" className="w-full h-full object-cover mix-blend-multiply scale-110" />
                    </div>
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-800">Purchase Date</span>
                      <span className="text-sm font-bold text-gray-900 text-right">25 Aug 2026</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                    <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center border border-gray-100">
                      <img src="/images/details/creditcard.jpg" alt="Payment" className="w-full h-full object-cover mix-blend-multiply scale-110" />
                    </div>
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-800">Payment Status</span>
                      <span className="text-xs font-bold text-[#10B981] bg-[#ECFDF5] border border-[#10B981]/30 px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> PAID
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                    <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center border border-gray-100">
                      <img src="/images/details/calendar.jpg" alt="Completion" className="w-full h-full object-cover mix-blend-multiply scale-110" />
                    </div>
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-800">Completion Date</span>
                      <span className="text-sm font-bold text-gray-900 text-right">26 Aug 2026</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                    <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center border border-gray-100">
                       <LinkIcon className="h-4 w-4 text-gray-400 -rotate-45" />
                    </div>
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-800">Wholesale Transaction ID</span>
                      <span className="text-[11px] font-mono font-medium text-gray-600 bg-gray-100 border border-gray-200 px-2 py-1 rounded">WS-2026-08-26-00987</span>
                    </div>
                  </div>
                </div>

                <button className="w-full bg-[#0C3B2E] hover:bg-[#1B4D3E] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition text-sm shadow-md">
                  View Source <ArrowRight className="h-4 w-4 -rotate-45" />
                </button>
              </div>
            </div>
          </div>
        </div>

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
