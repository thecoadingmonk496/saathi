const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const otpStore = new Map();
const generateOtp = () => '123456';

const createToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

async function registerUser(req, res) {
  try {
    const { firstName, lastName, email, phone, password } = req.body || {};

    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ message: 'All fields (First name, Last name, Email, Phone, and Password) are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'JWT_SECRET is not configured on server' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim().replace(/\s+/g, '');

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });

    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        return res.status(400).json({ message: 'An account with this email address already exists.' });
      }
      if (existingUser.phone === normalizedPhone) {
        return res.status(400).json({ message: 'An account with this mobile number already exists.' });
      }
      return res.status(400).json({ message: 'A user with this email or phone already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      role: req.body.role || 'USER',
    });

    return res.status(201).json({
      message: 'User registered successfully',
      token: createToken(user._id.toString()),
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'Email or phone';
      return res.status(400).json({ message: `An account with this ${field} already exists.` });
    }
    return res.status(500).json({ message: error.message || 'Unable to register user' });
  }
}

async function loginUser(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    const passwordMatches = user && await bcrypt.compare(password, user.password);

    if (!user || !passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.status(200).json({
      message: 'Login successful',
      token: createToken(user._id.toString()),
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ message: 'Unable to log in' });
  }
}

async function sendOtp(req, res) {
  try {
    const { mobileNumber } = req.body;
    if (!mobileNumber || !/^[6-9]\d{9}$/.test(mobileNumber)) {
      return res.status(400).json({ success: false, message: 'Invalid mobile number' });
    }

    const user = await User.findOne({ phone: mobileNumber });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Please register, no user found' });
    }

    const otp = generateOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(mobileNumber, { otp, expiresAt });
    console.log(`[DEV] OTP for ${mobileNumber} is ${otp}`);

    return res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to send OTP' });
  }
}

async function verifyOtp(req, res) {
  try {
    const { mobileNumber, otp } = req.body;
    if (!mobileNumber || !otp) {
      return res.status(400).json({ success: false, message: 'Mobile number and OTP are required' });
    }

    const storedData = otpStore.get(mobileNumber);
    if (!storedData) {
      return res.status(400).json({ success: false, message: 'No OTP requested for this number' });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(mobileNumber);
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    otpStore.delete(mobileNumber);
    const user = await User.findOne({ phone: mobileNumber });

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      token: createToken(user._id.toString()),
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to verify OTP' });
  }
}

async function updateProfile(req, res) {
  try {
    const userId = req.user._id; // from authMiddleware
    const { name, mobile, farmerId, village, block, district, state, profileImage, landHolding, primaryCrops, irrigation, farmingType } = req.body;
    
    // Parse name into firstName and lastName if provided
    let firstName, lastName;
    if (name) {
      const nameParts = name.trim().split(' ');
      firstName = nameParts[0];
      lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    }

    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (mobile) updates.phone = mobile;
    if (farmerId !== undefined) updates.farmerId = farmerId;
    if (village !== undefined) updates.village = village;
    if (block !== undefined) updates.block = block;
    if (district !== undefined) updates.district = district;
    if (state !== undefined) updates.state = state;
    if (profileImage !== undefined) updates.profileImage = profileImage;
    if (landHolding !== undefined) updates.landHolding = landHolding;
    if (primaryCrops !== undefined) updates.primaryCrops = primaryCrops;
    if (irrigation !== undefined) updates.irrigation = irrigation;
    if (farmingType !== undefined) updates.farmingType = farmingType;

    const user = await User.findByIdAndUpdate(userId, updates, { new: true });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        farmerId: user.farmerId,
        village: user.village,
        block: user.block,
        district: user.district,
        state: user.state,
        profileImage: user.profileImage,
        landHolding: user.landHolding,
        primaryCrops: user.primaryCrops,
        irrigation: user.irrigation,
        farmingType: user.farmingType,
      }
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update profile' });
  }
}

module.exports = { registerUser, loginUser, sendOtp, verifyOtp, updateProfile };
