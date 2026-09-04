import re

with open('backend/models/User.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''    targetCrops: { type: String, trim: true },'''

replacement = '''    targetCrops: { type: String, trim: true },
    
    // Privacy
    isPublicProfile: { type: Boolean, default: true },
    
    // Document Vault
    documents: {
      aadhaar: { type: String },
      gstCertificate: { type: String },
      otherDocument: { type: String }
    },'''

text = text.replace(target, replacement)

with open('backend/models/User.js', 'w', encoding='utf-8') as f:
    f.write(text)
