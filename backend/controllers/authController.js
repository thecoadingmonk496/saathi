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
      return res.status(400).json({ message: 'First name, last name, email, phone, and password are required' });
    }

    if (password.length < 6 || !process.env.JWT_SECRET) {
      if (!process.env.JWT_SECRET) {
        return res.status(500).json({ message: 'JWT_SECRET is not configured' });
      }
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });

    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email or phone already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
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
      },
    });
  } catch (error) {
    console.error('Register error:', error.message);
    return res.status(500).json({ message: 'Unable to register user' });
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
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to verify OTP' });
  }
}

module.exports = { registerUser, loginUser, sendOtp, verifyOtp };
