const BuyerApplication = require('../models/BuyerApplication');
const { verifyAdminToken } = require('./adminController');

// Helper: validate Indian mobile number
const isValidIndianMobile = (phone) => /^[6-9]\d{9}$/.test(phone);

// Helper: validate email
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Helper: validate 6-digit pincode
const isValidPincode = (pincode) => /^\d{6}$/.test(pincode);

// Helper: validate year
const isValidYear = (year) => {
  if (!year) return true;
  const currentYear = new Date().getFullYear();
  return Number.isInteger(year) && year >= 1900 && year <= currentYear;
};

// Helper: sanitize string
const clean = (value) => (typeof value === 'string' ? value.trim() : '');

// Helper: verify GST via API (or mock if no key)
async function verifyGstApi(gstNumber, businessName) {
  if (!gstNumber || gstNumber.length !== 15) {
    return { status: 'FAILED', message: 'Invalid GST Number format', businessNameMatch: false, verifiedAt: new Date() };
  }
  
  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST; // e.g., 'indian-gst-verification.p.rapidapi.com'

  if (!apiKey || !apiHost) {
    console.log('[GST Verification] Missing RAPIDAPI_KEY or RAPIDAPI_HOST, using mock response for GST:', gstNumber);
    return {
      status: 'VERIFIED',
      message: 'GST is Active (Mocked API Response)',
      businessNameMatch: true,
      verifiedAt: new Date()
    };
  }

  try {
    // Note: The exact URL might depend on the specific RapidAPI provider chosen.
    // Based on the selected API (GST Return Status), the format is /free/gstin/{gstin}
    const url = `https://${apiHost}/free/gstin/${gstNumber}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost
      }
    });
    
    const data = await response.json();
    
    // Adjust data.status check based on actual API provider payload
    if (response.ok && data) {
      // The new API nests the actual data inside a 'data' property
      const apiData = data.data || data; 
      const tradeName = apiData.tradeName || apiData.lgnm || 'N/A';
      
      return {
        status: 'VERIFIED',
        message: `Verified. Business Name: ${tradeName}`,
        businessNameMatch: true, // We could eventually add logic to compare this with req.body.business.name
        verifiedAt: new Date()
      };
    } else {
      return {
        status: 'FAILED',
        message: data.error || data.message || 'GST is Invalid or Inactive',
        businessNameMatch: false,
        verifiedAt: new Date()
      };
    }
  } catch (error) {
    console.error('[GST Verification] Error:', error.message);
    return { status: 'FAILED', message: 'API verification request failed', businessNameMatch: false, verifiedAt: new Date() };
  }
}

// Helper: validate documents
const validateDocuments = (documents) => {
  const required = ['identityProof', 'businessProof', 'addressProof'];
  for (const key of required) {
    if (!documents[key] || !clean(documents[key])) {
      return `Required document "${key}" is missing`;
    }
  }
  return null;
};

// @desc    Submit buyer application
// @route   POST /api/buyers/apply
// @access  Public
async function applyBuyer(req, res) {
  try {
    const body = req.body || {};

    // --- Applicant Information ---
    const applicantName = clean(body.applicantName);
    const phone = clean(body.phone);
    const email = clean(body.email);
    const profilePhoto = clean(body.profilePhoto || '');

    if (!applicantName) return res.status(400).json({ success: false, message: 'Full name is required' });
    if (!isValidIndianMobile(phone)) return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number' });
    if (!isValidEmail(email)) return res.status(400).json({ success: false, message: 'Please enter a valid email address' });

    // --- Buyer Type ---
    const buyerType = clean(body.buyerType);
    const otherBuyerType = clean(body.otherBuyerType || '');
    const allowedBuyerTypes = ['Wholesaler', 'Retailer', 'Trader', 'Processor / Manufacturer', 'FPO / Farmer Producer Organization', 'Collection Center', 'Distributor', 'Other'];
    if (!allowedBuyerTypes.includes(buyerType)) return res.status(400).json({ success: false, message: 'Please select a valid buyer type' });
    if (buyerType === 'Other' && !otherBuyerType) return res.status(400).json({ success: false, message: 'Please specify your buyer type' });

    // --- Business Information ---
    const businessName = clean(body.businessName);
    const businessType = clean(body.businessType);
    const gstNumber = clean(body.gstNumber || '');
    const yearEstablished = body.yearEstablished ? Number(body.yearEstablished) : null;
    const businessAddress = clean(body.businessAddress);

    if (!businessName) return res.status(400).json({ success: false, message: 'Business / shop name is required' });
    const allowedBusinessTypes = ['Individual', 'Proprietorship', 'Partnership', 'Company', 'FPO', 'Other'];
    if (!allowedBusinessTypes.includes(businessType)) return res.status(400).json({ success: false, message: 'Please select a valid business type' });
    if (!isValidYear(yearEstablished)) return res.status(400).json({ success: false, message: 'Please enter a valid year established' });
    if (!businessAddress) return res.status(400).json({ success: false, message: 'Business address is required' });

    // --- Address ---
    const state = clean(body.state);
    const district = clean(body.district);
    const tehsilBlock = clean(body.tehsilBlock);
    const villageCity = clean(body.villageCity);
    const pincode = clean(body.pincode);

    if (!state) return res.status(400).json({ success: false, message: 'State is required' });
    if (!district) return res.status(400).json({ success: false, message: 'District is required' });
    if (!tehsilBlock) return res.status(400).json({ success: false, message: 'Tehsil / Block is required' });
    if (!villageCity) return res.status(400).json({ success: false, message: 'Village / Town / City is required' });
    if (!isValidPincode(pincode)) return res.status(400).json({ success: false, message: 'Please enter a valid 6-digit pincode' });

    // --- Location (GeoJSON) ---
    let location = { type: 'Point', coordinates: [] };
    if (body.location && Array.isArray(body.location.coordinates) && body.location.coordinates.length === 2) {
      const [lng, lat] = body.location.coordinates.map(Number);
      if (Number.isFinite(lng) && Number.isFinite(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
        location = { type: 'Point', coordinates: [lng, lat] };
      }
    }

    // --- Commodities ---
    const commodities = Array.isArray(body.commodities) ? body.commodities : [];
    

    const cleanedCommodities = commodities.map((item) => {
      const name = clean(item.name);
      const minQty = item.minimumQuantity ? Number(item.minimumQuantity) : null;
      const maxQty = item.maximumQuantity ? Number(item.maximumQuantity) : null;
      const unit = clean(item.unit || 'quintal');
      const frequency = clean(item.purchaseFrequency || 'as_required');
      const offerPrice = item.offerPrice ? Number(item.offerPrice) : null;
      const offerUnit = clean(item.offerUnit || 'quintal');
      const offerQuantity = item.offerQuantity ? Number(item.offerQuantity) : null;

      return {
        name,
        minimumQuantity: minQty && minQty > 0 ? minQty : null,
        maximumQuantity: maxQty && maxQty > 0 ? maxQty : null,
        unit: ['quintal', 'ton', 'kg'].includes(unit) ? unit : 'quintal',
        purchaseFrequency: ['daily', 'weekly', 'monthly', 'seasonal', 'as_required'].includes(frequency) ? frequency : 'as_required',
        offerPrice: offerPrice && offerPrice > 0 ? offerPrice : null,
        offerUnit,
        offerQuantity: offerQuantity && offerQuantity > 0 ? offerQuantity : null,
        priceUpdatedAt: offerPrice && offerPrice > 0 ? new Date() : null,
      };
    }).filter((item) => item.name);

    

    // --- Preferred Purchase Radius ---
    const preferredPurchaseRadius = clean(body.preferredPurchaseRadius || '25');

    // --- Documents ---
    const documents = {
      identityProof: clean(body.documents?.identityProof || ''),
      businessProof: clean(body.documents?.businessProof || ''),
      addressProof: clean(body.documents?.addressProof || ''),
      gstCertificate: clean(body.documents?.gstCertificate || ''),
      udyamRegistration: clean(body.documents?.udyamRegistration || ''),
      fssaiLicense: clean(body.documents?.fssaiLicense || ''),
      otherDocument: clean(body.documents?.otherDocument || ''),
    };

    const docError = validateDocuments(documents);
    if (docError) return res.status(400).json({ success: false, message: docError });

    // --- Declaration ---
    if (!body.declaration) {
      return res.status(400).json({ success: false, message: 'You must agree to the declaration before submitting' });
    }

    // Check for existing application with same phone
    const existing = await BuyerApplication.findOne({ phone });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An application with this mobile number already exists. Please check your application status.',
        applicationId: existing._id,
      });
    }

    // Verify GST if provided
    let gstVerification = { status: 'NOT_PROVIDED' };
    if (gstNumber) {
      gstVerification = await verifyGstApi(gstNumber, businessName);
    }

    const application = await BuyerApplication.create({
      applicantName,
      phone,
      email,
      profilePhoto,
      buyerType,
      otherBuyerType,
      business: {
        name: businessName,
        businessType,
        gstNumber,
        yearEstablished,
        address: businessAddress,
      },
      location,
      address: {
        villageCity,
        tehsilBlock,
        district,
        state,
        pincode,
      },
      commodities: cleanedCommodities,
      preferredPurchaseRadius,
      documents,
      gstVerification,
      verificationStatus: 'PENDING',
      verified: false,
      submittedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Buyer application submitted successfully. Our team will review your application.',
      applicationId: application._id,
      verificationStatus: application.verificationStatus,
    });
  } catch (error) {
    console.error('[BuyerApplication] Apply error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to submit buyer application. Please try again.' });
  }
}

// @desc    Get my application by phone
// @route   GET /api/buyers/my-application?phone=...
// @access  Public (by phone lookup)
async function getMyApplication(req, res) {
  try {
    const phone = clean(req.query.phone || '');
    if (!isValidIndianMobile(phone)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid mobile number' });
    }

    const application = await BuyerApplication.findOne({ phone });
    if (!application) {
      return res.status(404).json({ success: false, message: 'No buyer application found for this mobile number' });
    }

    // Return safe application data (no private documents for non-admin)
    const safeApp = application.toObject();
    delete safeApp.documents;

    return res.status(200).json({ success: true, application: safeApp });
  } catch (error) {
    console.error('[BuyerApplication] Get my application error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to fetch application status' });
  }
}

// @desc    Update buyer application (for ACTION_REQUIRED resubmission)
// @route   PATCH /api/buyers/my-application/:id
// @access  Public (by phone + application id)
async function updateMyApplication(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const phone = clean(body.phone || '');

    if (!isValidIndianMobile(phone)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid mobile number' });
    }

    const application = await BuyerApplication.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (application.phone !== phone) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this application' });
    }

    // Only allow updates when ACTION_REQUIRED or PENDING
    if (!['ACTION_REQUIRED', 'PENDING'].includes(application.verificationStatus)) {
      return res.status(400).json({ success: false, message: 'This application cannot be updated in its current status' });
    }

    // Update documents if provided
    if (body.documents) {
      const docs = body.documents;
      if (docs.identityProof) application.documents.identityProof = clean(docs.identityProof);
      if (docs.businessProof) application.documents.businessProof = clean(docs.businessProof);
      if (docs.addressProof) application.documents.addressProof = clean(docs.addressProof);
      if (docs.gstCertificate) application.documents.gstCertificate = clean(docs.gstCertificate);
      if (docs.udyamRegistration) application.documents.udyamRegistration = clean(docs.udyamRegistration);
      if (docs.fssaiLicense) application.documents.fssaiLicense = clean(docs.fssaiLicense);
      if (docs.otherDocument) application.documents.otherDocument = clean(docs.otherDocument);
    }

    // Update commodities if provided
    if (Array.isArray(body.commodities) && body.commodities.length > 0) {
      const cleanedCommodities = body.commodities.map((item) => ({
        name: clean(item.name),
        minimumQuantity: item.minimumQuantity ? Number(item.minimumQuantity) : null,
        maximumQuantity: item.maximumQuantity ? Number(item.maximumQuantity) : null,
        unit: clean(item.unit || 'quintal'),
        purchaseFrequency: clean(item.purchaseFrequency || 'as_required'),
        offerPrice: item.offerPrice ? Number(item.offerPrice) : null,
        offerUnit: clean(item.offerUnit || 'quintal'),
        offerQuantity: item.offerQuantity ? Number(item.offerQuantity) : null,
        priceUpdatedAt: item.offerPrice ? new Date() : null,
      })).filter((item) => item.name);
      if (cleanedCommodities.length > 0) application.commodities = cleanedCommodities;
    }

    // Update business info if provided
    if (body.businessName) application.business.name = clean(body.businessName);
    if (body.businessAddress) application.business.address = clean(body.businessAddress);

    // Set status back to UNDER_REVIEW
    application.verificationStatus = 'UNDER_REVIEW';
    application.adminRemarks = '';
    application.reviewedAt = null;

    await application.save();

    return res.status(200).json({
      success: true,
      message: 'Application updated successfully. It is now under review.',
      verificationStatus: application.verificationStatus,
    });
  } catch (error) {
    console.error('[BuyerApplication] Update error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update application' });
  }
}

// @desc    Get all buyer applications (admin)
// @route   GET /api/admin/buyer-applications
// @access  Admin Only
async function getAllApplications(req, res) {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query || {};

    const query = {};
    if (status && status !== 'ALL') {
      query.verificationStatus = status;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { 'business.name': searchRegex },
        { applicantName: searchRegex },
        { phone: searchRegex },
        { 'address.district': searchRegex },
        { buyerType: searchRegex },
      ];
    }

    const cleanLimit = parseInt(limit, 10) || 50;
    const cleanOffset = parseInt(offset, 10) || 0;

    const applications = await BuyerApplication.find(query)
      .select('-documents') // Don't return large document strings in list view
      .sort({ submittedAt: -1 })
      .skip(cleanOffset)
      .limit(cleanLimit);

    const total = await BuyerApplication.countDocuments(query);

    return res.status(200).json({
      success: true,
      count: applications.length,
      total,
      data: applications,
    });
  } catch (error) {
    console.error('[BuyerApplication] Admin list error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to fetch buyer applications' });
  }
}

// @desc    Get single buyer application (admin)
// @route   GET /api/admin/buyer-applications/:id
// @access  Admin Only
async function getApplicationById(req, res) {
  try {
    const application = await BuyerApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Buyer application not found' });
    }
    return res.status(200).json({ success: true, data: application });
  } catch (error) {
    console.error('[BuyerApplication] Admin get by id error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to fetch application' });
  }
}

// @desc    Review application (set UNDER_REVIEW)
// @route   PATCH /api/admin/buyer-applications/:id/review
// @access  Admin Only
async function reviewApplication(req, res) {
  try {
    const application = await BuyerApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Buyer application not found' });
    }

    application.verificationStatus = 'UNDER_REVIEW';
    application.reviewedAt = new Date();
    application.reviewedBy = req.admin?.email || 'admin';

    await application.save();

    return res.status(200).json({ success: true, message: 'Application moved to under review', verificationStatus: application.verificationStatus });
  } catch (error) {
    console.error('[BuyerApplication] Review error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to review application' });
  }
}

// @desc    Approve application
// @route   PATCH /api/admin/buyer-applications/:id/approve
// @access  Admin Only
async function approveApplication(req, res) {
  try {
    const application = await BuyerApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Buyer application not found' });
    }

    application.verificationStatus = 'APPROVED';
    application.verified = true;
    application.reviewedAt = new Date();
    application.reviewedBy = req.admin?.email || 'admin';
    application.adminRemarks = '';

    await application.save();

    return res.status(200).json({ success: true, message: 'Buyer approved successfully.' });
  } catch (error) {
    console.error('[BuyerApplication] Approve error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to approve application' });
  }
}

// @desc    Reject application
// @route   PATCH /api/admin/buyer-applications/:id/reject
// @access  Admin Only
async function rejectApplication(req, res) {
  try {
    const { reason } = req.body || {};
    if (!reason || !clean(reason)) {
      return res.status(400).json({ success: false, message: 'A rejection reason is required' });
    }

    const application = await BuyerApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Buyer application not found' });
    }

    application.verificationStatus = 'REJECTED';
    application.verified = false;
    application.adminRemarks = clean(reason);
    application.reviewedAt = new Date();
    application.reviewedBy = req.admin?.email || 'admin';

    await application.save();

    return res.status(200).json({ success: true, message: 'Buyer application rejected.' });
  } catch (error) {
    console.error('[BuyerApplication] Reject error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to reject application' });
  }
}

// @desc    Request more information
// @route   PATCH /api/admin/buyer-applications/:id/request-information
// @access  Admin Only
async function requestInformation(req, res) {
  try {
    const { message } = req.body || {};
    if (!message || !clean(message)) {
      return res.status(400).json({ success: false, message: 'A message is required when requesting more information' });
    }

    const application = await BuyerApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Buyer application not found' });
    }

    application.verificationStatus = 'ACTION_REQUIRED';
    application.adminRemarks = clean(message);
    application.reviewedAt = new Date();
    application.reviewedBy = req.admin?.email || 'admin';

    await application.save();

    return res.status(200).json({ success: true, message: 'Additional information requested from applicant.' });
  } catch (error) {
    console.error('[BuyerApplication] Request info error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to request more information' });
  }
}

// @desc    Get verified buyers (public directory)
// @route   GET /api/buyers/verified
// @access  Public
async function getVerifiedBuyers(req, res) {
  try {
    const { commodity, state, district, buyerType, limit = 50, offset = 0 } = req.query || {};

    const query = { verificationStatus: 'APPROVED', verified: true };

    if (commodity) {
      query['commodities.name'] = { $regex: new RegExp(commodity.trim(), 'i') };
    }
    if (state) {
      query['address.state'] = { $regex: new RegExp('^' + state.trim() + '$', 'i') };
    }
    if (district) {
      query['address.district'] = { $regex: new RegExp('^' + district.trim() + '$', 'i') };
    }
    if (buyerType) {
      query.buyerType = { $regex: new RegExp('^' + buyerType.trim() + '$', 'i') };
    }

    const cleanLimit = parseInt(limit, 10) || 50;
    const cleanOffset = parseInt(offset, 10) || 0;

    const buyers = await BuyerApplication.find(query)
      .sort({ submittedAt: -1 })
      .skip(cleanOffset)
      .limit(cleanLimit);

    // Return only safe public data
    const safeBuyers = buyers.map((buyer) => ({
      id: buyer._id,
      businessName: buyer.business.name,
      buyerType: buyer.buyerType,
      district: buyer.address.district,
      state: buyer.address.state,
      commodities: buyer.commodities.map((c) => ({
        name: c.name,
        offerPrice: c.offerPrice,
        offerQuantity: c.offerQuantity,
        unit: c.unit,
        purchaseFrequency: c.purchaseFrequency,
        priceUpdatedAt: c.priceUpdatedAt,
      })),
      location: buyer.location,
      verified: buyer.verified,
    }));

    return res.status(200).json({ success: true, count: safeBuyers.length, data: safeBuyers });
  } catch (error) {
    console.error('[BuyerApplication] Verified buyers error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to fetch verified buyers' });
  }
}

// @desc    Get single verified buyer (public)
// @route   GET /api/buyers/verified/:id
// @access  Public
async function getVerifiedBuyerById(req, res) {
  try {
    const buyer = await BuyerApplication.findOne({
      _id: req.params.id,
      verificationStatus: 'APPROVED',
      verified: true,
    });

    if (!buyer) {
      return res.status(404).json({ success: false, message: 'Verified buyer not found' });
    }

    const safeBuyer = {
      id: buyer._id,
      businessName: buyer.business.name,
      buyerType: buyer.buyerType,
      district: buyer.address.district,
      state: buyer.address.state,
      commodities: buyer.commodities.map((c) => ({
        name: c.name,
        offerPrice: c.offerPrice,
        offerQuantity: c.offerQuantity,
        unit: c.unit,
        purchaseFrequency: c.purchaseFrequency,
        priceUpdatedAt: c.priceUpdatedAt,
      })),
      location: buyer.location,
      verified: buyer.verified,
    };

    return res.status(200).json({ success: true, data: safeBuyer });
  } catch (error) {
    console.error('[BuyerApplication] Verified buyer by id error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to fetch verified buyer' });
  }
}

module.exports = {
  applyBuyer,
  getMyApplication,
  updateMyApplication,
  getAllApplications,
  getApplicationById,
  reviewApplication,
  approveApplication,
  rejectApplication,
  requestInformation,
  getVerifiedBuyers,
  getVerifiedBuyerById,
};