import { mockBuyers, mockCrops, mockGovernmentUpdates, mockPriceHistory, mockSupplyChain } from './mockData';

const cropAliasMap = {
  wheat: ['wheat', 'गेहूं', 'गेहू', 'कणक', 'গম', 'गोधूमू', 'గోధుమలు', 'గోధుమ', 'கோதுமை'],
  paddy: ['paddy', 'rice', 'धान', 'चावल', 'तांदूळ', 'ধান', 'వరి', 'அரிசி', 'நெல்'],
  maize: ['maize', 'corn', 'मक्का', 'मक्की', 'मका', 'ভুট্টা', 'మొక్కజొన్న', 'మొక్క జొన్న', 'సోలం', 'మొక్కజొన్నలు'],
  mustard: ['mustard', 'सरसों', 'राई', 'मोहरी', 'সরিষা', 'ఆవాలు', 'கடுகு'],
  chickpea: ['chickpea', 'gram', 'चना', 'चने', 'हरभरा', 'ছোলা', 'శనగలు', 'శనగ', 'கொண்டைக் கடலை', 'சுண்டல்'],
};

const navigationMap = [
  { path: '/buyers', keywords: ['buyer', 'buyers', 'खरीदार', 'खरेदीदार', 'ক্রেতা', 'కొనుగోలుదారులు', 'కొనుగోలుదారు', 'வாங்குபவர்', 'खरीददार'] },
  { path: '/prices', keywords: ['price', 'prices', 'rate', 'bhav', 'भाव', 'कीमत', 'दर', 'দাম', 'ధరలు', 'ధర', 'விலை', 'விகிதம்'] },
  { path: '/explorer', keywords: ['explorer', 'journey', 'chain', 'supply', 'यात्रा', 'सप्लाई', 'अन्वेषक', 'सप्लाई चेन', 'சப்ளை'] },
  { path: '/government', keywords: ['govt', 'government', 'scheme', 'yojana', 'सरकारी', 'योजना', 'स्कीम', 'ਸਰਕਾਰੀ', 'పథకం', 'அரசு'] },
  { path: '/profile', keywords: ['profile', 'profile', 'प्रोफ़ाइल', 'प्रोफाइल', 'विवरण'] },
];

function cleanQuery(text) {
  return (text || '').toLowerCase().trim();
}

function findCrop(transcript) {
  const clean = cleanQuery(transcript);
  for (const [cropKey, aliases] of Object.entries(cropAliasMap)) {
    if (aliases.some((alias) => clean.includes(alias))) {
      return mockCrops.find((c) => c.name.toLowerCase() === cropKey);
    }
  }
  return null;
}

function findNavigationPath(transcript) {
  const clean = cleanQuery(transcript);
  for (const item of navigationMap) {
    if (item.keywords.some((kw) => clean.includes(kw))) {
      return item.path;
    }
  }
  return null;
}

function formatRupees(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

export function processVoiceQuery(transcript, language = 'English') {
  const clean = cleanQuery(transcript);
  const matchedCrop = findCrop(clean);
  const navPath = findNavigationPath(clean);
  const langCode = (language || 'English').toLowerCase();

  const isHindi = langCode.includes('hi') || langCode.includes('hindi');
  const isMarathi = langCode.includes('mr') || langCode.includes('marathi');
  const isPunjabi = langCode.includes('pa') || langCode.includes('punjabi');
  const isBengali = langCode.includes('bn') || langCode.includes('bengali');
  const isTelugu = langCode.includes('te') || langCode.includes('telugu');
  const isTamil = langCode.includes('ta') || langCode.includes('tamil');

  if (['hello', 'hi', 'namaste', 'नमस्ते', 'नमस्कार', 'सत श्री अकाल', 'வணக்கம்', 'నమస్కారం'].some((g) => clean.includes(g))) {
    let msg = `Hello! I am SAATHI, your AI Voice assistant. Ask me about crop prices, active buyers, or market supply chain.`;
    if (isHindi) msg = `नमस्ते! मैं साथी हूँ, आपका एआई वॉयस सहायक। आप मुझसे फसल के भाव, खरीदार या आपूर्ति श्रृंखला के बारे में पूछ सकते हैं।`;
    if (isMarathi) msg = `नमस्कार! मी साथी आहे, तुमचा AI व्हॉइस सहाय्यक. मला पीक भाव, खरेदीदार किंवा पुरवठा साखळीबद्दल विचारा.`;
    if (isPunjabi) msg = `ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ! ਮੈਂ ਸਾਥੀ ਹਾਂ। ਤੁਸੀਂ ਮੇਰੇ ਤੋਂ ਫਸਲਾਂ ਦੇ ਭਾਅ, ਖਰੀਦਦਾਰਾਂ ਜਾਂ ਬਾਜ਼ਾਰ ਬਾਰੇ ਪੁੱਛ ਸਕਦੇ ਹੋ।`;
    if (isBengali) msg = `নমস্কার! আমি সাথী, আপনার এআই ভয়েস সহকারী। ফসলের দাম বা ক্রেতাদের সম্পর্কে জিজ্ঞাসা করুন।`;
    if (isTelugu) msg = `నమస్కారం! నేను సార్థి AI వాయిస్ అసిస్టెంట్. పంట ధరలు లేదా కొనుగోలుదారుల గురించి నన్ను అడగండి.`;
    if (isTamil) msg = `வணக்கம்! நான் சாதி AI குரல் உதவியாளர். பயிர் விலைகள் அல்லது வாங்குபவர்கள் பற்றி என்னிடம் கேளுங்கள்.`;

    return { response: msg, action: null };
  }

  if (['buyer', 'buyers', 'buyer list', 'खरीदार', 'खरीददार', 'खरेदीदार', 'కొనుగోలుదారు', 'ক্রেতা', 'வாங்குபவர்'].some((k) => clean.includes(k))) {
    if (matchedCrop) {
      const cropBuyers = mockBuyers.filter((b) => b.cropRequired.toLowerCase() === matchedCrop.name.toLowerCase());
      if (cropBuyers.length > 0) {
        const topBuyer = cropBuyers[0];
        let msg = `${cropBuyers.length} active buyers found for ${matchedCrop.name}. Top buyer is ${topBuyer.name} offering ${formatRupees(topBuyer.pricePerQtl)}/quintal within ${topBuyer.distance} km.`;
        if (isHindi) msg = `${matchedCrop.name} के लिए ${cropBuyers.length} सक्रिय खरीदार मिले। सबसे अच्छा प्रस्ताव ${topBuyer.name} का है: ${formatRupees(topBuyer.pricePerQtl)}/क्विंटल, ${topBuyer.distance} किमी दूर।`;
        return { response: msg, action: { type: 'NAVIGATE', path: '/buyers' } };
      }
    }

    let msg = `Found ${mockBuyers.length} active buyers registered near your district. Navigating to Buyer Discovery.`;
    if (isHindi) msg = `आपकी मंडी के पास ${mockBuyers.length} सक्रिय खरीदार मिले हैं। खरीदार खोज पेज पर ले जाया जा रहा है।`;
    return { response: msg, action: { type: 'NAVIGATE', path: '/buyers' } };
  }

  if (['chain', 'journey', 'explorer', 'transport', 'सप्लाई', 'यात्रा', 'अन्वेषक', 'फार्म', 'फार्म टू मार्केट'].some((k) => clean.includes(k))) {
    if (matchedCrop) {
      const chain = mockSupplyChain.find((s) => s.cropId === matchedCrop.id);
      if (chain) {
        let msg = `${matchedCrop.name} journey: Farmer cost is ${formatRupees(chain.farmerCost)}, Wholesaler price is ${formatRupees(chain.wholesalerCost)}, and final Consumer price is ${formatRupees(chain.consumerPrice)}.`;
        if (isHindi) msg = `${matchedCrop.name} की आपूर्ति यात्रा: किसान लागत ${formatRupees(chain.farmerCost)}, थोक मूल्य ${formatRupees(chain.wholesalerCost)}, और अंतिम उपभोक्ता मूल्य ${formatRupees(chain.consumerPrice)} है।`;
        return { response: msg, action: { type: 'NAVIGATE', path: '/explorer' } };
      }
    }
    let msg = `Showing crop supply chain and price journey from farm to consumer.`;
    if (isHindi) msg = `खेत से उपभोक्ता तक फसल की मूल्य यात्रा दिखाई जा रही है।`;
    return { response: msg, action: { type: 'NAVIGATE', path: '/explorer' } };
  }

  if (matchedCrop || ['price', 'prices', 'rate', 'bhav', 'mandi', 'भाव', 'कीमत', 'दर', 'दाम', 'मंडी'].some((k) => clean.includes(k))) {
    const targetCrop = matchedCrop || mockCrops[0]; 
    const priceRecord = mockPriceHistory.find((p) => p.cropId === targetCrop.id);

    if (priceRecord) {
      let msg = `Current wholesale price for ${targetCrop.name} at ${priceRecord.mandi} is ${formatRupees(priceRecord.wholesale)} per quintal (Retail: ${formatRupees(priceRecord.retail)}, MSP: ${formatRupees(priceRecord.msp)}).`;
      if (isHindi) msg = `${priceRecord.mandi} में ${targetCrop.name} का वर्तमान थोक भाव ${formatRupees(priceRecord.wholesale)} प्रति क्विंटल है (खुदरा: ${formatRupees(priceRecord.retail)}, एमएसपी: ${formatRupees(priceRecord.msp)})।`;
      if (isMarathi) msg = `${priceRecord.mandi} मध्ये ${targetCrop.name} चा सध्याचा घाऊक भाव ${formatRupees(priceRecord.wholesale)} प्रति क्विंटल आहे.`;
      if (isPunjabi) msg = `${priceRecord.mandi} ਵਿੱਚ ${targetCrop.name} ਦਾ ਮੌਜੂਦਾ ਥੋਕ ਭਾਅ ${formatRupees(priceRecord.wholesale)} ਪ੍ਰਤੀ ਕੁਇੰਟਲ ਹੈ।`;
      if (isBengali) msg = `${priceRecord.mandi}-এ ${targetCrop.name}-এর পাইকারি দাম প্রতি কুইন্টাল ${formatRupees(priceRecord.wholesale)}।`;
      if (isTelugu) msg = `${priceRecord.mandi} లో ${targetCrop.name} హోల్‌సేల్ ధర క్వింటాలుకు ${formatRupees(priceRecord.wholesale)}.`;
      if (isTamil) msg = `${priceRecord.mandi} இல் ${targetCrop.name} மொத்த விலை குவிண்டாலுக்கு ${formatRupees(priceRecord.wholesale)}.`;

      return {
        response: msg,
        action: navPath ? { type: 'NAVIGATE', path: navPath } : null,
      };
    }
  }

  if (['scheme', 'government', 'govt', 'yojana', 'advisory', 'सरकारी', 'योजना', 'ऑफिसर'].some((k) => clean.includes(k))) {
    const topUpdate = mockGovernmentUpdates[0];
    let msg = `Government notice: ${topUpdate.title} - ${topUpdate.description}`;
    if (isHindi) msg = `सरकारी सूचना: ${topUpdate.title} - ${topUpdate.description}`;
    return { response: msg, action: { type: 'NAVIGATE', path: '/government' } };
  }

  if (navPath) {
    let msg = `Opening requested page.`;
    if (isHindi) msg = `मांगी गई जानकारी का पेज खोला जा रहा है।`;
    return { response: msg, action: { type: 'NAVIGATE', path: navPath } };
  }

  let defaultMsg = `I heard: "${transcript}". You can ask about wheat or paddy prices, active buyers, or farm-to-consumer supply chains.`;
  if (isHindi) defaultMsg = `मैंने सुना: "${transcript}"। आप गेहूं या धान के भाव, खरीदार या आपूर्ति श्रृंखला के बारे में पूछ सकते हैं।`;

  return { response: defaultMsg, action: null };
}
