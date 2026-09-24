const express = require('express');
const {
  adminLogin,
  getAllUsers,
  deleteUser,
  verifyAdminToken,
} = require('../controllers/adminController');
const {
  getAllApplications,
  getApplicationById,
  reviewApplication,
  approveApplication,
  rejectApplication,
  requestInformation,
} = require('../controllers/buyerApplicationController');

const BuyerRequest = require('../models/BuyerRequest');
const BuyerApplication = require('../models/BuyerApplication');
const Deal = require('../models/Deal');
const AdminWallet = require('../models/AdminWallet');
const WalletTransaction = require('../models/WalletTransaction');

const router = express.Router();

// Helper: Get or create admin wallet
async function getWallet() {
  let wallet = await AdminWallet.findOne();
  if (!wallet) wallet = await AdminWallet.create({ balance: 0, totalReceived: 0, totalForwarded: 0 });
  return wallet;
}

// Helper: Generate Saathi receipt HTML as base64 string
function generateReceiptHtml(data) {
  const {
    receiptNumber, farmerName, farmerBank, farmerIfsc, farmerUpi, farmerUpiPhone,
    crop, quantity, unit, agreedPrice, agentFee, totalAmount, paidAt, dealId
  } = data;

  const dateStr = new Date(paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = new Date(paidAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Saathi Payment Receipt</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; color: #333; }
  .receipt { max-width: 650px; margin: 0 auto; background: white; border: 2px solid #16a34a; border-radius: 8px; overflow: hidden; }
  .header { background: #16a34a; color: white; padding: 20px 25px; display: flex; justify-content: space-between; align-items: center; }
  .header-left h1 { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px; }
  .header-left p { margin: 4px 0 0; font-size: 12px; opacity: 0.85; }
  .flag { font-size: 32px; }
  .receipt-meta { padding: 15px 25px; background: #f0fdf4; border-bottom: 1px solid #d1fae5; display: flex; justify-content: space-between; }
  .receipt-meta div { font-size: 12px; }
  .receipt-meta strong { color: #16a34a; font-size: 14px; display: block; }
  .section { padding: 18px 25px; border-bottom: 1px solid #e5e7eb; }
  .section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin: 0 0 12px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .field label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
  .field p { margin: 2px 0 0; font-weight: 700; color: #111; font-size: 13px; }
  .table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .table th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #6b7280; }
  .table td { padding: 10px 10px; border-bottom: 1px solid #f3f4f6; }
  .table tr:last-child td { border: none; }
  .totals { margin-top: 10px; }
  .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
  .totals-row.grand { font-size: 16px; font-weight: 900; color: #16a34a; border-top: 2px solid #16a34a; padding-top: 10px; margin-top: 5px; }
  .bank-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 14px; margin-top: 10px; }
  .bank-box h4 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; color: #16a34a; letter-spacing: 1px; }
  .bank-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; }
  .bank-grid div label { color: #6b7280; font-size: 10px; }
  .bank-grid div p { font-weight: 700; color: #111; margin: 2px 0 0; }
  .stamp { text-align: center; padding: 18px; }
  .stamp-circle { display: inline-block; border: 3px solid #16a34a; border-radius: 50%; width: 80px; height: 80px; line-height: 80px; font-weight: 900; font-size: 12px; color: #16a34a; text-align: center; transform: rotate(-15deg); }
  .footer { background: #f9fafb; padding: 12px 25px; font-size: 10px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; }
  .status-badge { display: inline-block; background: #dcfce7; color: #16a34a; font-weight: 900; font-size: 12px; padding: 4px 12px; border-radius: 20px; border: 1px solid #86efac; }
</style>
</head>
<body>
<div class="receipt">
  <div class="header">
    <div class="header-left">
      <h1>🌾 SAATHI</h1>
      <p>Agri-Network Payment Receipt</p>
      <p>Digital Agriculture Mission (DAM) • India</p>
    </div>
    <div class="flag">🇮🇳</div>
  </div>

  <div class="receipt-meta">
    <div>
      <label>Receipt Number</label>
      <strong>${receiptNumber}</strong>
    </div>
    <div>
      <label>Date &amp; Time</label>
      <strong>${dateStr}, ${timeStr}</strong>
    </div>
    <div>
      <label>Status</label>
      <span class="status-badge">✓ PAID</span>
    </div>
  </div>

  <div class="section">
    <h3>Payment Information</h3>
    <div class="grid-2">
      <div class="field"><label>Paid To (Farmer)</label><p>${farmerName}</p></div>
      <div class="field"><label>Deal Reference</label><p>#${String(dealId).slice(-8).toUpperCase()}</p></div>
      <div class="field"><label>Company (Payer)</label><p>Saathi Agri-Network Pvt. Ltd.</p></div>
      <div class="field"><label>Crop / Produce</label><p>${crop}</p></div>
    </div>
  </div>

  <div class="section">
    <h3>Transaction Details</h3>
    <table class="table">
      <thead>
        <tr><th>Description</th><th>Price/Unit</th><th>Quantity</th><th>Total (INR)</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>${crop} — Crop Procurement</td>
          <td>₹${Number(agreedPrice).toLocaleString('en-IN')}</td>
          <td>${quantity} ${unit || 'Qtl'}</td>
          <td>₹${Number(agreedPrice * quantity).toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>
    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span>₹${Number(agreedPrice * quantity).toLocaleString('en-IN')}</span></div>
      <div class="totals-row"><span>Field Agent Fee (paid by Farmer)</span><span>– ₹${agentFee || 250}</span></div>
      <div class="totals-row grand"><span>GRAND TOTAL PAID</span><span>₹${Number(totalAmount).toLocaleString('en-IN')}</span></div>
    </div>
  </div>

  <div class="section">
    <h3>Payment Information</h3>
    <div class="bank-box">
      <h4>🏦 Farmer Bank Account (Transfer Destination)</h4>
      <div class="bank-grid">
        <div><label>Account Number</label><p>${farmerBank || 'N/A'}</p></div>
        <div><label>IFSC Code</label><p>${farmerIfsc || 'N/A'}</p></div>
        <div><label>UPI ID</label><p>${farmerUpi || 'N/A'}</p></div>
        <div><label>UPI Phone</label><p>${farmerUpiPhone || 'N/A'}</p></div>
      </div>
    </div>
  </div>

  <div class="section" style="display:flex; justify-content: space-between; align-items:center">
    <div>
      <p style="font-size:11px; color:#6b7280; margin:0">This is a computer-generated receipt issued by Saathi Agri-Network.</p>
      <p style="font-size:11px; color:#6b7280; margin:4px 0 0">No signature required. Valid for audit and tax purposes.</p>
    </div>
    <div class="stamp-circle">PAID</div>
  </div>

  <div class="footer">
    Saathi Agri-Network Pvt. Ltd. • Certified Under Digital Agriculture Mission (DAM) • 256-Bit SSL Secured
  </div>
</div>
</body>
</html>`;

  return `data:text/html;base64,${Buffer.from(html).toString('base64')}`;
}

// Public route to authenticate admin
router.post('/login', adminLogin);

// Protected routes (Requires valid Admin JWT token)
router.get('/users', verifyAdminToken, getAllUsers);
router.delete('/users/:id', verifyAdminToken, deleteUser);

// Dashboard Summary (Aggregated data)
const User = require('../models/User');
router.get('/dashboard-summary', verifyAdminToken, async (req, res) => {
  try {
    console.time('dashboard:users');
    const users = await User.find().select('-password -profileImage -documents').sort({ createdAt: -1 });
    console.timeEnd('dashboard:users');

    console.time('dashboard:buyerRequests');
    const rawBuyerRequests = await BuyerRequest.find().populate('buyerId', 'firstName lastName phone email village district state').sort({ createdAt: -1 });
    console.timeEnd('dashboard:buyerRequests');

    console.time('dashboard:buyerApplications');
    const buyerApplications = await BuyerApplication.find().select('-profilePhoto -documents').sort({ createdAt: -1 });
    console.timeEnd('dashboard:buyerApplications');

    console.time('dashboard:dealInspections');
    const dealInspections = await Deal.find()
        .select('-deliverySubmissions -qualitySubmissions.imageUrls -transactionReceiptUrl')
        .populate('farmerId', 'firstName lastName phone email village block district state')
        .populate('buyerId', 'firstName lastName phone email village block district state')
        .populate('buyerRequestId', 'crop quantity unit offeredPrice location description')
        .sort({ updatedAt: -1 });
    console.timeEnd('dashboard:dealInspections');

    console.time('dashboard:mapping');
    // Perform the join in-memory to avoid N+1 database queries
    const buyerRequests = rawBuyerRequests.map(r => {
      const phone = r.buyerId?.phone;
      const email = r.buyerId?.email;
      let app = null;
      if (phone) {
        app = buyerApplications.find(a => a.phone === phone);
      }
      if (!app && email) {
        app = buyerApplications.find(a => a.email === email);
      }
      return { ...r.toObject(), buyerApplication: app || null };
    });
    console.timeEnd('dashboard:mapping');

    res.status(200).json({
      success: true,
      data: {
        users,
        buyerRequests,
        buyerApplications,
        dealInspections
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error.message);
    res.status(500).json({ success: false, message: 'Server error while fetching dashboard summary' });
  }
});

// GET full deal by ID (used for fetching heavy fields like base64 images lazily)
router.get('/deals/:id', verifyAdminToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)
        .populate('farmerId', 'firstName lastName phone email village block district state')
        .populate('buyerId', 'firstName lastName phone email village block district state')
        .populate('buyerRequestId', 'crop quantity unit offeredPrice location description');
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }
    res.json({ success: true, data: deal });
  } catch (error) {
    console.error('Admin Get Deal Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching deal' });
  }
});

// Buyer application admin routes (KYC / Onboarding)
router.get('/buyer-applications', verifyAdminToken, getAllApplications);
router.get('/buyer-applications/:id', verifyAdminToken, getApplicationById);
router.patch('/buyer-applications/:id/review', verifyAdminToken, reviewApplication);
router.patch('/buyer-applications/:id/approve', verifyAdminToken, approveApplication);
router.patch('/buyer-applications/:id/reject', verifyAdminToken, rejectApplication);
router.patch('/buyer-applications/:id/request-information', verifyAdminToken, requestInformation);

// Buyer publication / procurement requests admin routes
router.get('/buyer-requests', verifyAdminToken, async (req, res) => {
  try {
    const requests = await BuyerRequest.find()
        .populate('buyerId', 'firstName lastName phone email village district state')
        .sort({ createdAt: -1 });
    const buyerApplications = await BuyerApplication.find().select('-profilePhoto -documents').sort({ createdAt: -1 });

    const populated = requests.map(r => {
      const phone = r.buyerId?.phone;
      const email = r.buyerId?.email;
      let app = null;
      if (phone) {
        app = buyerApplications.find(a => a.phone === phone);
      }
      if (!app && email) {
        app = buyerApplications.find(a => a.email === email);
      }
      return {
        ...r.toObject(),
        buyerApplication: app || null,
      };
    });

    res.status(200).json({ success: true, count: populated.length, data: populated });
  } catch (error) {
    console.error('Error fetching buyer requests:', error.message);
    res.status(500).json({ success: false, message: 'Server error while fetching buyer requests' });
  }
});

router.patch('/buyer-requests/:id/approve', verifyAdminToken, async (req, res) => {
  try {
    const request = await BuyerRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Buyer request not found' });
    }
    request.status = 'PUBLISHED';
    request.publishedAt = new Date();
    request.reviewedAt = new Date();
    request.reviewedBy = req.admin?.email || 'admin';
    request.adminRemarks = '';
    await request.save();
    res.status(200).json({ success: true, message: 'Buyer publication approved and published.', data: request });
  } catch (error) {
    console.error('Error approving buyer request:', error.message);
    res.status(500).json({ success: false, message: 'Server error while approving request' });
  }
});

router.patch('/buyer-requests/:id/reject', verifyAdminToken, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const request = await BuyerRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Buyer request not found' });
    }
    request.status = 'REJECTED';
    request.adminRemarks = (reason || '').trim() || 'Requirements do not meet Saathi verification criteria.';
    request.reviewedAt = new Date();
    request.reviewedBy = req.admin?.email || 'admin';
    await request.save();
    res.status(200).json({ success: true, message: 'Buyer publication rejected.', data: request });
  } catch (error) {
    console.error('Error rejecting buyer request:', error.message);
    res.status(500).json({ success: false, message: 'Server error while rejecting request' });
  }
});

// ── On-Ground Field Agent Inspections Admin Routes ──
router.get('/deals/inspections', verifyAdminToken, async (req, res) => {
  try {
    const deals = await Deal.find()
      .populate('farmerId', 'firstName lastName phone email village block district state')
      .populate('buyerId', 'firstName lastName phone email village block district state')
      .populate('buyerRequestId', 'crop quantity unit offeredPrice location description')
      .sort({ updatedAt: -1 });
    res.status(200).json({ success: true, count: deals.length, data: deals });
  } catch (error) {
    console.error('Error fetching inspections:', error.message);
    res.status(500).json({ success: false, message: 'Server error while fetching inspections' });
  }
});

// Admin taps "Verified" (Approve on-ground physical inspection)
router.patch('/deals/:id/verify', verifyAdminToken, async (req, res) => {
  try {
    const { notes } = req.body || {};
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });

    if (deal.status !== 'HUMAN_REVIEW') {
      return res.status(400).json({ success: false, message: 'Deal is not ready for physical verification.' });
    }

    if (req.body.status === 'REJECTED') {
      deal.status = 'CANCELLED';
      deal.escrowStatus = 'REFUNDED';
    } else {
      deal.status = 'ADMIN_PRE_SHIPMENT_VERIFIED';
      deal.verifiedAt = new Date();
    }

    if (deal.qualitySubmissions && deal.qualitySubmissions.length > 0) {
      const lastSub = deal.qualitySubmissions[deal.qualitySubmissions.length - 1];
      lastSub.humanStatus = req.body.status === 'REJECTED' ? 'REJECTED' : 'APPROVED';
      lastSub.humanNotes = notes || (req.body.status === 'REJECTED' ? 'Failed on-ground physical quality parameters.' : 'Physical crop check verified on-ground by Saathi field agent.');
      lastSub.reviewedAt = new Date();
      lastSub.verifiedAt = new Date();
    }

    await deal.save();
    res.status(200).json({ success: true, message: 'Crop verified successfully! Contact and delivery details unlocked for both parties.', data: deal });
  } catch (error) {
    console.error('Error verifying deal:', error.message);
    res.status(500).json({ success: false, message: 'Server error while verifying deal' });
  }
});

// Admin taps "Approve Moisture & Photos"
router.patch('/deals/:id/verify-moisture', verifyAdminToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });

    if (deal.status !== 'ADMIN_MOISTURE_REVIEW') {
      return res.status(400).json({ success: false, message: 'Deal is not in moisture review state' });
    }

    if (req.body.status === 'REJECTED') {
      deal.status = 'AI_FLAGGED'; // Send back to farmer to re-upload photos
    } else {
      deal.status = 'BUYER_PAYMENT_PENDING'; // Proceed to buyer payment
    }

    await deal.save();
    res.status(200).json({ success: true, message: 'Moisture and photos verified successfully.', data: deal });
  } catch (error) {
    console.error('Error verifying moisture:', error.message);
    res.status(500).json({ success: false, message: 'Server error while verifying moisture' });
  }
});

// Admin taps "Unverified"
router.patch('/deals/:id/unverify', verifyAdminToken, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });

    deal.status = 'UNVERIFIED';

    if (deal.qualitySubmissions && deal.qualitySubmissions.length > 0) {
      const lastSub = deal.qualitySubmissions[deal.qualitySubmissions.length - 1];
      lastSub.humanStatus = 'REJECTED';
      lastSub.humanNotes = reason || 'Produce failed on-ground physical quality parameters.';
      lastSub.reviewedAt = new Date();
    }

    await deal.save();
    res.status(200).json({ success: true, message: 'Produce marked Unverified.', data: deal });
  } catch (error) {
    console.error('Error un-verifying deal:', error.message);
    res.status(500).json({ success: false, message: 'Server error while updating deal status' });
  }
});

// Admin taps "Mark Deal Completed" (after reviewing uploaded receipt & UTR)
router.patch('/deals/:id/complete', verifyAdminToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });

    if (!['RECEIPT_SUBMITTED', 'BUYER_DELIVERY_UPLOADED'].includes(deal.status)) {
      return res.status(400).json({ success: false, message: 'Deal is not ready for completion.' });
    }

    deal.status = 'COMPLETED';
    deal.completedAt = new Date();
    await deal.save();

    res.status(200).json({
      success: true,
      message: 'Deal marked as COMPLETED! Recorded successfully on farmer dashboard.',
      data: deal
    });
  } catch (error) {
    console.error('Error completing deal:', error.message);
    res.status(500).json({ success: false, message: 'Server error while completing deal' });
  }
});

router.patch('/deals/:id/final-verification', verifyAdminToken, async (req, res) => {
  try {
    const { status, notes, utrNumber, transactionReceiptUrl } = req.body;
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ message: 'Deal not found' });
    
    if (deal.status !== 'BUYER_DELIVERY_UPLOADED') {
      return res.status(400).json({ message: 'Deal is not ready for final verification.' });
    }
    
    if (status === 'APPROVED') {
      deal.status = 'COMPLETED';
      deal.escrowStatus = 'RELEASED';
      deal.completedAt = Date.now();
      deal.utrNumber = utrNumber;
      deal.transactionReceiptUrl = transactionReceiptUrl;
      deal.receiptUploadedBy = req.admin?._id;
      deal.receiptUploadedAt = Date.now();
    } else {
      deal.status = 'CANCELLED';
      deal.escrowStatus = 'REFUNDED';
    }
    await deal.save();
    res.json({ success: true, data: deal });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// ── Admin Wallet Routes ──

// GET: Wallet balance summary
router.get('/wallet', verifyAdminToken, async (req, res) => {
  try {
    const wallet = await getWallet();
    res.json({ success: true, data: wallet });
  } catch (error) {
    console.error('Error fetching wallet:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching wallet' });
  }
});

// GET: All wallet transactions
router.get('/wallet/transactions', verifyAdminToken, async (req, res) => {
  try {
    const { type, limit = 100, offset = 0 } = req.query;
    const query = type && type !== 'ALL' ? { type } : {};
    const transactions = await WalletTransaction.find(query)
      .populate('fromUserId', 'firstName lastName phone role')
      .populate('toUserId', 'firstName lastName phone role')
      .populate('dealId', 'crop quantity agreedPrice status')
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));
    const total = await WalletTransaction.countDocuments(query);
    res.json({ success: true, count: transactions.length, total, data: transactions });
  } catch (error) {
    console.error('Error fetching wallet transactions:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching transactions' });
  }
});

// POST: Pay farmer — deduct from admin wallet and generate receipt
router.post('/deals/:id/pay-farmer', verifyAdminToken, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate('farmerId', 'firstName lastName phone email village district state')
      .populate('buyerRequestId', 'crop quantity unit offeredPrice location');

    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });

    if (!['RECEIPT_SUBMITTED', 'BUYER_DELIVERY_UPLOADED', 'VERIFIED', 'ADMIN_PRE_SHIPMENT_VERIFIED'].includes(deal.status)) {
      return res.status(400).json({ success: false, message: 'Deal is not at a stage where farmer payment can be made.' });
    }

    if (!deal.escrowBankAccount || !deal.escrowBankAccount.accountNumber) {
      return res.status(400).json({ success: false, message: 'Farmer has not submitted bank details yet.' });
    }

    // Calculate payout: agreedPrice × quantity (the ₹250 agent fee stays with admin)
    const payoutAmount = Number(deal.agreedPrice) * Number(deal.quantity);
    const wallet = await getWallet();

    if (wallet.balance < payoutAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Wallet: ₹${wallet.balance.toLocaleString('en-IN')}, Required: ₹${payoutAmount.toLocaleString('en-IN')}`
      });
    }

    // Generate receipt
    const receiptNumber = `STH-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const paidAt = new Date();
    const farmerName = `${deal.farmerId?.firstName || ''} ${deal.farmerId?.lastName || ''}`.trim();

    const receiptHtml = generateReceiptHtml({
      receiptNumber,
      farmerName,
      farmerBank: deal.escrowBankAccount?.accountNumber,
      farmerIfsc: deal.escrowBankAccount?.ifscCode,
      farmerUpi: deal.escrowBankAccount?.upiId,
      farmerUpiPhone: deal.escrowBankAccount?.upiPhone,
      crop: deal.crop,
      quantity: deal.quantity,
      unit: deal.buyerRequestId?.unit || 'Qtl',
      agreedPrice: deal.agreedPrice,
      agentFee: 250,
      totalAmount: payoutAmount,
      paidAt,
      dealId: deal._id,
    });

    // Debit from wallet
    wallet.balance -= payoutAmount;
    wallet.totalForwarded += payoutAmount;
    await wallet.save();

    // Record in wallet transaction history
    const walletTx = await WalletTransaction.create({
      type: 'FORWARDED',
      amount: payoutAmount,
      dealId: deal._id,
      toUserId: deal.farmerId._id,
      description: `Payout to farmer ${farmerName} for Deal #${deal._id} (${deal.crop})`,
      payerRole: 'FARMER',
      balanceAfter: wallet.balance,
      receiptData: {
        receiptNumber,
        farmerName,
        farmerBank: deal.escrowBankAccount?.accountNumber,
        farmerIfsc: deal.escrowBankAccount?.ifscCode,
        farmerUpi: deal.escrowBankAccount?.upiId,
        crop: deal.crop,
        quantity: deal.quantity,
        agreedPrice: deal.agreedPrice,
        totalAmount: payoutAmount,
        paidAt,
        generatedReceiptUrl: receiptHtml,
      }
    });

    // Update deal: attach receipt and mark COMPLETED
    deal.transactionReceiptUrl = receiptHtml;
    deal.utrNumber = receiptNumber;
    deal.receiptUploadedAt = paidAt;
    deal.status = 'COMPLETED';
    deal.completedAt = paidAt;
    deal.escrowStatus = 'RELEASED';
    await deal.save();

    res.json({
      success: true,
      message: `✅ ₹${payoutAmount.toLocaleString('en-IN')} paid to ${farmerName}. Receipt generated!`,
      data: {
        deal,
        walletBalance: wallet.balance,
        receiptNumber,
        receiptUrl: receiptHtml,
        transactionId: walletTx._id,
      }
    });
  } catch (error) {
    console.error('Pay farmer error:', error.message);
    res.status(500).json({ success: false, message: 'Server error processing farmer payment' });
  }
});

module.exports = router;