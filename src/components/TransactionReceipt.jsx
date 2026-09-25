/**
 * TransactionReceipt.jsx
 *
 * A fully self-contained, print-ready receipt component for Saathi.
 * Renders a premium A4-style receipt card for any completed transaction or deal.
 *
 * Usage:
 *   import TransactionReceipt from '../components/TransactionReceipt';
 *
 *   <TransactionReceipt transaction={txn} onClose={() => setShowReceipt(false)} />
 *
 * Props:
 *   transaction  {Object}   — Transaction / Deal / PurchaseOrder data object
 *   onClose      {Function} — Called when the user clicks the close / done button
 *   printOnMount {Boolean}  — If true, auto-triggers print dialog on mount (default false)
 */

import React, { useEffect, useRef } from 'react';
import {
  CheckCircle,
  Download,
  Printer,
  X,
  Package,
  MapPin,
  Calendar,
  Hash,
  ArrowRight,
  ShieldCheck,
  Wheat,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n) =>
  typeof n === 'number'
    ? n.toLocaleString('en-IN', { minimumFractionDigits: 0 })
    : n ?? '—';

const fmtCurrency = (n) =>
  typeof n === 'number'
    ? `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const STAGE_LABELS = {
  FARMER_TO_BUYER: 'Farmer → Buyer',
  BUYER_TO_WHOLESALER: 'Buyer → Wholesaler',
  WHOLESALER_TO_DISTRIBUTOR: 'Wholesaler → Distributor',
  DISTRIBUTOR_TO_RETAILER: 'Distributor → Retailer',
  RETAILER_TO_CONSUMER: 'Retailer → Consumer',
};

// ─── Badge ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = (status || '').toUpperCase();
  let bg = '#e8f5e9';
  let color = '#2e7d32';
  let label = 'Completed';

  if (['PENDING', 'ESCROW_PENDING'].includes(s)) {
    bg = '#fff8e1'; color = '#e65100'; label = 'Pending';
  } else if (['CANCELLED', 'REJECTED', 'FAILED'].includes(s)) {
    bg = '#ffebee'; color = '#c62828'; label = 'Cancelled';
  } else if (s === 'RECEIPT_SUBMITTED') {
    bg = '#e3f2fd'; color = '#1565c0'; label = 'Receipt Submitted';
  }

  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'4px 14px', borderRadius:'999px', fontSize:'12px', fontWeight:700, letterSpacing:'0.04em', textTransform:'uppercase', background:bg, color }}>
      <CheckCircle size={13} />
      {label}
    </span>
  );
}

// ─── Info Row ────────────────────────────────────────────────────────────────

function Row({ icon: Icon, label, value }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'10px 0', borderBottom:'1px solid #f0f0f0' }}>
      <span style={{ color:'#E51B2A', marginTop:'2px', flexShrink:0 }}><Icon size={15} /></span>
      <span style={{ flex:1, fontSize:'13px', color:'#616161', fontWeight:600 }}>{label}</span>
      <span style={{ fontSize:'13px', fontWeight:700, color:'#212121', textAlign:'right', maxWidth:'55%', wordBreak:'break-word' }}>
        {value}
      </span>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function TransactionReceipt({ transaction = {}, onClose, printOnMount = false }) {
  const receiptRef = useRef(null);
  const txn = transaction;

  // Normalise field names — works for Transaction, Deal & PurchaseOrder models
  const product       = txn.product || txn.crop || 'N/A';
  const variety       = txn.variety || '';
  const quantity      = txn.quantity;
  const unit          = txn.unit || 'quintal';
  const price         = txn.price || txn.agreedPrice;
  const totalAmount   = quantity && price ? quantity * price : null;
  const status        = txn.status || 'COMPLETED';
  const stage         = STAGE_LABELS[txn.stage] || txn.stage || '—';
  const txnId         = txn.transactionId || txn._id || '—';
  const batchId       = txn.batchId || txn.farmerBatchId || '—';
  const utrNumber     = txn.utrNumber;
  const location      = txn.location || '—';
  const txnDate       = txn.transactionDate || txn.completedAt || txn.createdAt;

  const sellerName    = txn.sellerId?.firstName
    ? `${txn.sellerId.firstName} ${txn.sellerId.lastName || ''}`.trim()
    : typeof txn.sellerId === 'string' ? txn.sellerId : '—';

  const buyerName     = txn.buyerId?.firstName
    ? `${txn.buyerId.firstName} ${txn.buyerId.lastName || ''}`.trim()
    : typeof txn.buyerId === 'string' ? txn.buyerId : '—';

  const buyerBusiness = txn.buyerId?.businessName || '';
  const gstNumber     = txn.buyerId?.gstNumber;
  const farmerId      = txn.sellerId?.farmerId;

  const moisturePercent = txn.moisturePercent;
  const aiFindings      = txn.qualitySubmissions?.at(-1)?.aiFindings || null;
  const agentFeeAmount  = txn.agentFeeAmount;
  const agentFeePaid    = txn.agentFeePaid;

  useEffect(() => {
    if (printOnMount) setTimeout(() => window.print(), 400);
  }, [printOnMount]);

  const handlePrint = () => window.print();

  /* ── Button style helpers ───────────────────────────────────────── */
  const btnBase = { display:'flex', alignItems:'center', gap:'7px', padding:'10px 22px', borderRadius:'10px', border:'none', fontWeight:700, fontSize:'13px', cursor:'pointer', fontFamily:'inherit', transition:'background 0.15s' };

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body > *:not(#saathi-receipt-overlay) { display:none !important; }
          #saathi-receipt-overlay { position:static !important; background:transparent !important; }
          #saathi-receipt-card { box-shadow:none !important; border:1px solid #ccc !important; max-width:100% !important; margin:0 !important; }
          .receipt-no-print { display:none !important; }
          @page { size:A4; margin:10mm; }
        }
      `}</style>

      {/* Overlay */}
      <div
        id="saathi-receipt-overlay"
        style={{ position:'fixed', inset:0, background:'rgba(19,35,58,0.72)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', zIndex:9999, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'24px 16px 40px', overflowY:'auto' }}
      >
        {/* Card */}
        <div
          id="saathi-receipt-card"
          ref={receiptRef}
          style={{ width:'100%', maxWidth:'620px', background:'#ffffff', borderRadius:'20px', overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.35)', fontFamily:'Inter,"Noto Sans Devanagari",ui-sans-serif,system-ui,sans-serif', position:'relative' }}
        >
          {/* Close */}
          {onClose && (
            <button className="receipt-no-print" onClick={onClose} aria-label="Close" style={{ position:'absolute', top:'14px', right:'14px', background:'rgba(255,255,255,0.18)', border:'none', borderRadius:'50%', width:'34px', height:'34px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff', zIndex:10 }}>
              <X size={17} />
            </button>
          )}

          {/* ══ HEADER ══════════════════════════════════════════════════════ */}
          <div style={{ background:'linear-gradient(135deg,#13233A 0%,#1e3a5f 100%)', padding:'28px 32px 24px', color:'#fff' }}>
            {/* Brand */}
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'18px' }}>
              <div style={{ width:'38px', height:'38px', background:'#E51B2A', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Wheat size={22} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize:'22px', fontWeight:900, letterSpacing:'-0.5px', lineHeight:1 }}>Saathi</div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)', letterSpacing:'0.08em', textTransform:'uppercase' }}>Agri Supply Chain</div>
              </div>
            </div>

            {/* Title */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'10px' }}>
              <div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.55)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'4px' }}>Transaction Receipt</div>
                <div style={{ fontSize:'24px', fontWeight:800, textTransform:'capitalize', lineHeight:1.1 }}>
                  {product}{variety ? ` · ${variety}` : ''}
                </div>
              </div>
              <StatusBadge status={status} />
            </div>

            <div style={{ marginTop:'18px', borderTop:'1px solid rgba(255,255,255,0.12)' }} />

            {/* Key metrics */}
            <div style={{ display:'flex', gap:'32px', marginTop:'16px', flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Quantity</div>
                <div style={{ fontSize:'20px', fontWeight:800, marginTop:'2px' }}>
                  {fmt(quantity)} <span style={{ fontSize:'13px', fontWeight:500, opacity:0.7 }}>{unit}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Rate / Qtl</div>
                <div style={{ fontSize:'20px', fontWeight:800, marginTop:'2px' }}>{fmtCurrency(price)}</div>
              </div>
              {totalAmount !== null && (
                <div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Total Value</div>
                  <div style={{ fontSize:'20px', fontWeight:800, color:'#ff8a80', marginTop:'2px' }}>{fmtCurrency(totalAmount)}</div>
                </div>
              )}
            </div>
          </div>

          {/* ══ STAGE BAR ═══════════════════════════════════════════════════ */}
          <div style={{ background:'#f8f9fa', padding:'12px 32px', borderBottom:'1px solid #e0e0e0', display:'flex', alignItems:'center', gap:'8px', overflowX:'auto' }}>
            <span style={{ color:'#E51B2A', flexShrink:0 }}><ArrowRight size={14} /></span>
            <span style={{ fontSize:'12px', fontWeight:700, color:'#13233A', whiteSpace:'nowrap', letterSpacing:'0.02em' }}>{stage}</span>
          </div>

          {/* ══ BODY ════════════════════════════════════════════════════════ */}
          <div style={{ padding:'24px 32px' }}>

            {/* — Parties — */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'20px' }}>
              {/* Seller */}
              <div style={{ background:'#f5f5f5', borderRadius:'14px', padding:'16px', borderLeft:'4px solid #13233A' }}>
                <div style={{ fontSize:'10px', fontWeight:700, color:'#9e9e9e', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'6px' }}>Seller / Farmer</div>
                <div style={{ fontSize:'15px', fontWeight:800, color:'#212121' }}>{sellerName}</div>
                {farmerId && <div style={{ fontSize:'11px', color:'#757575', marginTop:'3px' }}>Farmer ID: {farmerId}</div>}
              </div>

              {/* Buyer */}
              <div style={{ background:'#f5f5f5', borderRadius:'14px', padding:'16px', borderLeft:'4px solid #E51B2A' }}>
                <div style={{ fontSize:'10px', fontWeight:700, color:'#9e9e9e', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'6px' }}>Buyer</div>
                <div style={{ fontSize:'15px', fontWeight:800, color:'#212121' }}>{buyerName}</div>
                {buyerBusiness && <div style={{ fontSize:'11px', color:'#757575', marginTop:'3px' }}>{buyerBusiness}</div>}
              </div>
            </div>

            {/* — Transaction Details — */}
            <div style={{ marginBottom:'20px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#9e9e9e', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'4px' }}>
                Transaction Details
              </div>
              <Row icon={Hash}        label="Transaction ID" value={txnId} />
              <Row icon={Package}     label="Batch ID"       value={batchId} />
              <Row icon={Calendar}    label="Date & Time"    value={fmtDate(txnDate)} />
              <Row icon={MapPin}      label="Location"       value={location} />
              {utrNumber && <Row icon={Hash}        label="UTR Number"    value={utrNumber} />}
              {gstNumber  && <Row icon={ShieldCheck} label="GST Number"   value={gstNumber} />}
            </div>

            {/* — Financial Summary — */}
            <div style={{ background:'linear-gradient(135deg,#13233A 0%,#1e3a5f 100%)', borderRadius:'16px', padding:'20px', color:'#fff', marginBottom:'20px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'14px' }}>
                Financial Summary
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                  <span style={{ color:'rgba(255,255,255,0.7)' }}>Quantity</span>
                  <span style={{ fontWeight:700 }}>{fmt(quantity)} {unit}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                  <span style={{ color:'rgba(255,255,255,0.7)' }}>Rate per Quintal</span>
                  <span style={{ fontWeight:700 }}>{fmtCurrency(price)}</span>
                </div>
                {agentFeeAmount != null && (
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                    <span style={{ color:'rgba(255,255,255,0.7)' }}>Platform Fee {agentFeePaid ? '✓' : '(Pending)'}</span>
                    <span style={{ fontWeight:700, color: agentFeePaid ? '#a5d6a7' : '#ffcc80' }}>{fmtCurrency(agentFeeAmount)}</span>
                  </div>
                )}
                <div style={{ borderTop:'1px solid rgba(255,255,255,0.15)', paddingTop:'12px', marginTop:'4px', display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:'14px', fontWeight:700 }}>Total Amount</span>
                  <span style={{ fontSize:'20px', fontWeight:900, color:'#ff8a80' }}>{fmtCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* — Quality Report — */}
            {(moisturePercent != null || aiFindings) && (
              <div style={{ background:'#e8f5e9', border:'1px solid #c8e6c9', borderRadius:'14px', padding:'16px', marginBottom:'20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                  <ShieldCheck size={16} color="#2e7d32" />
                  <span style={{ fontSize:'12px', fontWeight:700, color:'#2e7d32', textTransform:'uppercase', letterSpacing:'0.08em' }}>Quality Certification</span>
                </div>
                {moisturePercent != null && (
                  <div style={{ fontSize:'13px', color:'#1b5e20', fontWeight:600, marginBottom:'4px' }}>
                    Moisture Level: <strong>{moisturePercent}%</strong>
                    {moisturePercent >= 10 && moisturePercent <= 14 ? ' ✓ Optimal (10%–14%)' : ''}
                  </div>
                )}
                {aiFindings && (
                  <div style={{ fontSize:'12px', color:'#388e3c', lineHeight:1.5 }}>{aiFindings}</div>
                )}
              </div>
            )}

            {/* Dashed separator */}
            <div style={{ borderTop:'2px dashed #e0e0e0', margin:'4px 0 20px' }} />

            {/* Footer disclaimer */}
            <div style={{ fontSize:'11px', color:'#9e9e9e', lineHeight:1.6, textAlign:'center' }}>
              This is a computer-generated receipt issued by the <strong>Saathi Agri Supply Chain</strong> platform.
              No signature is required. Transaction ID <strong>{txnId}</strong> is immutably recorded on the Saathi ledger.
              For disputes, contact <strong>support@saathi.co.in</strong>.
            </div>
          </div>

          {/* ══ ACTION BUTTONS ══════════════════════════════════════════════ */}
          <div
            className="receipt-no-print"
            style={{ padding:'16px 32px 24px', display:'flex', gap:'12px', justifyContent:'flex-end', borderTop:'1px solid #f0f0f0' }}
          >
            {onClose && (
              <button onClick={onClose} style={{ ...btnBase, background:'#fff', color:'#616161', border:'1px solid #e0e0e0' }}
                onMouseEnter={(e) => (e.currentTarget.style.background='#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background='#fff')}>
                Done
              </button>
            )}
            <button onClick={handlePrint} style={{ ...btnBase, background:'#f5f5f5', color:'#13233A' }}
              onMouseEnter={(e) => (e.currentTarget.style.background='#e0e0e0')}
              onMouseLeave={(e) => (e.currentTarget.style.background='#f5f5f5')}>
              <Download size={14} /> Save PDF
            </button>
            <button onClick={handlePrint} style={{ ...btnBase, background:'#13233A', color:'#fff' }}
              onMouseEnter={(e) => (e.currentTarget.style.background='#0d1829')}
              onMouseLeave={(e) => (e.currentTarget.style.background='#13233A')}>
              <Printer size={14} /> Print
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
