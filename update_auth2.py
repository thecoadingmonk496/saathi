import re

with open('backend/controllers/authController.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      role: req.body.role || 'USER',
    });'''

replacement = '''    const hashedPassword = await bcrypt.hash(password, 10);
    const role = req.body.role || 'USER';
    
    let farmerId = undefined;
    let buyerId = undefined;
    
    if (role === 'FARMER') {
      farmerId = FARM-;
    } else if (role === 'BUYER') {
      buyerId = BUYER-;
    }

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      role: role,
      farmerId,
      buyerId,
    });'''

text = text.replace(target, replacement)

fields_target = '''        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,'''

fields_replacement = '''        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        farmerId: user.farmerId,
        buyerId: user.buyerId,
        village: user.village,
        block: user.block,
        district: user.district,
        state: user.state,
        profileImage: user.profileImage,
        landHolding: user.landHolding,
        primaryCrops: user.primaryCrops,
        irrigation: user.irrigation,
        farmingType: user.farmingType,
        annualYield: user.annualYield,
        harvestSeason: user.harvestSeason,
        soilType: user.soilType,
        certifications: user.certifications,
        businessName: user.businessName,
        businessType: user.businessType,
        gstNumber: user.gstNumber,
        targetCrops: user.targetCrops,'''

text = text.replace(fields_target, fields_replacement)

update_profile_target = '''    const { name, mobile, farmerId, village, block, district, state, profileImage, landHolding, primaryCrops, irrigation, farmingType } = req.body;
    
    // Parse name into firstName and lastName if provided
    let firstName, lastName;'''

update_profile_replacement = '''    const { 
      name, mobile, village, block, district, state, profileImage, 
      landHolding, primaryCrops, irrigation, farmingType, annualYield, harvestSeason, soilType, certifications,
      businessName, businessType, gstNumber, targetCrops
    } = req.body;
    
    // Parse name into firstName and lastName if provided
    let firstName, lastName;'''

text = text.replace(update_profile_target, update_profile_replacement)

assignments_target = '''    if (lastName !== undefined) updates.lastName = lastName;
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
    if (farmingType !== undefined) updates.farmingType = farmingType;'''

assignments_replacement = '''    if (lastName !== undefined) updates.lastName = lastName;
    if (mobile) updates.phone = mobile;
    if (village !== undefined) updates.village = village;
    if (block !== undefined) updates.block = block;
    if (district !== undefined) updates.district = district;
    if (state !== undefined) updates.state = state;
    if (profileImage !== undefined) updates.profileImage = profileImage;
    if (landHolding !== undefined) updates.landHolding = landHolding;
    if (primaryCrops !== undefined) updates.primaryCrops = primaryCrops;
    if (irrigation !== undefined) updates.irrigation = irrigation;
    if (farmingType !== undefined) updates.farmingType = farmingType;
    if (annualYield !== undefined) updates.annualYield = annualYield;
    if (harvestSeason !== undefined) updates.harvestSeason = harvestSeason;
    if (soilType !== undefined) updates.soilType = soilType;
    if (certifications !== undefined) updates.certifications = certifications;
    if (businessName !== undefined) updates.businessName = businessName;
    if (businessType !== undefined) updates.businessType = businessType;
    if (gstNumber !== undefined) updates.gstNumber = gstNumber;
    if (targetCrops !== undefined) updates.targetCrops = targetCrops;'''

text = text.replace(assignments_target, assignments_replacement)

# Also fix the duplicate fields issue from verifyOTP
verify_fields_target = '''        role: user.role,
        farmerId: user.farmerId,
        buyerId: user.buyerId,
        village: user.village,
        block: user.block,
        district: user.district,
        state: user.state,
        profileImage: user.profileImage,
        landHolding: user.landHolding,
        primaryCrops: user.primaryCrops,
        irrigation: user.irrigation,
        farmingType: user.farmingType,
        annualYield: user.annualYield,
        harvestSeason: user.harvestSeason,
        soilType: user.soilType,
        certifications: user.certifications,
        businessName: user.businessName,
        businessType: user.businessType,
        gstNumber: user.gstNumber,
        targetCrops: user.targetCrops,
        farmerId: user.farmerId,
        village: user.village,
        block: user.block,
        district: user.district,
        state: user.state,
        profileImage: user.profileImage,
        landHolding: user.landHolding,
        primaryCrops: user.primaryCrops,
        irrigation: user.irrigation,
        farmingType: user.farmingType,'''
text = text.replace(verify_fields_target, fields_replacement)

with open('backend/controllers/authController.js', 'w', encoding='utf-8') as f:
    f.write(text)
