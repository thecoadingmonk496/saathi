import { useMemo } from 'react';
import { translations } from '../utils/translations';
import hindiStaticInterface from '../utils/hindi-interface.generated.json';
import { useUser } from '../context/UserContext';

const hindiInterface = {
  'About': 'परिचय',
  'About SAATHI': 'साथी के बारे में',
  'Accept': 'स्वीकार करें',
  'Account': 'खाता',
  'Action': 'कार्रवाई',
  'Active Translation & Voice (12)': 'सक्रिय अनुवाद और आवाज़ (12)',
  'Admin': 'व्यवस्थापक',
  'All 22 Scheduled Indian Languages': 'भारत की सभी 22 अनुसूचित भाषाएँ',
  'All Categories': 'सभी श्रेणियाँ',
  'All Languages (22) →': 'सभी भाषाएँ (22) →',
  'Amount': 'राशि',
  'Apply Language / भाषा लागू करें': 'भाषा लागू करें',
  'Ask': 'पूछें',
  'Ask Questions in Your Language': 'अपनी भाषा में सवाल पूछें',
  'Ask SAATHI': 'साथी से पूछें',
  'Back': 'वापस',
  'Back to Dashboard': 'डैशबोर्ड पर वापस जाएँ',
  'Browse Buyers': 'खरीदार खोजें',
  'Cancel': 'रद्द करें',
  'Change Region': 'क्षेत्र बदलें',
  'Choose Language / भाषा चुनें': 'भाषा चुनें',
  'Choose your preferred regional language for SAATHI portal': 'साथी पोर्टल के लिए अपनी पसंदीदा क्षेत्रीय भाषा चुनें',
  'Close': 'बंद करें',
  'Coming Soon': 'जल्द आ रहा है',
  'Community feedback and marketplace trust.': 'समुदाय की राय और बाज़ार में भरोसा।',
  'Commodity': 'कृषि उत्पाद',
  'Create Account': 'खाता बनाएँ',
  'Crop Journey': 'फसल की यात्रा',
  'Dashboard': 'डैशबोर्ड',
  'Data Sources': 'डेटा स्रोत',
  'Explore Market Journey': 'बाज़ार की यात्रा देखें',
  'Find Buyers': 'खरीदार खोजें',
  'Home': 'होम',
  'Latest Price': 'नवीनतम कीमत',
  'Location': 'स्थान',
  'Login': 'लॉग इन',
  'Logout': 'लॉग आउट',
  'Market Prices': 'बाज़ार भाव',
  'Market Journey': 'बाज़ार की यात्रा',
  'Mandi Information': 'मंडी की जानकारी',
  'Mandi Location': 'मंडी का स्थान',
  'Mandi Name': 'मंडी का नाम',
  'Market Type': 'बाज़ार का प्रकार',
  'Multi-Stage Crop Distribution': 'फसल का बहु-स्तरीय वितरण',
  'No reviews yet.': 'अभी तक कोई समीक्षा नहीं है।',
  'Open Now': 'अभी खुला है',
  'Profile': 'प्रोफ़ाइल',
  'Read community feedback and marketplace trust reviews.': 'समुदाय की राय और बाज़ार से जुड़ी समीक्षाएँ पढ़ें।',
  'Read Reviews': 'समीक्षाएँ पढ़ें',
  'Register': 'पंजीकरण करें',
  'Reviews': 'समीक्षाएँ',
  'REVIEWS & EXPERIENCES': 'समीक्षाएँ और अनुभव',
  'Search': 'खोजें',
  'Select any active language': 'कोई भी सक्रिय भाषा चुनें',
  'Select Category': 'श्रेणी चुनें',
  'Select Language': 'भाषा चुनें',
  'Sign In': 'साइन इन करें',
  'Stage 1': 'चरण 1',
  'Stage 2': 'चरण 2',
  'Stage 3': 'चरण 3',
  'Stage 4': 'चरण 4',
  'Stage 5': 'चरण 5',
  'Status': 'स्थिति',
  'Tap to Speak': 'बोलने के लिए दबाएँ',
  'Trend': 'रुझान',
  'Trending Searches :': 'लोकप्रिय खोजें:',
  'Up': 'बढ़त',
  'View Market Prices': 'बाज़ार भाव देखें',
  'Wheat Prices': 'गेहूँ के भाव',
  'A visual overview of the standard path agricultural commodities take from harvest to consumer.': 'फसल कटाई से उपभोक्ता तक कृषि उत्पादों की सामान्य यात्रा का दृश्य।',
  'Learn how commodity handling, transport, and intermediary margins operate across each supply chain tier.': 'जानें कि आपूर्ति श्रृंखला के हर चरण में कृषि उत्पादों का प्रबंधन, परिवहन और बिचौलियों का मार्जिन कैसे काम करता है।',
  'Farmer': 'किसान',
  'Mandi': 'मंडी',
  'Wholesaler': 'थोक विक्रेता',
  'Distributor': 'वितरक',
  'Retailer': 'खुदरा विक्रेता',
  'Consumer': 'उपभोक्ता',
  'Cultivation & Harvest': 'खेती और कटाई',
  'First Point of Sale': 'बिक्री का पहला केंद्र',
  'Bulk Aggregation': 'बड़ी मात्रा में संग्रह',
  'Regional Logistics': 'क्षेत्रीय परिवहन',
  'Consumer Market': 'उपभोक्ता बाज़ार',
  'Suggested Queries:': 'सुझाए गए सवाल:',
  "What is today's wheat price?": 'आज गेहूँ का भाव क्या है?',
  'Find buyers near me': 'मेरे पास खरीदार खोजें',
  'Nearby mandis': 'आस-पास की मंडियाँ',
  'Use natural voice or typed questions to search for mandi rates, buyers, and commodity information across the platform.': 'मंडी भाव, खरीदार और कृषि उत्पादों की जानकारी खोजने के लिए बोलकर या लिखकर सवाल पूछें।',
  'Type an agricultural question...': 'खेती से जुड़ा सवाल लिखें...',
  'Only Farmers & Buyers can review': 'समीक्षा केवल किसान और खरीदार दे सकते हैं',
  'Write a Review': 'समीक्षा लिखें',
  'Log in to Review': 'समीक्षा देने के लिए लॉग इन करें',
  'FARMER-BUYER REVIEWS': 'किसान-खरीदार समीक्षाएँ',
  'User experiences will appear here as the SAATHI community grows. Be the first to leave a review!': 'साथी समुदाय के बढ़ने के साथ लोगों के अनुभव यहाँ दिखाई देंगे। समीक्षा लिखने वाले पहले व्यक्ति बनें!',
  'Unlock Mandi Directory': 'मंडी निर्देशिका देखें',
  'Unlock the Full Mandi Network': 'मंडी नेटवर्क की पूरी जानकारी पाएँ',
  'Wholesale Market': 'थोक बाज़ार',
  'Location:': 'स्थान:',
  'Commodity:': 'कृषि उत्पाद:',
  'Email': 'ईमेल',
  'Phone': 'फ़ोन',
  'Name': 'नाम',
  'Search SAATHI': 'साथी में खोजें',
  'SAATHI Home': 'साथी होम',
  'SAATHI Logo': 'साथी का लोगो',
  'Accessibility': 'सुलभता',
  'Share': 'साझा करें',
  'Color': 'रंग',
  'Accessibility Tools': 'सुलभता के साधन',
  'Choose Primary Theme': 'मुख्य रंग-थीम चुनें',
  'High Contrast': 'ज़्यादा कंट्रास्ट',
  'Normal': 'सामान्य',
  'Increase Text': 'अक्षर बड़े करें',
  'Decrease Text': 'अक्षर छोटे करें',
  'Reset Text': 'अक्षर रीसेट करें',
  'Text Spacing': 'अक्षरों के बीच दूरी',
  'Line Height': 'पंक्ति की ऊँचाई',
  'Hide Images': 'तस्वीरें छिपाएँ',
  'Big Cursor': 'बड़ा कर्सर',
  'Read Page (Voice)': 'पृष्ठ सुनें',
  'Reset All': 'सब रीसेट करें',
  'Search crops, mandis, buyers or services...': 'फसल, मंडी, खरीदार या सेवाएँ खोजें...',
  'Select your state': 'अपना राज्य चुनें',
  'District': 'ज़िला',
  'State': 'राज्य',
  'Market Information': 'बाज़ार की जानकारी',
  'Agricultural Market Platform': 'कृषि बाज़ार मंच',
  'Welcome back': 'वापसी पर स्वागत है',
  'Your member account provides access to SAATHI platform features.': 'आपका सदस्य खाता साथी मंच की सुविधाओं का उपयोग देता है।',
  'Go to Profile': 'प्रोफ़ाइल पर जाएँ',
  'Unlock Full Market Data': 'बाज़ार की पूरी जानकारी पाएँ',
  'PENDING': 'लंबित',
  'APPROVED': 'स्वीकृत',
  'REJECTED': 'अस्वीकृत',
  'COMPLETED': 'पूरा हुआ',
  'CANCELLED': 'रद्द',
  'PUBLISHED': 'प्रकाशित',
  'PENDING_REVIEW': 'समीक्षा लंबित',
  'BUYER_PAYMENT_PENDING': 'खरीदार का भुगतान लंबित',
};

const keepOriginalText = [
  'Wheat', 'wheat', 'Paddy', 'paddy', 'Rice', 'rice', 'Maize', 'maize', 'Corn', 'corn',
  'Potato', 'potato', 'Cotton', 'cotton', 'Pulses', 'pulses', 'Vegetables', 'vegetables',
  'Onion', 'onion', 'Tomato', 'tomato', 'Soybean', 'soybean', 'Mustard', 'mustard',
  'Sugarcane', 'sugarcane', 'Chickpea', 'chickpea', 'Lentil', 'lentil', 'Millet', 'millet',
  'Jowar', 'jowar', 'Bajra', 'bajra', 'Ragi', 'ragi', 'Barley', 'barley', 'Groundnut', 'groundnut',
  'Turmeric', 'turmeric', 'Chilli', 'chilli', 'Garlic', 'garlic', 'Ginger', 'ginger',
  'Cumin', 'cumin', 'Coriander', 'coriander', 'Tea', 'tea', 'Coffee', 'coffee',
  'Banana', 'banana', 'Mango', 'mango', 'Apple', 'apple', 'Grape', 'grape', 'Orange', 'orange',
  'Cotton (कपास)', 'Bihar', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu',
  'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andhra Pradesh', 'Assam',
  'Chhattisgarh', 'Goa', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Sikkim', 'Tripura',
  'Arunachal Pradesh', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

const literalMaps = new Map();

function getLiteralMap(language) {
  if (literalMaps.has(language)) return literalMaps.get(language);

  const map = new Map();
  const source = translations.English || {};
  const target = translations[language] || {};
  Object.entries(source).forEach(([key, english]) => {
    const translated = target[key];
    if (typeof english === 'string' && typeof translated === 'string' && english !== translated) {
      map.set(english, translated);
    }
  });

  if (language === 'Hindi') {
    Object.entries(hindiStaticInterface).forEach(([english, hindi]) => map.set(english, hindi));
    Object.entries(hindiInterface).forEach(([english, hindi]) => map.set(english, hindi));
    keepOriginalText.forEach((term) => map.set(term, term));
  }

  literalMaps.set(language, map);
  return map;
}

export function translateInterfaceText(text, language) {
  const map = getLiteralMap(language);
  const normalized = text.replace(/\s+/g, ' ').trim();
  const translated = map.get(normalized);
  if (!translated) return text;

  const leading = text.match(/^\s*/)?.[0] || '';
  const trailing = text.match(/\s*$/)?.[0] || '';
  return `${leading}${translated}${trailing}`;
}

export default function LocalizedText({ text }) {
  const { preferredLanguage } = useUser();
  const localized = useMemo(
    () => translateInterfaceText(text, preferredLanguage || 'English'),
    [text, preferredLanguage]
  );
  return localized;
}
