export const locationOptions = {
  'Uttar Pradesh': {
    'Chandauli': ['Chakia', 'Mughalsarai', 'Sakaldiha'],
    'Gautam Buddha Nagar': ['Noida', 'Greater Noida', 'Dadri'],
    'Varanasi': ['Varanasi', 'Pindra', 'Rohaniya'],
  },
  'Madhya Pradesh': {
    'Bhopal': ['Berasia', 'Bhopal'],
    'Indore': ['Depalpur', 'Mhow', 'Indore'],
    'Jabalpur': ['Panagar', 'Sihora', 'Jabalpur'],
  },
  'Maharashtra': {
    'Pune': ['Pune', 'Baramati', 'Junnar'],
    'Nashik': ['Nashik', 'Sinnar', 'Dindori'],
    'Nagpur': ['Nagpur', 'Kamptee', 'Hingna'],
  },
  'Punjab': {
    'Amritsar': ['Amritsar', 'Ajnala', 'Attari'],
    'Ludhiana': ['Ludhiana', 'Jagraon', 'Khanna'],
    'Patiala': ['Patiala', 'Rajpura', 'Nabha'],
  },
  'Haryana': {
    'Gurugram': ['Gurugram', 'Sohna', 'Pataudi'],
    'Hisar': ['Hisar', 'Hansi', 'Adampur'],
    'Karnal': ['Karnal', 'Assandh', 'Indri'],
  },
};

export const locationStates = Object.keys(locationOptions);

export const getDistricts = (state) => (
  state && locationOptions[state] ? Object.keys(locationOptions[state]) : []
);

export const getVillages = (state, district) => (
  state && district && locationOptions[state]?.[district]
    ? locationOptions[state][district]
    : []
);

export const isValidLocation = ({ state, district, village }) => (
  locationStates.includes(state)
  && getDistricts(state).includes(district)
  && getVillages(state, district).includes(village)
);
