const fs = require('fs');
const text = "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="; // dummy wav
const buf = Buffer.from(text, 'base64');
console.log(buf.slice(0, 16).toString());
