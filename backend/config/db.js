const dns = require('dns');
const mongoose = require('mongoose');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  // Ignored in environments where DNS cannot be overridden
}

let cachedPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not configured in environment variables');
  }

  if (!cachedPromise) {
    cachedPromise = mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
    }).then((m) => {
      console.log('MongoDB connected successfully');
      return m;
    }).catch((err) => {
      cachedPromise = null;
      throw err;
    });
  }

  return cachedPromise;
}

module.exports = connectDB;
