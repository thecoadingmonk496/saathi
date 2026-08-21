const crypto = require('crypto');

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== 'object') return value;

  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = sortObject(value[key]);
    return result;
  }, {});
}

function canonicalize(value) {
  return JSON.stringify(sortObject(value));
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(canonicalize(value)).digest('hex');
}

function toBytes32Hash(hexHash) {
  return `0x${hexHash}`;
}

module.exports = { canonicalize, sha256Hex, toBytes32Hash };
