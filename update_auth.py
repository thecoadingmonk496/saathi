import re

with open('backend/controllers/authController.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Update returned fields
fields_target = '''        targetCrops: user.targetCrops,'''

fields_replacement = '''        targetCrops: user.targetCrops,
        isPublicProfile: user.isPublicProfile,
        documents: user.documents,'''

text = text.replace(fields_target, fields_replacement)

# Update req.body destructuring
destruct_target = '''      businessName, businessType, gstNumber, targetCrops
    } = req.body;'''

destruct_replacement = '''      businessName, businessType, gstNumber, targetCrops,
      isPublicProfile, documents
    } = req.body;'''

text = text.replace(destruct_target, destruct_replacement)

# Update assignments
assign_target = '''    if (targetCrops !== undefined) updates.targetCrops = targetCrops;'''

assign_replacement = '''    if (targetCrops !== undefined) updates.targetCrops = targetCrops;
    if (isPublicProfile !== undefined) updates.isPublicProfile = isPublicProfile;
    if (documents !== undefined) updates.documents = documents;'''

text = text.replace(assign_target, assign_replacement)

with open('backend/controllers/authController.js', 'w', encoding='utf-8') as f:
    f.write(text)
