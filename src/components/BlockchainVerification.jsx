import { useEffect, useState } from 'react';
import { getBlockchainStats, getBuyerVerification, getSupplyChainVerification } from '../api/blockchainService';

const shortenHash = (value) => value ? `${value.slice(0, 10)}...${value.slice(-8)}` : '';

export function BlockchainStatus({ verification, compact = false }) {
  const verified = verification?.verified === true;
  const failed = verification?.status === 'failed';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
      verified
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : failed
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-slate-200 bg-slate-50 text-slate-600'
    }`}>
      <span>{verified ? '✓' : failed ? '⚠' : '🔗'}</span>
      {verified ? 'Blockchain Verified' : failed ? 'Verification Pending' : 'No blockchain record yet'}
      {!compact && verification?.network && <span className="font-medium">· {verification.network}</span>}
    </span>
  );
}

export function SupplyChainVerification({ recordId, product, stage }) {
  const [verification, setVerification] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getSupplyChainVerification(recordId).then((result) => {
      if (active) setVerification(result);
    });
    return () => { active = false; };
  }, [recordId]);

  return (
    <div className="mt-4 rounded-2xl border border-white/20 bg-black/70 backdrop-blur-md p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BlockchainStatus verification={verification} />
        <button type="button" onClick={() => setIsOpen((current) => !current)} className="text-xs font-bold text-emerald-400 underline underline-offset-2 hover:text-emerald-300">
          {isOpen ? 'Hide verification' : 'View Blockchain Verification'}
        </button>
      </div>
      {isOpen && (
        <dl className="mt-3 grid gap-3 border-t border-white/20 pt-3 text-xs sm:grid-cols-2">
          <VerificationItem label="Network" value={verification?.network || 'Polygon Amoy'} />
          <VerificationItem label="Status" value={verification?.verified ? 'Verified' : 'Pending'} />
          <VerificationItem label="Record" value={`${product || 'Crop'} · ${stage || 'Supply chain'}`} />
          <VerificationItem label="Transaction" value={shortenHash(verification?.transactionHash) || 'Not recorded yet'} />
          <VerificationItem label="Timestamp" value={verification?.timestamp ? new Date(verification.timestamp).toLocaleString() : 'Not available'} />
        </dl>
      )}
    </div>
  );
}

export function BuyerVerification({ buyerId, buyerType }) {
  const [verification, setVerification] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getBuyerVerification(buyerId).then((result) => {
      if (active) setVerification(result);
    });
    return () => { active = false; };
  }, [buyerId]);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <BlockchainStatus verification={verification} compact />
      <button type="button" onClick={() => setIsOpen((current) => !current)} className="text-xs font-bold text-[#2E7D32] underline underline-offset-2 hover:text-[#174532]">
        {isOpen ? 'Hide details' : 'View Verification'}
      </button>
      {isOpen && (
        <div className="basis-full rounded-xl border border-white/20 bg-black/70 backdrop-blur-md p-3 text-xs">
          <p><strong className="text-emerald-400">Buyer ID:</strong> <span className="text-white">{buyerId}</span></p>
          <p className="mt-1"><strong className="text-emerald-400">Type:</strong> <span className="text-white">{buyerType}</span></p>
          <p className="mt-1"><strong className="text-emerald-400">Status:</strong> <span className="text-white">{verification?.verified ? 'Verified' : 'Pending'}</span></p>
          <p className="mt-1"><strong className="text-emerald-400">Network:</strong> <span className="text-white">{verification?.network || 'Polygon Amoy'}</span></p>
          <p className="mt-1"><strong className="text-emerald-400">Transaction:</strong> <span className="text-white">{shortenHash(verification?.transactionHash) || 'Not recorded yet'}</span></p>
          <p className="mt-1"><strong className="text-emerald-400">Data hash:</strong> <span className="text-white">{shortenHash(verification?.dataHash) || 'Not available'}</span></p>
        </div>
      )}
    </div>
  );
}

export function BlockchainTransparency() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;
    getBlockchainStats().then((result) => {
      if (active) setStats(result);
    });
    return () => { active = false; };
  }, []);

  return (
    <section className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Trust layer</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">Blockchain Transparency</h3>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{stats?.network || 'Polygon Amoy'}</span>
      </div>
      {stats?.hasRecords ? (
        <div className="mt-4 grid grid-cols-2 gap-3 text-center sm:max-w-sm">
          <div className="rounded-xl bg-emerald-50 p-3"><p className="text-2xl font-extrabold text-emerald-800">{stats.supplyChainEvents}</p><p className="text-xs font-semibold text-slate-600">Supply-chain events</p></div>
          <div className="rounded-xl bg-emerald-50 p-3"><p className="text-2xl font-extrabold text-emerald-800">{stats.verifiedBuyers}</p><p className="text-xs font-semibold text-slate-600">Verified buyers</p></div>
        </div>
      ) : (
        <p className="mt-4 text-sm font-semibold text-slate-600">No blockchain records yet</p>
      )}
    </section>
  );
}

function VerificationItem({ label, value }) {
  return (
    <div>
      <dt className="font-bold uppercase tracking-wide text-emerald-400">{label}</dt>
      <dd className="mt-0.5 font-semibold text-white">{value}</dd>
    </div>
  );
}
