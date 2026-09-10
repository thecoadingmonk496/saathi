const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const BuyerApplication = require('../models/BuyerApplication'); // Assuming we update a deal or application

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 1. Create an Order
router.post('/create-order', async (req, res) => {
    try {
        const { amount, dealId } = req.body; 
        
        const options = {
            amount: Math.round(amount * 100), // Razorpay expects amount in paise (smallest currency unit)
            currency: "INR",
            receipt: `receipt_${dealId}`, 
        };

        const order = await razorpay.orders.create(options);
        res.json({ success: true, order });
    } catch (error) {
        console.error("Razorpay Create Order Error:", error);
        res.status(500).json({ success: false, message: "Error creating order" });
    }
});

// 2. Verify the Payment Signature (after UI payment success)
router.post('/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, dealId } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Payment is authentic!
            // We just return success here, and the frontend will call the existing `pay-buyer-escrow` endpoint to update the DB.
            res.json({ success: true, message: "Payment verified successfully" });
        } else {
            res.status(400).json({ success: false, message: "Invalid signature" });
        }
    } catch (error) {
        console.error("Razorpay Verify Payment Error:", error);
        res.status(500).json({ success: false, message: "Server error during verification" });
    }
});

module.exports = router;
