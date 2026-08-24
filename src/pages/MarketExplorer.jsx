import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
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
  TrendingUp
} from 'lucide-react';

// Recharts Custom Marker
const CustomizedDot = (props) => {
  const { cx, cy } = props;
  return (
    <circle cx={cx} cy={cy} r={5} fill="#fff" stroke="#10B981" strokeWidth={3} />
  );
};

const CustomizedLabel = (props) => {
  const { x, y, value } = props;
  return (
    <text x={x} y={y - 15} fill="#111827" fontSize={12} fontWeight="bold" textAnchor="middle">
      {`₹${value.toLocaleString('en-IN')}`}
    </text>
  );
};

export default function MarketExplorer() {
  const priceData = [
    { name: 'Farmer', price: 2350, increase: null },
    { name: 'Mandi', price: 2400, increase: 50 },
    { name: 'Wholesaler', price: 2550, increase: 150 },
    { name: 'Distributor', price: 2750, increase: 200 },
    { name: 'Retailer', price: 3000, increase: 250 },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans pb-12 pt-20 text-[#111827]">
      
      {/* Top Header Background Wrapper */}
      <div className="absolute top-16 inset-x-0 h-[280px] bg-gradient-to-r from-[#FDFCF8] via-[#F6F4ED] to-[#FDFCF8] border-b border-[#E5E7EB] z-0" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")' }}></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Brick 2 & 3: Header and Top Metrics */}
        <div className="flex flex-col lg:flex-row justify-between gap-6 mb-6">
          
          {/* Left: Title & Filters */}
          <div className="flex-1">
            <div className="mb-4">
              <h1 className="text-3xl font-bold flex items-center gap-2 text-[#111827]">
                <Leaf className="text-[#10B981]" fill="#10B981" />
                Crop Journey
              </h1>
              <p className="text-sm font-medium text-[#6B7280] mt-1">
                Track your crop from farm to consumer — every step, every price
              </p>
            </div>

            {/* Filter Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* State */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
                  <div className="relative">
                    <select className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981]">
                      <option>Uttar Pradesh</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                {/* District */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">District</label>
                  <div className="relative">
                    <select className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981]">
                      <option>Chandauli</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                {/* Block */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Block / Tehsil (Optional)</label>
                  <div className="relative">
                    <select className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981]">
                      <option>Chakia</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                {/* Market */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Market / Mandi (Optional)</label>
                  <div className="relative">
                    <select className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981]">
                      <option>Chakia Mandi</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                {/* Crop */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Crop / Commodity</label>
                  <div className="relative">
                    <select className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981]">
                      <option>Wheat</option>
                    </select>
                    <X className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Breadcrumb */}
            <div className="mt-3 text-xs font-medium text-[#6B7280] flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-amber-500" />
              Showing data for: <span className="font-semibold text-gray-800">Uttar Pradesh {'>'} Chandauli {'>'} Chakia {'>'} Chakia Mandi {'>'} Wheat</span>
            </div>
          </div>

          {/* Right: Metrics */}
          <div className="flex gap-4 shrink-0">
            {/* Transparency Score */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 w-[200px] flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2 text-[#111827] font-semibold text-sm">
                <Shield className="h-5 w-5 text-gray-700" />
                Transparency Score
              </div>
              <div className="text-4xl font-bold text-[#10B981] mt-1 flex items-baseline gap-1">
                92<span className="text-xl text-gray-400 font-medium">/100</span>
              </div>
              <div className="text-xs font-semibold text-[#10B981] mt-1">Highly Transparent</div>
            </div>

            {/* Verification Checklist & Last Updated */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 w-[280px] flex flex-col justify-between">
              <div className="grid grid-cols-1 gap-1.5 text-[11px] font-medium text-gray-600">
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-[#10B981]"/> Government Data</span> <span className="text-gray-400">Verified</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-[#10B981]"/> Buyer Verified</span> <span className="text-gray-400">Yes</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-[#10B981]"/> Digital Records</span> <span className="text-gray-400">Yes</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-[#10B981]"/> Secure Records</span> <span className="text-gray-400">Yes</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-[#10B981]"/> Location Tracking</span> <span className="text-gray-400">Yes</span></div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-start justify-between">
                <div>
                  <div className="text-[10px] text-gray-500 font-semibold mb-0.5 uppercase tracking-wider flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-300"></span> Last Updated
                  </div>
                  <div className="text-xs font-bold text-gray-800">24 Aug 2026, 11:30 AM</div>
                </div>
                <div className="text-right">
                   <div className="text-[10px] text-gray-500 font-semibold mb-1 uppercase tracking-wider">Data Source</div>
                   <div className="flex gap-1">
                     <div className="bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-100">data.gov.in</div>
                     <div className="bg-[#10B981] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">e-NAM</div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Brick 4: Progress Stepper */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 overflow-x-auto">
          <div className="flex items-center min-w-max">
            {[
              { num: 1, name: 'Farmer', loc: 'Chandauli, UP', status: 'Completed', active: false, avatar: '👨‍🌾' },
              { num: 2, name: 'Mandi', loc: 'Chakia Mandi', status: 'Completed', active: false, avatar: '🏛️' },
              { num: 3, name: 'Wholesaler', loc: 'Varanasi, UP', status: 'Completed', active: false, avatar: '🏪' },
              { num: 4, name: 'Distributor', loc: 'Varanasi, UP', status: 'Completed', active: false, avatar: '🚚' },
              { num: 5, name: 'Retailer', loc: 'Varanasi, UP', status: 'Completed', active: false, avatar: '🏬' },
              { num: 6, name: 'Consumer', loc: 'End Customer', status: 'Current Stage', active: true, avatar: '👨‍👩‍👧‍👦' },
            ].map((step, idx) => (
              <React.Fragment key={step.name}>
                <div className={`relative px-4 py-2 w-48 rounded-lg flex flex-col items-center text-center ${step.active ? 'border-2 border-[#10B981] bg-[#ECFDF5]/50' : 'border border-transparent'}`}>
                  <div className={`absolute top-2 left-2 text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center ${step.active ? 'bg-[#10B981] text-white' : 'bg-[#ECFDF5] text-[#10B981]'}`}>{step.num}</div>
                  <div className="text-3xl mb-1 mt-1">{step.avatar}</div>
                  <div className="font-bold text-sm text-[#111827]">{step.name}</div>
                  <div className="text-xs text-gray-500 font-medium">{step.loc}</div>
                  {step.active ? (
                    <div className="mt-2 text-[10px] font-bold text-white bg-[#10B981] px-2 py-0.5 rounded-full">Current Stage</div>
                  ) : (
                    <div className="mt-2 text-[10px] font-bold text-[#10B981] flex items-center justify-center gap-1"><CheckCircle2 className="h-3 w-3" /> Completed</div>
                  )}
                </div>
                {idx < 5 && <ArrowRight className="h-5 w-5 text-gray-300 mx-2 shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          
          {/* Bricks 5: Left Content - Chart & Why Price Changed */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            
            <div className="flex flex-col md:flex-row gap-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              
              {/* Price Chart */}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-[#111827]">Price Journey <span className="text-sm font-medium text-gray-500 font-normal">(₹ per Quintal)</span></h3>
                  <div className="relative">
                    <select className="appearance-none rounded-lg border border-gray-300 bg-white py-1.5 pl-3 pr-8 text-xs font-semibold text-gray-700 focus:outline-none">
                      <option>Price per Quintal</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-2 h-4 w-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>
                
                <div className="h-64 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 600 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 500 }} domain={[1800, 3400]} ticks={[1800, 2200, 2600, 3000, 3400]} tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ stroke: '#E5E7EB', strokeWidth: 2, strokeDasharray: '3 3' }} />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#10B981" 
                        strokeWidth={3} 
                        dot={<CustomizedDot />} 
                        label={<CustomizedLabel />}
                        activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  
                  {/* Plus Labels */}
                  <div className="absolute left-[30%] top-[70%] text-xs font-bold text-[#10B981]">+₹50</div>
                  <div className="absolute left-[48%] top-[60%] text-xs font-bold text-[#10B981]">+₹150</div>
                  <div className="absolute left-[68%] top-[50%] text-xs font-bold text-[#10B981]">+₹200</div>
                  <div className="absolute left-[88%] top-[40%] text-xs font-bold text-[#10B981]">+₹250</div>
                </div>
              </div>

              {/* Why Price Changed? */}
              <div className="w-full md:w-64 flex flex-col justify-between pt-1 md:pt-0">
                <div>
                  <h3 className="text-lg font-bold text-[#111827] mb-6">Why Price Changed?</h3>
                  <ul className="space-y-4">
                    <li className="flex justify-between items-center text-sm font-medium text-[#4B5563]">
                      <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>Transport Cost</span>
                      <span className="font-bold text-[#111827]">+₹120</span>
                    </li>
                    <li className="flex justify-between items-center text-sm font-medium text-[#4B5563]">
                      <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>Storage Cost</span>
                      <span className="font-bold text-[#111827]">+₹80</span>
                    </li>
                    <li className="flex justify-between items-center text-sm font-medium text-[#4B5563]">
                      <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>Handling Cost</span>
                      <span className="font-bold text-[#111827]">+₹140</span>
                    </li>
                    <li className="flex justify-between items-center text-sm font-medium text-[#4B5563]">
                      <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>Market Charges & Taxes</span>
                      <span className="font-bold text-[#111827]">+₹60</span>
                    </li>
                    <li className="flex justify-between items-center text-sm font-medium text-[#4B5563]">
                      <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-gray-400"></span>Estimated Margin</span>
                      <span className="font-bold text-[#111827]">+₹350</span>
                    </li>
                  </ul>
                </div>
                
                <div className="mt-6 pt-4 border-t-2 border-gray-100 flex justify-between items-center">
                  <span className="font-bold text-[#10B981]">Total Increase</span>
                  <span className="text-lg font-bold text-[#10B981]">+₹650</span>
                </div>
              </div>

            </div>

            {/* Brick 7: Detailed Information Grid */}
            <div className="bg-[#F9FAFB]">
              <h3 className="text-lg font-bold text-[#111827] mb-4">Journey Flow — Detailed Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { title: 'Farmer', icon: '👨‍🌾', color: 'text-amber-500', data: [['Location', 'Chandauli, UP'], ['Quantity', '100 Quintal'], ['Price Received', '₹2,350 /q'], ['Date', '24 Aug 2026']] },
                  { title: 'Mandi', icon: '🏛️', color: 'text-amber-500', data: [['Market', 'Chakia Mandi'], ['Quantity', '1,240 Quintal'], ['Modal Price', '₹2,400 /q'], ['Date', '24 Aug 2026']] },
                  { title: 'Wholesaler', icon: '🏪', color: 'text-blue-500', data: [['Buyer Name', 'Shiv Traders'], ['Quantity', '100 Quintal'], ['Purchase Price', '₹2,550 /q'], ['Date', '25 Aug 2026']] },
                  { title: 'Distributor', icon: '🚚', color: 'text-emerald-600', data: [['Location', 'Varanasi, UP'], ['Quantity', '98 Quintal'], ['Transport Cost', '₹120 /q'], ['Date', '26 Aug 2026']] },
                  { title: 'Retailer', icon: '🏬', color: 'text-red-500', data: [['Retailer Name', 'Kashi Store'], ['Quantity', '98 Quintal'], ['Retail Price', '₹3,000 /q'], ['Date', '27 Aug 2026']] },
                  { title: 'Consumer', icon: '👨‍👩‍👧‍👦', color: 'text-blue-600', data: [['Estimated Price', '₹3,000 /q'], ['Quantity', '98 Quintal'], ['Date', '27 Aug 2026\n(Estimated)']] },
                ].map((item, idx) => (
                  <div key={item.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col justify-between relative group hover:border-[#10B981]/30 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg">{item.icon}</span>
                        <h4 className={`font-bold text-sm ${item.color}`}>{item.title}</h4>
                      </div>
                      <div className="space-y-3">
                        {item.data.map(([label, val]) => (
                          <div key={label} className="grid grid-cols-2 gap-1 text-[11px]">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-semibold text-gray-800 text-right break-words whitespace-pre-line">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button className="mt-5 w-full text-[11px] font-bold text-gray-600 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 transition">View Details ∨</button>
                    {idx < 5 && <ArrowRight className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 z-10 bg-[#F9FAFB]" />}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Bricks 6: Right Content - Stage Details & Report */}
          <div className="flex flex-col gap-6">
            
            {/* Stage Details Panel */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                 <h3 className="font-bold text-gray-800">Stage Details</h3>
                 <X className="h-4 w-4 text-gray-400 cursor-pointer" />
              </div>
              <div className="p-5">
                <div className="inline-flex items-center gap-1 bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/20 px-2 py-0.5 rounded-full text-[10px] font-bold mb-3">
                  <CheckCircle2 className="h-3 w-3" /> Stage 2 of 6
                </div>
                <h4 className="text-xl font-bold text-[#111827] mb-5">Mandi</h4>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <span className="text-gray-400">🏛️</span>
                    <div className="flex-1 border-b border-gray-100 pb-2 flex justify-between items-start">
                      <span className="text-[11px] text-gray-500 mt-0.5">Market Name</span>
                      <span className="text-sm font-semibold text-gray-800 text-right">Chakia Mandi</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="flex-1 border-b border-gray-100 pb-2 flex justify-between items-start">
                      <span className="text-[11px] text-gray-500 mt-0.5">Location</span>
                      <span className="text-sm font-semibold text-gray-800 text-right">Chakia, Chandauli, UP</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-gray-400 mt-0.5">📦</span>
                    <div className="flex-1 border-b border-gray-100 pb-2 flex justify-between items-start">
                      <span className="text-[11px] text-gray-500 mt-0.5">Arrival Quantity</span>
                      <span className="text-sm font-semibold text-gray-800 text-right">1,240 Quintal</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="flex-1 border-b border-gray-100 pb-2 flex justify-between items-start">
                      <span className="text-[11px] text-gray-500 mt-0.5">Modal Price (₹/q)</span>
                      <span className="text-sm font-semibold text-gray-800 text-right">₹2,400</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-4 w-4 text-gray-400 mt-0.5 rotate-180" />
                    <div className="flex-1 border-b border-gray-100 pb-2 flex justify-between items-start">
                      <span className="text-[11px] text-gray-500 mt-0.5">Min Price (₹/q)</span>
                      <span className="text-sm font-semibold text-gray-800 text-right">₹2,250</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="flex-1 border-b border-gray-100 pb-2 flex justify-between items-start">
                      <span className="text-[11px] text-gray-500 mt-0.5">Max Price (₹/q)</span>
                      <span className="text-sm font-semibold text-gray-800 text-right">₹2,550</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-gray-400 mt-0.5">📅</span>
                    <div className="flex-1 border-b border-gray-100 pb-2 flex justify-between items-start">
                      <span className="text-[11px] text-gray-500 mt-0.5">Date</span>
                      <span className="text-sm font-semibold text-gray-800 text-right">24 Aug 2026</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-gray-400 mt-0.5">🌐</span>
                    <div className="flex-1 border-b border-gray-100 pb-2 flex justify-between items-start">
                      <span className="text-[11px] text-gray-500 mt-0.5">Source</span>
                      <div className="text-right">
                        <span className="text-[11px] font-semibold text-gray-800 block">data.gov.in (AGMARKNET)</span>
                        <span className="text-[9px] text-[#10B981] font-bold inline-flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> Verified</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-gray-400 mt-0.5">🔗</span>
                    <div className="flex-1 flex justify-between items-start">
                      <span className="text-[11px] text-gray-500 mt-0.5">Transaction ID</span>
                      <span className="text-[11px] font-mono font-semibold text-gray-800 text-right bg-gray-50 px-1 py-0.5 rounded">MANDI-2026-08-24-00123</span>
                    </div>
                  </div>
                </div>

                <button className="w-full bg-[#1B4D3E] hover:bg-[#0C3B2E] text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition text-sm shadow-sm">
                  View Source <ArrowRight className="h-4 w-4 -rotate-45" />
                </button>
              </div>
            </div>

            {/* Report a Discrepancy */}
            <div className="bg-[#FEF2F2] rounded-xl shadow-sm border border-red-100 p-5">
              <h3 className="font-bold text-[#DC2626] mb-4 flex items-center gap-2">
                <span className="border border-red-200 rounded text-[10px] px-1 font-mono">⚠️</span> Report a Discrepancy
              </h3>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {['Price Different', 'Quantity Different', 'Weighing Problem', 'Unauthorized Deduction', 'Transaction Missing', 'Other Issue'].map(tag => (
                  <button key={tag} className="bg-white border border-red-100 text-gray-600 hover:border-red-300 hover:text-red-700 hover:bg-red-50 text-[11px] font-semibold py-1.5 px-3 rounded-full transition-colors">
                    {tag}
                  </button>
                ))}
              </div>

              <button className="w-full bg-[#DC2626] hover:bg-red-700 text-white font-bold py-2.5 rounded-lg transition text-sm shadow-sm">
                Report Now
              </button>
            </div>
            
          </div>
        </div>

        {/* Footer Alert */}
        <div className="bg-[#ECFDF5] border border-[#10B981]/20 rounded-xl p-4 flex items-center gap-3 mt-8">
          <div className="bg-white rounded-full p-1.5 shrink-0 shadow-sm border border-[#10B981]/10">
            <Lock className="h-4 w-4 text-[#10B981]" />
          </div>
          <p className="text-xs font-semibold text-[#064E3B]">
            Government data verifies market-level information; downstream transaction details are shown only when recorded/verified through SAATHI.
          </p>
        </div>

      </div>
    </div>
  );
}
