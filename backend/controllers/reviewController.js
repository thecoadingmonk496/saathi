const Review = require('../models/Review');
const User = require('../models/User');

// Create a new review
exports.createReview = async (req, res) => {
  try {
    const { revieweeId, rating, reviewText } = req.body;
    const reviewerId = req.user.id;

    // Check if reviewer is allowed to review (only FARMER or BUYER)
    const reviewer = await User.findById(reviewerId);
    if (!reviewer || (reviewer.role !== 'FARMER' && reviewer.role !== 'BUYER')) {
      return res.status(403).json({ success: false, message: 'Only Farmers and Buyers are allowed to write reviews' });
    }

    if (!revieweeId || !rating || !reviewText) {
      return res.status(400).json({ success: false, message: 'Please provide all fields' });
    }

    if (reviewerId === revieweeId) {
      return res.status(400).json({ success: false, message: 'You cannot review yourself' });
    }

    // Verify reviewee exists
    const reviewee = await User.findById(revieweeId);
    if (!reviewee) {
      return res.status(404).json({ success: false, message: 'User to review not found' });
    }

    const review = await Review.create({
      reviewer: reviewerId,
      reviewee: revieweeId,
      rating,
      reviewText
    });

    // Populate reviewer info to return
    await review.populate('reviewer', 'firstName lastName role');
    await review.populate('reviewee', 'firstName lastName role');

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all reviews (for global feed)
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .populate('reviewer', 'firstName lastName role')
      .populate('reviewee', 'firstName lastName role');
      
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get reviews for a specific user
exports.getUserReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('reviewer', 'firstName lastName role');
      
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all users for review dropdown (excluding self)
exports.getReviewableUsers = async (req, res) => {
  try {
    const allUsers = await User.find({});
    console.log('Total users in DB:', allUsers.length);
    console.log('Roles in DB:', allUsers.map(u => u.role));
    
    // For demo purposes, return ALL users except self.
    // If the user is the ONLY user in the DB, return themself just so the dropdown isn't empty!
    let users = await User.find({ _id: { $ne: req.user.id } }).select('firstName lastName role');
    
    if (users.length === 0) {
       users = await User.find({}).select('firstName lastName role');
    }
    
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching reviewable users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
