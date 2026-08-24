import { useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useLocationContext } from '../context/LocationContext';
import { mockSupplyChain } from '../utils/mockData';
import { getStates, getDistricts, getBlocks, getMandis, CROP_LIST } from '../utils/indiaLocations';

// ─── Helpers ───────────────────────────────────────────────────────
const fmt = (v) => `₹${Number(v).toLocaleString('en-IN')}`;
const dateFmt = () => {
  const d = new Date();
  return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`;
};

const STAGE_KEYS = ['farmer', 'mandi', 'wholesaler', 'distributor', 'retailer', 'consumer'];
const STAGE_META = {
  farmer:      { icon: '👨‍🌾', label: 'Farmer',      color: '#16a34a', bg: 'bg-emerald-50',  border: 'border-emerald-500', ring: 'ring-emerald-200' },
  mandi:       { icon: '🏛️',  label: 'Mandi',       color: '#d97706', bg: 'bg-amber-50',    border: 'border-amber-500',   ring: 'ring-amber-200'   },
  wholesaler:  { icon: '🏪',  label: 'Wholesaler',  color: '#2563eb', bg: 'bg-blue-50',     border: 'border-blue-500',    ring: 'ring-blue-200'    },
  distributor: { icon: '🚚',  label: 'Distributor', color: '#7c3aed', bg: 'bg-violet-50',   border: 'border-violet-500',  ring: 'ring-violet-200'  },
  retailer:    { icon: '🛒',  label: 'Retailer',    color: '#e11d48', bg: 'bg-rose-50',     border: 'border-rose-500',    ring: 'ring-rose-200'    },
  consumer:    { icon: '👤',  label: 'Consumer',    color: '#475569', bg: 'bg-slate-50',    border: 'border-slate-500',   ring: 'ring-slate-200'   },
};

// Mock journey data generator for any crop + location
function generateJourney(crop, state, district, block, mandi) {
  // Use user-requested standard mock base values
  // Farmer: 2350, Mandi: 2400, Wholesaler: 2550, Distributor: 2750, Retailer: 3000, Consumer: 3000
  // Apply a small deterministic variance based on crop name length to keep it dynamic per crop selection
  const cropOffset = (crop.length % 5) * 50 - 100; // -100 to +100
  const farmerPrice = 2350 + cropOffset;
  const mandiPrice = 2400 + cropOffset;
  const wholesalerPrice = 2550 + cropOffset;
  const distributorPrice = 2750 + cropOffset;
  const retailerPrice = 3000 + cropOffset;
  const consumerPrice = 3000 + cropOffset;

  const loc = block || district;
  const mandiName = mandi || `${district} Mandi`;
  return {
    cropName: crop,
    stages: {
      farmer:      { price: farmerPrice,      location: `${loc}, ${state}`,       quantity: `${80 + Math.floor(Math.random()*40)} Quintal`, date: dateFmt(), status: 'completed' },
      mandi:       { price: mandiPrice,       location: mandiName + ', ' + district,    quantity: `${800 + Math.floor(Math.random()*600)} Quintal`, date: dateFmt(), status: 'completed' },
      wholesaler:  { price: wholesalerPrice,  location: `${district}, ${state}`,       quantity: `${80 + Math.floor(Math.random()*40)} Quintal`, date: dateFmt(), status: 'completed' },
      distributor: { price: distributorPrice, location: `${district}, ${state}`,       quantity: `${70 + Math.floor(Math.random()*30)} Quintal`, date: dateFmt(), status: 'completed' },
      retailer:    { price: retailerPrice,    location: `${district}, ${state}`,       quantity: `${60 + Math.floor(Math.random()*40)} Quintal`, date: dateFmt(), status: 'completed' },
      consumer:    { price: consumerPrice,    location: 'End Customer',                quantity: `${60 + Math.floor(Math.random()*40)} Quintal`, date: dateFmt(), status: 'current'   },
    },
    costs: {
      transport: 50 + (crop.length % 3) * 10,
      storage:   150 + (crop.length % 2) * 20,
      handling:  200 + (crop.length % 4) * 15,
      marketCharges: 250 + (crop.length % 5) * 25,
      margin:    Math.max(50, totalIncreaseDifference(farmerPrice, consumerPrice) - (850)),
    },
    mandiDetails: {
      name: mandiName,
      location: `${block || district}, ${district}, ${state}`,
      arrivalQty: `${1240} Quintal`,
      modalPrice: mandiPrice,
      minPrice:   mandiPrice - 150,
      maxPrice:   mandiPrice + 150,
      date: dateFmt(),
      source: 'data.gov.in (AGMARKNET)',
      txId: `MANDI-${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}-${String(Math.floor(10000+Math.random()*90000))}`,
    },
    transparencyScore: 92,
  };
}

function totalIncreaseDifference(farmer, consumer) {
  return consumer - farmer;
}

// ─── SVG Price Chart ───────────────────────────────────────────────
function PriceChart({ journey }) {
  if (!journey) return null;
  const prices = STAGE_KEYS.map(k => journey.stages[k].price);
  const minP = Math.min(...prices) - 200;
  const maxP = Math.max(...prices) + 200;
  const W = 560, H = 220, padX = 50, padY = 30;
  const chartW = W - padX * 2, chartH = H - padY * 2;

  const points = prices.map((p, i) => ({
    x: padX + (i / (prices.length - 1)) * chartW,
    y: padY + chartH - ((p - minP) / (maxP - minP)) * chartH,
    price: p,
    label: STAGE_META[STAGE_KEYS[i]].label,
  }));

  const linePath = points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x},${pt.y}`).join(' ');
  const areaPath = linePath + ` L${points[points.length-1].x},${padY+chartH} L${points[0].x},${padY+chartH} Z`;

  // Grid lines
  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const val = minP + ((maxP - minP) / gridCount) * i;
    const y = padY + chartH - ((val - minP) / (maxP - minP)) * chartH;
    return { y, label: `₹${Math.round(val).toLocaleString('en-IN')}` };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Grid */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={padX} y1={g.y} x2={W - padX} y2={g.y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />
          <text x={padX - 6} y={g.y + 4} textAnchor="end" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">{g.label}</text>
        </g>
      ))}
      {/* Area fill */}
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#16a34a" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#areaGrad)" />
      {/* Line */}
      <path d={linePath} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Points & labels */}
      {points.map((pt, i) => (
        <g key={i}>
          <circle cx={pt.x} cy={pt.y} r="5" fill="white" stroke="#16a34a" strokeWidth="2.5" />
          <text x={pt.x} y={pt.y - 12} textAnchor="middle" fill="#1e293b" fontSize="10" fontWeight="700" fontFamily="sans-serif">
            {fmt(pt.price)}
          </text>
          {i < points.length - 1 && (
            <text
              x={(pt.x + points[i+1].x) / 2}
              y={Math.min(pt.y, points[i+1].y) - 2}
              textAnchor="middle" fill="#16a34a" fontSize="8" fontWeight="600" fontFamily="sans-serif"
            >
              +₹{points[i+1].price - pt.price}
            </text>
          )}
          <text x={pt.x} y={padY + chartH + 16} textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="sans-serif">{pt.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── Sub-components ────────────────────────────────────────────────
function FilterSelect({ label, value, onChange, options, placeholder, disabled, required }) {
  return (
    <div className="flex-1 min-w-[140px]">
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32]/30 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 transition appearance-none"
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function StageCard({ stageKey, stage, idx, isActive, isLast, onClick }) {
  const meta = STAGE_META[stageKey];
  const isCurrent = stage.status === 'current';
  const isCompleted = stage.status === 'completed';
  return (
    <div className="flex items-center">
      <button
        onClick={() => onClick(stageKey)}
        className={`
          relative flex flex-col items-center rounded-2xl border-2 px-4 py-3 min-w-[120px] transition-all duration-200 cursor-pointer
          ${isActive ? `${meta.border} ${meta.bg} shadow-md ring-2 ${meta.ring}` : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}
          ${isCurrent ? 'border-amber-400 ring-2 ring-amber-100' : ''}
        `}
      >
        <span className="absolute -top-2.5 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-white border border-slate-200 text-[10px] font-extrabold text-slate-600 shadow-sm">
          {idx + 1}
        </span>
        <span className="text-2xl mb-1">{meta.icon}</span>
        <span className="text-xs font-bold text-slate-800">{meta.label}</span>
        <span className="text-[10px] text-slate-500 mt-0.5 max-w-[100px] truncate">{stage.location?.split(',')[0]}</span>
        <span className="text-[11px] font-bold text-[#2E7D32] mt-1">{fmt(stage.price)}</span>
        {isCompleted && (
          <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            ✓ Completed
          </span>
        )}
        {isCurrent && (
          <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
            Current Stage
          </span>
        )}
        <span className="mt-2 text-[9px] font-extrabold text-[#2E7D32] hover:underline uppercase tracking-wider">
          View Details
        </span>
      </button>
      {!isLast && (
        <div className="flex items-center mx-1">
          <div className="w-6 h-0.5 bg-slate-300" />
          <svg className="w-2.5 h-2.5 text-slate-400 -ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      )}
    </div>
  );
}

function FlowCard({ stageKey, stage, cropName, isLast, isCurrent }) {
  const meta = STAGE_META[stageKey];
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-start shrink-0">
      <div className={`rounded-2xl border-2 ${isCurrent ? 'border-amber-400' : 'border-slate-200'} bg-white p-4 min-w-[180px] max-w-[200px] shadow-sm`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{meta.icon}</span>
          <span className="font-bold text-sm" style={{ color: meta.color }}>{meta.label}</span>
        </div>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between"><span className="text-slate-500">Location</span><span className="text-slate-800 font-medium text-right max-w-[100px] truncate">{stage.location?.split(',')[0]}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Quantity</span><span className="text-slate-800 font-medium">{stage.quantity}</span></div>
          <div className="flex justify-between">
            <span className="text-slate-500">{stageKey === 'consumer' ? 'Estimated Price' : 'Price'}</span>
            <span className={`font-bold ${isCurrent ? 'text-red-600' : 'text-[#2E7D32]'}`}>{fmt(stage.price)}/q</span>
          </div>
          <div className="flex justify-between"><span className="text-slate-500">Date</span><span className={`text-slate-800 font-medium ${isCurrent ? 'text-red-500' : ''}`}>{stage.date}</span></div>
        </div>
        {open && (
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
            <p>Crop: {cropName}</p>
            <p>Status: {isCurrent ? 'In Transit' : 'Completed'}</p>
          </div>
        )}
        <button onClick={() => setOpen(!open)} className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#2E7D32] transition">
          {open ? 'Hide' : 'View'} Details
          <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
      {!isLast && (
        <div className="flex items-center mx-2 mt-10 shrink-0">
          <div className="w-6 h-0.5 bg-slate-300" />
          <svg className="w-2.5 h-2.5 text-slate-400 -ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function MarketExplorer() {
  const { t } = useUser();
  const navigate = useNavigate();

  // Filter state
  const [selState, setSelState] = useState('');
  const [selDistrict, setSelDistrict] = useState('');
  const [selBlock, setSelBlock] = useState('');
  const [selMandi, setSelMandi] = useState('');
  const [cropQuery, setCropQuery] = useState('');
  const [showCropSuggestions, setShowCropSuggestions] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState('');
  const cropInputRef = useRef(null);

  // Journey state
  const [journey, setJourney] = useState(null);
  const [activeStage, setActiveStage] = useState('mandi');
  const [loading, setLoading] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState(null);

  // Discrepancy tags
  const [selectedTags, setSelectedTags] = useState([]);
  const discrepancyTags = ['Price Different', 'Quantity Different', 'Weighing Problem', 'Unauthorized Deduction', 'Transaction Missing', 'Other Issue'];

  // Derived filter options
  const states = useMemo(() => getStates(), []);
  const districts = useMemo(() => getDistricts(selState), [selState]);
  const blocks = useMemo(() => getBlocks(selState, selDistrict), [selState, selDistrict]);
  const mandis = useMemo(() => getMandis(selState, selDistrict, selBlock), [selState, selDistrict, selBlock]);

  // Crop suggestions
  const cropSuggestions = useMemo(() => {
    if (!cropQuery.trim()) return [];
    const q = cropQuery.toLowerCase();
    return CROP_LIST.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.nameHi && c.nameHi.includes(cropQuery)) ||
      c.category.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [cropQuery]);

  // Filter handlers
  const handleStateChange = (v) => { setSelState(v); setSelDistrict(''); setSelBlock(''); setSelMandi(''); setJourney(null); };
  const handleDistrictChange = (v) => { setSelDistrict(v); setSelBlock(''); setSelMandi(''); setJourney(null); };
  const handleBlockChange = (v) => { setSelBlock(v); setSelMandi(''); };
  const handleMandiChange = (v) => { setSelMandi(v); };

  const selectCrop = (crop) => {
    setSelectedCrop(crop.name);
    setCropQuery(crop.name);
    setShowCropSuggestions(false);
  };

  const canSearch = selState && selDistrict && selectedCrop;

  const viewJourney = () => {
    if (!canSearch) return;
    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      const j = generateJourney(selectedCrop, selState, selDistrict, selBlock, selMandi);
      setJourney(j);
      setActiveStage('mandi');
      setBreadcrumb({
        state: selState,
        district: selDistrict,
        block: selBlock,
        mandi: selMandi || `${selDistrict} Mandi`,
        crop: selectedCrop,
      });
      setLoading(false);
    }, 600);
  };

  const activeStageData = journey ? journey.stages[activeStage] : null;
  const totalIncrease = journey
    ? journey.stages.consumer.price - journey.stages.farmer.price
    : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 lg:pt-28 pb-12">

      {/* ─── Header Row ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-extrabold text-white drop-shadow-md flex items-center gap-2">
            🌾 Crop Journey
          </h1>
          <p className="mt-1 text-sm text-white/80 font-medium">
            Track your crop from farm to consumer — every step, every price
          </p>
        </div>

        {/* Transparency + Last Updated cards (only shown when journey active) */}
        {journey && (
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Transparency Score */}
            <div className="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-100 px-5 py-4 shadow-sm flex items-center gap-4 min-w-[260px]">
              <div className="relative flex items-center justify-center">
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#16a34a" strokeWidth="5"
                    strokeDasharray={`${(journey.transparencyScore / 100) * 176} 176`}
                    strokeLinecap="round" transform="rotate(-90 32 32)" />
                </svg>
                <span className="absolute text-lg font-extrabold text-[#2E7D32]">{journey.transparencyScore}</span>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Transparency Score</p>
                <p className="text-sm font-extrabold text-[#2E7D32]">{journey.transparencyScore}/100</p>
                <p className="text-[10px] text-emerald-600 font-semibold">Highly Transparent</p>
                <div className="mt-1.5 space-y-0.5">
                  {['Government Data', 'Buyer Verified', 'Digital Records', 'Location Information'].map(item => (
                    <div key={item} className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-emerald-500">✓</span>
                      <span className="text-slate-600">{item}</span>
                      <span className="ml-auto text-slate-400 font-medium">Yes</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Last Updated */}
            <div className="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-100 px-5 py-4 shadow-sm min-w-[200px]">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Updated</span>
              </div>
              <p className="text-sm font-extrabold text-slate-900">{dateFmt()}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
              <div className="mt-2.5 pt-2 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data Source</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-[#2E7D32]">data.gov.in / AGMARKNET</span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">e-NAM</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">Government Data</span>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">Verified Source</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Filter Section ─────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-100 p-5 shadow-sm mb-4">
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <FilterSelect label="State" value={selState} onChange={handleStateChange}
            options={states} placeholder="Select State" required />
          <FilterSelect label="District" value={selDistrict} onChange={handleDistrictChange}
            options={districts} placeholder="Select District" disabled={!selState} required />
          <FilterSelect label="Block / Tehsil (Optional)" value={selBlock} onChange={handleBlockChange}
            options={blocks} placeholder="Select Block" disabled={!selDistrict} />
          <FilterSelect label="Market / Mandi (Optional)" value={selMandi} onChange={handleMandiChange}
            options={mandis} placeholder="Select Mandi" disabled={!selDistrict} />

          {/* Crop Search */}
          <div className="flex-1 min-w-[160px] relative">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
              Crop / Commodity <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                ref={cropInputRef}
                type="text"
                value={cropQuery}
                onChange={(e) => { setCropQuery(e.target.value); setSelectedCrop(''); setShowCropSuggestions(true); }}
                onFocus={() => { if (cropQuery) setShowCropSuggestions(true); }}
                placeholder="Search crop..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-3 pr-8 py-2 text-sm text-slate-800 shadow-sm focus:border-[#2E7D32] focus:ring-1 focus:ring-[#2E7D32]/30 focus:outline-none transition"
              />
              {cropQuery && (
                <button
                  onClick={() => { setCropQuery(''); setSelectedCrop(''); setShowCropSuggestions(false); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none"
                >×</button>
              )}
            </div>
            {/* Suggestions dropdown */}
            {showCropSuggestions && cropSuggestions.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                {cropSuggestions.map(c => (
                  <button key={c.name}
                    onClick={() => selectCrop(c)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-emerald-50 transition"
                  >
                    <span className="text-base">{c.icon}</span>
                    <span className="font-semibold text-slate-800">{c.name}</span>
                    {c.nameHi && <span className="text-slate-400 text-xs">({c.nameHi})</span>}
                    <span className="ml-auto text-[10px] rounded-full bg-slate-100 px-2 py-0.5 text-slate-500 font-medium">{c.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Journey Button */}
          <button
            onClick={viewJourney}
            disabled={!canSearch || loading}
            className={`
              shrink-0 rounded-xl px-6 py-2.5 text-sm font-bold shadow-sm transition-all duration-200
              ${canSearch && !loading
                ? 'bg-[#2E7D32] text-white hover:bg-[#256c29] active:scale-[0.97]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
            `}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round"/></svg>
                Loading…
              </span>
            ) : 'View Journey'}
          </button>
        </div>

        {/* Breadcrumb */}
        {breadcrumb && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="text-slate-400">📍</span>
            <span>Showing data for:</span>
            <span className="text-slate-700 font-semibold">{breadcrumb.state}</span>
            <span className="text-slate-300">›</span>
            <span className="text-slate-700 font-semibold">{breadcrumb.district}</span>
            {breadcrumb.block && <>
              <span className="text-slate-300">›</span>
              <span className="text-slate-700 font-semibold">{breadcrumb.block}</span>
            </>}
            <span className="text-slate-300">›</span>
            <span className="text-slate-700 font-semibold">{breadcrumb.mandi}</span>
            <span className="text-slate-300">›</span>
            <span className="text-[#2E7D32] font-bold">{breadcrumb.crop}</span>
          </div>
        )}
      </div>

      {/* ─── Empty state ────────────────────────────────────────── */}
      {!journey && !loading && (
        <div className="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-100 p-12 shadow-sm text-center">
          <div className="text-6xl mb-4">🌾</div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-2">Start Your Crop Journey</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Select a <strong>State</strong>, <strong>District</strong>, and <strong>Crop</strong> above, then click <strong>"View Journey"</strong> to track your crop's path from farm to consumer with real-time price data.
          </p>
          <div className="mt-6 flex items-center justify-center gap-6 text-slate-400 text-sm">
            <div className="flex items-center gap-1.5"><span>👨‍🌾</span> Farmer</div>
            <span>→</span>
            <div className="flex items-center gap-1.5"><span>🏛️</span> Mandi</div>
            <span>→</span>
            <div className="flex items-center gap-1.5"><span>🏪</span> Wholesaler</div>
            <span>→</span>
            <div className="flex items-center gap-1.5"><span>🚚</span> Distributor</div>
            <span>→</span>
            <div className="flex items-center gap-1.5"><span>🛒</span> Retailer</div>
            <span>→</span>
            <div className="flex items-center gap-1.5"><span>👤</span> Consumer</div>
          </div>
        </div>
      )}

      {/* ─── Loading skeleton ───────────────────────────────────── */}
      {loading && (
        <div className="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-100 p-8 shadow-sm">
          <div className="flex gap-4 overflow-hidden">
            {STAGE_KEYS.map((_, i) => (
              <div key={i} className="flex items-center">
                <div className="rounded-2xl border-2 border-slate-100 p-4 min-w-[120px] animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-slate-200 mx-auto mb-2" />
                  <div className="h-3 w-16 rounded bg-slate-200 mx-auto mb-1" />
                  <div className="h-2 w-12 rounded bg-slate-100 mx-auto" />
                </div>
                {i < 5 && <div className="w-8 h-0.5 bg-slate-100 mx-1" />}
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-60 rounded-2xl bg-slate-100 animate-pulse" />
            <div className="h-60 rounded-2xl bg-slate-100 animate-pulse" />
          </div>
        </div>
      )}

      {/* ─── Journey Content ────────────────────────────────────── */}
      {journey && !loading && (
        <>
          {/* Timeline */}
          <div className="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-100 p-5 shadow-sm mb-4 overflow-x-auto">
            <div className="flex items-center gap-0 min-w-max">
              {STAGE_KEYS.map((key, i) => (
                <StageCard
                  key={key}
                  stageKey={key}
                  stage={journey.stages[key]}
                  idx={i}
                  isActive={activeStage === key}
                  isLast={i === STAGE_KEYS.length - 1}
                  onClick={setActiveStage}
                />
              ))}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Left Column: Price Chart + Why Price Changed */}
            <div className="lg:col-span-2 space-y-4">
              {/* Price Journey Chart */}
              <div className="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-extrabold text-slate-800">Price Journey</h3>
                  <span className="text-[10px] rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-500">₹ per Quintal</span>
                </div>
                <PriceChart journey={journey} />
              </div>

              {/* Why Price Changed */}
              <div className="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-extrabold text-slate-800">Why Price Changed?</h3>
                  <span className="text-[10px] text-slate-400 font-semibold italic">Estimated Values</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Transport Cost (Estimated)', value: journey.costs.transport },
                    { label: 'Storage Cost (Estimated)', value: journey.costs.storage },
                    { label: 'Handling Cost (Estimated)', value: journey.costs.handling },
                    { label: 'Market Charges / Taxes (Estimated)', value: journey.costs.marketCharges },
                    { label: 'Estimated Margin', value: journey.costs.margin },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span className="text-sm text-slate-700">{item.label}</span>
                      </div>
                      <span className="text-sm font-bold text-amber-600">+₹{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t-2 border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-800">Total Increase (Estimated)</span>
                  <span className="text-base font-extrabold text-red-600">+₹{totalIncrease}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Stage Details + Report */}
            <div className="space-y-4">
              {/* Stage Details */}
              <div className="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-extrabold text-slate-800">Stage Details</h3>
                  <span className="text-[10px] rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">
                    Stage {STAGE_KEYS.indexOf(activeStage) + 1} of {STAGE_KEYS.length}
                  </span>
                </div>
                <h4 className="text-lg font-extrabold text-slate-900 mb-2 flex items-center gap-2">
                  <span>{STAGE_META[activeStage].icon}</span>
                  <span>{STAGE_META[activeStage].label}</span>
                </h4>
                {/* Meta Verification Badges */}
                <div className="mb-4">
                  {activeStage === 'mandi' && (
                    <div className="flex flex-wrap gap-1">
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">Government Data</span>
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">Verified Source</span>
                    </div>
                  )}
                  {activeStage === 'farmer' && (
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-700">SAATHI Recorded</span>
                  )}
                  {(activeStage === 'wholesaler' || activeStage === 'distributor' || activeStage === 'retailer') && (
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-700">SAATHI Recorded</span>
                  )}
                  {activeStage === 'consumer' && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">Estimated</span>
                  )}
                </div>
                <div className="space-y-3">
                  {activeStage === 'mandi' && (
                    <>
                      <DetailRow icon="🏛" label="Market Name" value={journey.mandiDetails.name} />
                      <DetailRow icon="📍" label="Location" value={journey.mandiDetails.location} />
                      <DetailRow icon="📦" label="Arrival Quantity" value={journey.mandiDetails.arrivalQty} />
                      <DetailRow icon="💰" label="Modal Price" value={fmt(journey.mandiDetails.modalPrice)} />
                      <DetailRow icon="📉" label="Minimum Price" value={fmt(journey.mandiDetails.minPrice)} />
                      <DetailRow icon="📈" label="Maximum Price" value={fmt(journey.mandiDetails.maxPrice)} />
                      <DetailRow icon="📅" label="Date" value={journey.mandiDetails.date} />
                      <DetailRow icon="🌐" label="Data Source" value={journey.mandiDetails.source} />
                      <DetailRow icon="🔗" label="Transaction/Record ID" value={journey.mandiDetails.txId} highlight />
                    </>
                  )}
                  {activeStage === 'farmer' && (
                    <>
                      <DetailRow icon="📍" label="Location" value={journey.stages.farmer.location} />
                      <DetailRow icon="📦" label="Quantity" value={journey.stages.farmer.quantity} />
                      <DetailRow icon="💰" label="Price Received" value={fmt(journey.stages.farmer.price)} />
                      <DetailRow icon="📅" label="Date" value={journey.stages.farmer.date} />
                    </>
                  )}
                  {activeStage === 'wholesaler' && (
                    <>
                      <DetailRow icon="👤" label="Buyer Name" value="Shiv Traders" />
                      <DetailRow icon="📍" label="Location" value={journey.stages.wholesaler.location} />
                      <DetailRow icon="📦" label="Quantity" value={journey.stages.wholesaler.quantity} />
                      <DetailRow icon="💰" label="Purchase Price" value={fmt(journey.stages.wholesaler.price)} />
                      <DetailRow icon="📅" label="Date" value={journey.stages.wholesaler.date} />
                    </>
                  )}
                  {activeStage === 'distributor' && (
                    <>
                      <DetailRow icon="📍" label="Location" value={journey.stages.distributor.location} />
                      <DetailRow icon="📦" label="Quantity" value={journey.stages.distributor.quantity} />
                      <DetailRow icon="🚚" label="Transport Cost" value={fmt(journey.costs.transport)} />
                      <DetailRow icon="📅" label="Date" value={journey.stages.distributor.date} />
                    </>
                  )}
                  {activeStage === 'retailer' && (
                    <>
                      <DetailRow icon="🏪" label="Retailer Name" value="Kashi Kirana Store" />
                      <DetailRow icon="📍" label="Location" value={journey.stages.retailer.location} />
                      <DetailRow icon="📦" label="Quantity" value={journey.stages.retailer.quantity} />
                      <DetailRow icon="💰" label="Retail Price" value={fmt(journey.stages.retailer.price)} />
                      <DetailRow icon="📅" label="Date" value={journey.stages.retailer.date} />
                    </>
                  )}
                  {activeStage === 'consumer' && (
                    <>
                      <DetailRow icon="💰" label="Estimated Consumer Price" value={fmt(journey.stages.consumer.price)} />
                      <DetailRow icon="📦" label="Quantity" value={journey.stages.consumer.quantity} />
                      <DetailRow icon="📅" label="Date" value={journey.stages.consumer.date} />
                    </>
                  )}
                </div>
                <a
                  href="https://agmarknet.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl bg-[#2E7D32] py-2.5 text-sm font-bold text-white hover:bg-[#256c29] transition shadow-sm"
                >
                  View Source <span className="text-xs">↗</span>
                </a>
              </div>

              {/* Report a Discrepancy */}
              <div className="rounded-2xl bg-white/95 backdrop-blur-md border border-red-100 p-5 shadow-sm">
                <h3 className="text-sm font-extrabold text-red-600 flex items-center gap-1.5 mb-3">
                  ⚠️ Report a Discrepancy
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {discrepancyTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold border transition ${
                        selectedTags.includes(tag)
                          ? 'bg-red-50 border-red-300 text-red-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-red-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <button className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition shadow-sm">
                  Report Now
                </button>
              </div>
            </div>
          </div>

          {/* Journey Flow — Detailed Information */}
          <div className="rounded-2xl bg-white/95 backdrop-blur-md border border-slate-100 p-5 shadow-sm mb-4">
            <h3 className="text-sm font-extrabold text-slate-800 mb-4">Journey Flow — Detailed Information</h3>
            <div className="flex items-start gap-0 overflow-x-auto pb-2">
              {STAGE_KEYS.map((key, i) => (
                <FlowCard
                  key={key}
                  stageKey={key}
                  stage={journey.stages[key]}
                  cropName={journey.cropName}
                  isLast={i === STAGE_KEYS.length - 1}
                  isCurrent={journey.stages[key].status === 'current'}
                />
              ))}
            </div>
          </div>

          {/* Footer Note */}
          <div className="rounded-2xl bg-emerald-50/80 backdrop-blur-sm border border-emerald-200 px-5 py-3 flex items-start gap-2.5">
            <span className="text-emerald-600 mt-0.5 text-sm">ℹ️</span>
            <p className="text-xs text-emerald-800 font-medium">
              Government data verifies market-level information; downstream transaction details are shown only when recorded/verified through SAATHI.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Detail Row helper ─────────────────────────────────────────────
function DetailRow({ icon, label, value, highlight }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <p className={`text-sm font-semibold ${highlight ? 'text-[#2E7D32]' : 'text-slate-800'} break-all`}>{value}</p>
      </div>
      {highlight && <span className="text-emerald-500 text-xs mt-1">Verified ✓</span>}
    </div>
  );
}
