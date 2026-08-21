const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : '');
const apiBaseUrl = configuredBaseUrl.replace(/\/api\/auth\/?$/, '').replace(/\/$/, '');

async function getJson(path) {
  if (!apiBaseUrl) return null;
  const response = await fetch(`${apiBaseUrl}${path}`);
  if (!response.ok) throw new Error(`Blockchain API returned ${response.status}`);
  return response.json();
}

export async function getSupplyChainVerification(recordId) {
  try {
    const result = await getJson(`/api/blockchain/supply-chain/${encodeURIComponent(recordId)}`);
    return result?.blockchain || { status: 'pending', verified: false, network: 'Polygon Amoy' };
  } catch {
    return { status: 'pending', verified: false, network: 'Polygon Amoy' };
  }
}

export async function getBuyerVerification(buyerId) {
  try {
    const result = await getJson(`/api/blockchain/buyer/${encodeURIComponent(buyerId)}`);
    return result?.blockchain || { status: 'pending', verified: false, network: 'Polygon Amoy' };
  } catch {
    return { status: 'pending', verified: false, network: 'Polygon Amoy' };
  }
}

export async function getBlockchainStats() {
  try {
    return await getJson('/api/blockchain/stats');
  } catch {
    return { hasRecords: false, network: 'Polygon Amoy', supplyChainEvents: 0, verifiedBuyers: 0 };
  }
}
