/**
 * Complete India Location Dataset
 * All 28 States + 8 Union Territories with their districts.
 * Blocks and mandis include representative samples per district (3-5 each).
 * Structure is API-ready — can be swapped for backend data without changing component interface.
 */

const INDIA_DATA = {
  'Andhra Pradesh': {
    districts: [
      'Anantapur','Chittoor','East Godavari','Guntur','Krishna','Kurnool',
      'Nellore','Prakasam','Srikakulam','Visakhapatnam','Vizianagaram',
      'West Godavari','YSR Kadapa','Alluri Sitharama Raju','Anakapalli',
      'Annamayya','Bapatla','Eluru','Kakinada','Konaseema','Nandyal',
      'NTR','Palnadu','Parvathipuram Manyam','Sri Sathya Sai','Tirupati'
    ],
  },
  'Arunachal Pradesh': {
    districts: [
      'Anjaw','Changlang','Dibang Valley','East Kameng','East Siang',
      'Kamle','Kra Daadi','Kurung Kumey','Lepa Rada','Lohit','Longding',
      'Lower Dibang Valley','Lower Siang','Lower Subansiri','Namsai',
      'Pakke Kessang','Papum Pare','Shi Yomi','Siang','Tawang',
      'Tirap','Upper Siang','Upper Subansiri','West Kameng','West Siang'
    ],
  },
  'Assam': {
    districts: [
      'Baksa','Barpeta','Biswanath','Bongaigaon','Cachar','Charaideo',
      'Chirang','Darrang','Dhemaji','Dhubri','Dibrugarh','Dima Hasao',
      'Goalpara','Golaghat','Hailakandi','Hojai','Jorhat','Kamrup',
      'Kamrup Metropolitan','Karbi Anglong','Karimganj','Kokrajhar',
      'Lakhimpur','Majuli','Morigaon','Nagaon','Nalbari','Sivasagar',
      'Sonitpur','South Salmara-Mankachar','Tinsukia','Udalguri',
      'West Karbi Anglong','Bajali','Tamulpur'
    ],
  },
  'Bihar': {
    districts: [
      'Araria','Arwal','Aurangabad','Banka','Begusarai','Bhagalpur',
      'Bhojpur','Buxar','Darbhanga','East Champaran','Gaya','Gopalganj',
      'Jamui','Jehanabad','Kaimur','Katihar','Khagaria','Kishanganj',
      'Lakhisarai','Madhepura','Madhubani','Munger','Muzaffarpur',
      'Nalanda','Nawada','Patna','Purnia','Rohtas','Saharsa','Samastipur',
      'Saran','Sheikhpura','Sheohar','Sitamarhi','Siwan','Supaul',
      'Vaishali','West Champaran'
    ],
  },
  'Chhattisgarh': {
    districts: [
      'Balod','Baloda Bazar','Balrampur','Bastar','Bemetara','Bijapur',
      'Bilaspur','Dantewada','Dhamtari','Durg','Gariaband','Gaurela-Pendra-Marwahi',
      'Janjgir-Champa','Jashpur','Kabirdham','Kanker','Kondagaon','Korba',
      'Koriya','Mahasamund','Manendragarh-Chirmiri-Bharatpur','Mungeli',
      'Narayanpur','Raigarh','Raipur','Rajnandgaon','Sukma','Surajpur',
      'Surguja','Khairagarh-Chhuikhadan-Gandai','Mohla-Manpur-Ambagarh Chowki',
      'Sarangarh-Bilaigarh','Shakti'
    ],
  },
  'Goa': {
    districts: ['North Goa','South Goa'],
  },
  'Gujarat': {
    districts: [
      'Ahmedabad','Amreli','Anand','Aravalli','Banaskantha','Bharuch',
      'Bhavnagar','Botad','Chhota Udaipur','Dahod','Dang','Devbhoomi Dwarka',
      'Gandhinagar','Gir Somnath','Jamnagar','Junagadh','Kheda',
      'Kutch','Mahisagar','Mehsana','Morbi','Narmada','Navsari',
      'Panchmahal','Patan','Porbandar','Rajkot','Sabarkantha',
      'Surat','Surendranagar','Tapi','Vadodara','Valsad'
    ],
  },
  'Haryana': {
    districts: [
      'Ambala','Bhiwani','Charkhi Dadri','Faridabad','Fatehabad',
      'Gurugram','Hisar','Jhajjar','Jind','Kaithal','Karnal',
      'Kurukshetra','Mahendragarh','Nuh','Palwal','Panchkula',
      'Panipat','Rewari','Rohtak','Sirsa','Sonipat','Yamunanagar'
    ],
  },
  'Himachal Pradesh': {
    districts: [
      'Bilaspur','Chamba','Hamirpur','Kangra','Kinnaur','Kullu',
      'Lahaul and Spiti','Mandi','Shimla','Sirmaur','Solan','Una'
    ],
  },
  'Jharkhand': {
    districts: [
      'Bokaro','Chatra','Deoghar','Dhanbad','Dumka','East Singhbhum',
      'Garhwa','Giridih','Godda','Gumla','Hazaribagh','Jamtara',
      'Khunti','Koderma','Latehar','Lohardaga','Pakur','Palamu',
      'Ramgarh','Ranchi','Sahibganj','Saraikela Kharsawan',
      'Simdega','West Singhbhum'
    ],
  },
  'Karnataka': {
    districts: [
      'Bagalkot','Ballari','Belagavi','Bengaluru Rural','Bengaluru Urban',
      'Bidar','Chamarajanagar','Chikkaballapur','Chikkamagaluru',
      'Chitradurga','Dakshina Kannada','Davanagere','Dharwad',
      'Gadag','Hassan','Haveri','Kalaburagi','Kodagu','Kolar',
      'Koppal','Mandya','Mysuru','Raichur','Ramanagara',
      'Shivamogga','Tumakuru','Udupi','Uttara Kannada',
      'Vijayanagara','Yadgir'
    ],
  },
  'Kerala': {
    districts: [
      'Alappuzha','Ernakulam','Idukki','Kannur','Kasaragod',
      'Kollam','Kottayam','Kozhikode','Malappuram','Palakkad',
      'Pathanamthitta','Thiruvananthapuram','Thrissur','Wayanad'
    ],
  },
  'Madhya Pradesh': {
    districts: [
      'Agar Malwa','Alirajpur','Anuppur','Ashoknagar','Balaghat',
      'Barwani','Betul','Bhind','Bhopal','Burhanpur','Chhatarpur',
      'Chhindwara','Damoh','Datia','Dewas','Dhar','Dindori',
      'Guna','Gwalior','Harda','Hoshangabad','Indore','Jabalpur',
      'Jhabua','Katni','Khandwa','Khargone','Maihar','Mandla',
      'Mandsaur','Morena','Nagar','Narsinghpur','Neemuch',
      'Niwari','Panna','Raisen','Rajgarh','Ratlam','Rewa',
      'Sagar','Satna','Sehore','Seoni','Shahdol','Shajapur',
      'Sheopur','Shivpuri','Sidhi','Singrauli','Tikamgarh',
      'Ujjain','Umaria','Vidisha'
    ],
  },
  'Maharashtra': {
    districts: [
      'Ahmednagar','Akola','Amravati','Aurangabad','Beed','Bhandara',
      'Buldhana','Chandrapur','Dhule','Gadchiroli','Gondia','Hingoli',
      'Jalgaon','Jalna','Kolhapur','Latur','Mumbai City','Mumbai Suburban',
      'Nagpur','Nanded','Nandurbar','Nashik','Osmanabad','Palghar',
      'Parbhani','Pune','Raigad','Ratnagiri','Sangli','Satara',
      'Sindhudurg','Solapur','Thane','Wardha','Washim','Yavatmal'
    ],
  },
  'Manipur': {
    districts: [
      'Bishnupur','Chandel','Churachandpur','Imphal East','Imphal West',
      'Jiribam','Kakching','Kamjong','Kangpokpi','Noney','Pherzawl',
      'Senapati','Tamenglong','Tengnoupal','Thoubal','Ukhrul'
    ],
  },
  'Meghalaya': {
    districts: [
      'East Garo Hills','East Jaintia Hills','East Khasi Hills',
      'North Garo Hills','Ri Bhoi','South Garo Hills',
      'South West Garo Hills','South West Khasi Hills',
      'West Garo Hills','West Jaintia Hills','West Khasi Hills',
      'Eastern West Khasi Hills'
    ],
  },
  'Mizoram': {
    districts: [
      'Aizawl','Champhai','Hnahthial','Khawzawl','Kolasib',
      'Lawngtlai','Lunglei','Mamit','Saiha','Saitual','Serchhip'
    ],
  },
  'Nagaland': {
    districts: [
      'Chümoukedima','Dimapur','Kiphire','Kohima','Longleng',
      'Mokokchung','Mon','Niuland','Noklak','Peren','Phek',
      'Shamator','Tseminyü','Tuensang','Wokha','Zünheboto'
    ],
  },
  'Odisha': {
    districts: [
      'Angul','Balangir','Balasore','Bargarh','Bhadrak','Boudh',
      'Cuttack','Deogarh','Dhenkanal','Gajapati','Ganjam',
      'Jagatsinghpur','Jajpur','Jharsuguda','Kalahandi','Kandhamal',
      'Kendrapara','Kendujhar','Khordha','Koraput','Malkangiri',
      'Mayurbhanj','Nabarangpur','Nayagarh','Nuapada','Puri',
      'Rayagada','Sambalpur','Sonepur','Sundargarh'
    ],
  },
  'Punjab': {
    districts: [
      'Amritsar','Barnala','Bathinda','Faridkot','Fatehgarh Sahib',
      'Fazilka','Ferozepur','Gurdaspur','Hoshiarpur','Jalandhar',
      'Kapurthala','Ludhiana','Malerkotla','Mansa','Moga',
      'Muktsar','Pathankot','Patiala','Rupnagar','Sangrur',
      'SAS Nagar','SBS Nagar','Tarn Taran'
    ],
  },
  'Rajasthan': {
    districts: [
      'Ajmer','Alwar','Banswara','Baran','Barmer','Bharatpur',
      'Bhilwara','Bikaner','Bundi','Chittorgarh','Churu',
      'Dausa','Dholpur','Dungarpur','Hanumangarh','Jaipur',
      'Jaisalmer','Jalore','Jhalawar','Jhunjhunu','Jodhpur',
      'Karauli','Kota','Nagaur','Pali','Pratapgarh','Rajsamand',
      'Sawai Madhopur','Sikar','Sirohi','Sri Ganganagar',
      'Tonk','Udaipur'
    ],
  },
  'Sikkim': {
    districts: [
      'East Sikkim','North Sikkim','South Sikkim','West Sikkim',
      'Pakyong','Soreng'
    ],
  },
  'Tamil Nadu': {
    districts: [
      'Ariyalur','Chengalpattu','Chennai','Coimbatore','Cuddalore',
      'Dharmapuri','Dindigul','Erode','Kallakurichi','Kancheepuram',
      'Karur','Krishnagiri','Madurai','Mayiladuthurai','Nagapattinam',
      'Namakkal','Nilgiris','Perambalur','Pudukkottai','Ramanathapuram',
      'Ranipet','Salem','Sivaganga','Tenkasi','Thanjavur','Theni',
      'Thoothukudi','Tiruchirappalli','Tirunelveli','Tirupathur',
      'Tiruppur','Tiruvallur','Tiruvannamalai','Tiruvarur',
      'Vellore','Viluppuram','Virudhunagar'
    ],
  },
  'Telangana': {
    districts: [
      'Adilabad','Bhadradri Kothagudem','Hyderabad','Jagtial',
      'Jangaon','Jayashankar Bhupalpally','Jogulamba Gadwal',
      'Kamareddy','Karimnagar','Khammam','Kumuram Bheem Asifabad',
      'Mahabubabad','Mahbubnagar','Mancherial','Medak','Medchal-Malkajgiri',
      'Mulugu','Nagarkurnool','Nalgonda','Narayanpet','Nirmal',
      'Nizamabad','Peddapalli','Rajanna Sircilla','Rangareddy',
      'Sangareddy','Siddipet','Suryapet','Vikarabad','Wanaparthy',
      'Warangal Rural','Warangal Urban','Yadadri Bhuvanagiri'
    ],
  },
  'Tripura': {
    districts: [
      'Dhalai','Gomati','Khowai','North Tripura','Sepahijala',
      'South Tripura','Unakoti','West Tripura'
    ],
  },
  'Uttar Pradesh': {
    districts: [
      'Agra','Aligarh','Ambedkar Nagar','Amethi','Amroha','Auraiya',
      'Ayodhya','Azamgarh','Baghpat','Bahraich','Ballia','Balrampur',
      'Banda','Barabanki','Bareilly','Basti','Bhadohi','Bijnor',
      'Budaun','Bulandshahr','Chandauli','Chitrakoot','Deoria',
      'Etah','Etawah','Farrukhabad','Fatehpur','Firozabad',
      'Gautam Buddha Nagar','Ghaziabad','Ghazipur','Gonda',
      'Gorakhpur','Hamirpur','Hapur','Hardoi','Hathras','Jalaun',
      'Jaunpur','Jhansi','Kannauj','Kanpur Dehat','Kanpur Nagar',
      'Kasganj','Kaushambi','Kushinagar','Lakhimpur Kheri','Lalitpur',
      'Lucknow','Maharajganj','Mahoba','Mainpuri','Mathura','Mau',
      'Meerut','Mirzapur','Moradabad','Muzaffarnagar','Pilibhit',
      'Pratapgarh','Prayagraj','Rae Bareli','Rampur','Saharanpur',
      'Sambhal','Sant Kabir Nagar','Shahjahanpur','Shamli',
      'Shravasti','Siddharthnagar','Sitapur','Sonbhadra','Sultanpur',
      'Unnao','Varanasi'
    ],
  },
  'Uttarakhand': {
    districts: [
      'Almora','Bageshwar','Chamoli','Champawat','Dehradun',
      'Haridwar','Nainital','Pauri Garhwal','Pithoragarh',
      'Rudraprayag','Tehri Garhwal','Udham Singh Nagar','Uttarkashi'
    ],
  },
  'West Bengal': {
    districts: [
      'Alipurduar','Bankura','Birbhum','Cooch Behar','Dakshin Dinajpur',
      'Darjeeling','Hooghly','Howrah','Jalpaiguri','Jhargram',
      'Kalimpong','Kolkata','Malda','Murshidabad','Nadia',
      'North 24 Parganas','Paschim Bardhaman','Paschim Medinipur',
      'Purba Bardhaman','Purba Medinipur','Purulia','South 24 Parganas',
      'Uttar Dinajpur'
    ],
  },
  // ─── Union Territories ────────────────────────────────────
  'Andaman and Nicobar Islands': {
    districts: ['Nicobar','North and Middle Andaman','South Andaman'],
  },
  'Chandigarh': {
    districts: ['Chandigarh'],
  },
  'Dadra and Nagar Haveli and Daman and Diu': {
    districts: ['Dadra and Nagar Haveli','Daman','Diu'],
  },
  'Delhi': {
    districts: [
      'Central Delhi','East Delhi','New Delhi','North Delhi',
      'North East Delhi','North West Delhi','Shahdara',
      'South Delhi','South East Delhi','South West Delhi','West Delhi'
    ],
  },
  'Jammu and Kashmir': {
    districts: [
      'Anantnag','Bandipora','Baramulla','Budgam','Doda','Ganderbal',
      'Jammu','Kathua','Kishtwar','Kulgam','Kupwara','Poonch',
      'Pulwama','Rajouri','Ramban','Reasi','Samba','Shopian',
      'Srinagar','Udhampur'
    ],
  },
  'Ladakh': {
    districts: ['Kargil','Leh'],
  },
  'Lakshadweep': {
    districts: ['Lakshadweep'],
  },
  'Puducherry': {
    districts: ['Karaikal','Mahe','Puducherry','Yanam'],
  },
};

// ─── Representative Blocks / Tehsils per District ──────────────────
// Sample 3-5 blocks per district for major agricultural states.
// For smaller states / UTs, a default set is generated.
const BLOCKS_DATA = {
  'Uttar Pradesh': {
    'Agra': ['Agra', 'Etmadpur', 'Fatehabad', 'Kheragarh', 'Bah'],
    'Aligarh': ['Aligarh', 'Atrauli', 'Gabhana', 'Iglas', 'Khair'],
    'Ambedkar Nagar': ['Akbarpur', 'Alapur', 'Bhiti', 'Jalalpur', 'Tanda'],
    'Amethi': ['Amethi', 'Gauriganj', 'Musafirkhana', 'Tiloi'],
    'Amroha': ['Amroha', 'Dhanaura', 'Gajraula', 'Hasanpur'],
    'Auraiya': ['Auraiya', 'Bidhuna', 'Sahar'],
    'Ayodhya': ['Ayodhya', 'Bikapur', 'Milkipur', 'Rudauli', 'Sohawal'],
    'Azamgarh': ['Azamgarh', 'Lalganj', 'Phulpur', 'Sagri', 'Mehnagar'],
    'Baghpat': ['Baghpat', 'Baraut', 'Khekra', 'Pilana'],
    'Bahraich': ['Bahraich', 'Nanpara', 'Kaiserganj', 'Payagpur'],
    'Ballia': ['Ballia', 'Bansdih', 'Rasra', 'Sikandarpur'],
    'Balrampur': ['Balrampur', 'Tulsipur', 'Utraula', 'Gaindas Bujurg'],
    'Banda': ['Banda', 'Baberu', 'Naraini', 'Atarra'],
    'Barabanki': ['Barabanki', 'Fatehpur', 'Haidergarh', 'Nawabganj', 'Ramsanehi Ghat'],
    'Bareilly': ['Bareilly', 'Aonla', 'Faridpur', 'Nawabganj', 'Meerganj'],
    'Basti': ['Basti', 'Harraiya', 'Gaur', 'Parasrampur'],
    'Bhadohi': ['Bhadohi', 'Aurai', 'Deegh', 'Gyanpur'],
    'Bijnor': ['Bijnor', 'Chandpur', 'Dhampur', 'Nagina', 'Najibabad'],
    'Budaun': ['Budaun', 'Dataganj', 'Sahaswan', 'Bilsi', 'Ujhani'],
    'Bulandshahr': ['Bulandshahr', 'Khurja', 'Sikandrabad', 'Anupshahr', 'Debai'],
    'Chandauli': ['Chandauli', 'Chakia', 'Mughalsarai', 'Sakaldiha', 'Chakiya'],
    'Chitrakoot': ['Chitrakoot', 'Karwi', 'Mau', 'Manikpur'],
    'Deoria': ['Deoria', 'Bhatpar Rani', 'Salempur', 'Rudrapur'],
    'Etah': ['Etah', 'Kasganj', 'Aliganj', 'Jalesar'],
    'Etawah': ['Etawah', 'Bharthana', 'Jaswantnagar', 'Saifai'],
    'Farrukhabad': ['Farrukhabad', 'Fatehgarh', 'Kaimganj', 'Amritpur'],
    'Fatehpur': ['Fatehpur', 'Bindki', 'Khaga', 'Amauli'],
    'Firozabad': ['Firozabad', 'Jasrana', 'Shikohabad', 'Tundla'],
    'Gautam Buddha Nagar': ['Noida', 'Greater Noida', 'Dadri', 'Jewar', 'Dankaur'],
    'Ghaziabad': ['Ghaziabad', 'Loni', 'Modinagar', 'Muradnagar', 'Hapur'],
    'Ghazipur': ['Ghazipur', 'Jakhanian', 'Saidpur', 'Zamania'],
    'Gonda': ['Gonda', 'Mankapur', 'Nawabganj', 'Tarabganj'],
    'Gorakhpur': ['Gorakhpur', 'Bansgaon', 'Chauri Chaura', 'Sahjanwa', 'Khajni'],
    'Hamirpur': ['Hamirpur', 'Maudaha', 'Rath', 'Sarila'],
    'Hapur': ['Hapur', 'Dhaulana', 'Garhmukteshwar', 'Pilkhuwa'],
    'Hardoi': ['Hardoi', 'Bilgram', 'Sandila', 'Shahabad'],
    'Hathras': ['Hathras', 'Sadabad', 'Sikandra Rao', 'Sasni'],
    'Jalaun': ['Jalaun', 'Konch', 'Orai', 'Madhogarh'],
    'Jaunpur': ['Jaunpur', 'Machhalishahar', 'Mariahu', 'Shahganj', 'Badlapur'],
    'Jhansi': ['Jhansi', 'Babina', 'Garautha', 'Moth'],
    'Kannauj': ['Kannauj', 'Chhibramau', 'Tirwa'],
    'Kanpur Dehat': ['Akbarpur', 'Derapur', 'Jhinjhak', 'Rasulabad'],
    'Kanpur Nagar': ['Kanpur', 'Bilhaur', 'Ghatampur', 'Narwal'],
    'Kasganj': ['Kasganj', 'Amanpur', 'Ganj Dundwara', 'Patiyali'],
    'Kaushambi': ['Kaushambi', 'Manjhanpur', 'Chail', 'Sirathu'],
    'Kushinagar': ['Kushinagar', 'Padrauna', 'Hata', 'Khadda'],
    'Lakhimpur Kheri': ['Lakhimpur', 'Gola Gokarannath', 'Mohammdi', 'Nighasan'],
    'Lalitpur': ['Lalitpur', 'Maharoni', 'Mehrauni', 'Talbehat'],
    'Lucknow': ['Lucknow', 'Bakshi Ka Talab', 'Chinhat', 'Malihabad', 'Mohanlalganj'],
    'Maharajganj': ['Maharajganj', 'Nautanwa', 'Pharenda', 'Siswa Bazar'],
    'Mahoba': ['Mahoba', 'Charkhari', 'Kulpahar'],
    'Mainpuri': ['Mainpuri', 'Bhogaon', 'Ghiror', 'Kishni'],
    'Mathura': ['Mathura', 'Chhata', 'Mant', 'Vrindavan', 'Goverdhan'],
    'Mau': ['Mau', 'Ghosi', 'Mohammadabad', 'Kopaganj'],
    'Meerut': ['Meerut', 'Sardhana', 'Mawana', 'Hastinapur', 'Rajpura'],
    'Mirzapur': ['Mirzapur', 'Chunar', 'Lalganj', 'Marihan'],
    'Moradabad': ['Moradabad', 'Bilari', 'Chandausi', 'Sambhal', 'Thakurdwara'],
    'Muzaffarnagar': ['Muzaffarnagar', 'Jansath', 'Khatauli', 'Shamli', 'Budhana'],
    'Pilibhit': ['Pilibhit', 'Bisalpur', 'Puranpur', 'Barkhera'],
    'Pratapgarh': ['Pratapgarh', 'Kunda', 'Patti', 'Lalganj'],
    'Prayagraj': ['Prayagraj', 'Handia', 'Karchana', 'Meja', 'Phulpur'],
    'Rae Bareli': ['Rae Bareli', 'Salon', 'Lalganj', 'Dalmau'],
    'Rampur': ['Rampur', 'Bilaspur', 'Milak', 'Shahabad'],
    'Saharanpur': ['Saharanpur', 'Deoband', 'Behat', 'Nakur', 'Rampur Maniharan'],
    'Sambhal': ['Sambhal', 'Chandausi', 'Bahjoi', 'Gunnaur'],
    'Sant Kabir Nagar': ['Khalilabad', 'Mehdawal', 'Baghauli'],
    'Shahjahanpur': ['Shahjahanpur', 'Tilhar', 'Jalalabad', 'Powayan'],
    'Shamli': ['Shamli', 'Kairana', 'Un', 'Thanabhawan'],
    'Shravasti': ['Bhinga', 'Ikauna', 'Jamunaha'],
    'Siddharthnagar': ['Naugarh', 'Bhanwapur', 'Shohratgarh', 'Uska Bazar'],
    'Sitapur': ['Sitapur', 'Biswan', 'Laharpur', 'Misrikh', 'Sidhauli'],
    'Sonbhadra': ['Sonbhadra', 'Robertsganj', 'Chopan', 'Dudhi'],
    'Sultanpur': ['Sultanpur', 'Kadipur', 'Musafirkhana', 'Amethi'],
    'Unnao': ['Unnao', 'Bangarmau', 'Hasanganj', 'Purwa', 'Safipur'],
    'Varanasi': ['Varanasi', 'Pindra', 'Rohaniya', 'Kashi Vidyapeeth', 'Harahua'],
  },
  'Maharashtra': {
    'Ahmednagar': ['Ahmednagar', 'Shrirampur', 'Rahuri', 'Nevasa', 'Kopargaon'],
    'Pune': ['Pune City', 'Haveli', 'Baramati', 'Junnar', 'Maval'],
    'Nashik': ['Nashik', 'Sinnar', 'Dindori', 'Igatpuri', 'Malegaon'],
    'Nagpur': ['Nagpur', 'Kamptee', 'Hingna', 'Umred', 'Katol'],
    'Kolhapur': ['Kolhapur', 'Hatkanangale', 'Ichalkaranji', 'Panhala', 'Kagal'],
    'Solapur': ['Solapur North', 'Solapur South', 'Pandharpur', 'Barshi', 'Akkalkot'],
    'Aurangabad': ['Aurangabad', 'Paithan', 'Gangapur', 'Kannad', 'Vaijapur'],
    'Satara': ['Satara', 'Karad', 'Wai', 'Patan', 'Koregaon'],
    'Sangli': ['Sangli', 'Miraj', 'Tasgaon', 'Walwa', 'Jat'],
    'Jalgaon': ['Jalgaon', 'Bhusawal', 'Chopda', 'Erandol', 'Pachora'],
  },
  'Madhya Pradesh': {
    'Bhopal': ['Bhopal', 'Berasia', 'Huzur'],
    'Indore': ['Indore', 'Depalpur', 'Mhow', 'Sanwer'],
    'Jabalpur': ['Jabalpur', 'Panagar', 'Sihora', 'Kundam'],
    'Gwalior': ['Gwalior', 'Dabra', 'Bhitarwar'],
    'Ujjain': ['Ujjain', 'Nagda', 'Tarana', 'Khachrod'],
    'Sagar': ['Sagar', 'Khurai', 'Bina', 'Banda'],
    'Rewa': ['Rewa', 'Mauganj', 'Hanumana', 'Sirmour'],
    'Satna': ['Satna', 'Maihar', 'Amarpatan', 'Nagod'],
    'Dewas': ['Dewas', 'Sonkatch', 'Bagli', 'Kannod'],
    'Hoshangabad': ['Hoshangabad', 'Itarsi', 'Seonimalwa', 'Babai'],
  },
  'Punjab': {
    'Amritsar': ['Amritsar', 'Ajnala', 'Attari', 'Majitha', 'Verka'],
    'Ludhiana': ['Ludhiana', 'Jagraon', 'Khanna', 'Raikot', 'Samrala'],
    'Patiala': ['Patiala', 'Rajpura', 'Nabha', 'Samana'],
    'Bathinda': ['Bathinda', 'Rampura Phul', 'Talwandi Sabo', 'Maur'],
    'Jalandhar': ['Jalandhar', 'Nakodar', 'Phillaur', 'Shahkot'],
    'Sangrur': ['Sangrur', 'Barnala', 'Dhuri', 'Malerkotla'],
    'Ferozepur': ['Ferozepur', 'Zira', 'Guru Har Sahai'],
    'Gurdaspur': ['Gurdaspur', 'Batala', 'Dera Baba Nanak', 'Dinanagar'],
    'Hoshiarpur': ['Hoshiarpur', 'Dasuya', 'Garhshankar', 'Mukerian'],
    'Moga': ['Moga', 'Nihal Singh Wala', 'Baghapurana'],
  },
  'Rajasthan': {
    'Jaipur': ['Jaipur', 'Amber', 'Sanganer', 'Chaksu', 'Bassi'],
    'Jodhpur': ['Jodhpur', 'Bilara', 'Osian', 'Phalodi', 'Shergarh'],
    'Udaipur': ['Udaipur', 'Salumber', 'Girwa', 'Mavli', 'Kherwara'],
    'Kota': ['Kota', 'Ladpura', 'Ramganj Mandi', 'Sangod'],
    'Ajmer': ['Ajmer', 'Kishangarh', 'Beawar', 'Nasirabad'],
    'Bikaner': ['Bikaner', 'Nokha', 'Lunkaransar', 'Kolayat'],
    'Alwar': ['Alwar', 'Behror', 'Tijara', 'Rajgarh', 'Ramgarh'],
    'Bharatpur': ['Bharatpur', 'Deeg', 'Kumher', 'Nadbai', 'Bayana'],
    'Sikar': ['Sikar', 'Fatehpur', 'Lachhmangarh', 'Sri Madhopur'],
    'Nagaur': ['Nagaur', 'Degana', 'Didwana', 'Ladnu', 'Merta City'],
  },
  'Haryana': {
    'Ambala': ['Ambala', 'Barara', 'Naraingarh', 'Shahzadpur'],
    'Gurugram': ['Gurugram', 'Sohna', 'Pataudi', 'Farrukhnagar'],
    'Hisar': ['Hisar', 'Hansi', 'Adampur', 'Barwala'],
    'Karnal': ['Karnal', 'Assandh', 'Indri', 'Nilokheri', 'Gharaunda'],
    'Panipat': ['Panipat', 'Samalkha', 'Israna', 'Madlauda'],
    'Sonipat': ['Sonipat', 'Ganaur', 'Gohana', 'Kharkhoda'],
    'Rohtak': ['Rohtak', 'Meham', 'Kalanaur', 'Lakhan Majra'],
    'Sirsa': ['Sirsa', 'Dabwali', 'Rania', 'Ellenabad'],
    'Kurukshetra': ['Kurukshetra', 'Thanesar', 'Pehowa', 'Ladwa', 'Shahabad'],
    'Fatehabad': ['Fatehabad', 'Tohana', 'Ratia', 'Jakhal'],
    'Jind': ['Jind', 'Narwana', 'Safidon', 'Julana', 'Uchana'],
    'Kaithal': ['Kaithal', 'Pundri', 'Kalayat', 'Guhla'],
    'Bhiwani': ['Bhiwani', 'Charkhi Dadri', 'Tosham', 'Siwani'],
    'Rewari': ['Rewari', 'Bawal', 'Kosli', 'Jatusana'],
    'Mahendragarh': ['Narnaul', 'Mahendragarh', 'Ateli', 'Kanina'],
    'Faridabad': ['Faridabad', 'Ballabgarh', 'Tigaon'],
    'Palwal': ['Palwal', 'Hodal', 'Hathin'],
    'Panchkula': ['Panchkula', 'Barwala', 'Raipur Rani', 'Morni'],
    'Yamunanagar': ['Yamunanagar', 'Jagadhri', 'Radaur', 'Bilaspur', 'Sadhaura'],
    'Nuh': ['Nuh', 'Taoru', 'Ferozepur Jhirka', 'Punhana'],
    'Jhajjar': ['Jhajjar', 'Bahadurgarh', 'Beri', 'Machhrauli'],
    'Charkhi Dadri': ['Charkhi Dadri', 'Bondkalan'],
  },
  'Bihar': {
    'Patna': ['Patna', 'Danapur', 'Phulwari Sharif', 'Masaurhi', 'Bikram'],
    'Gaya': ['Gaya', 'Bodh Gaya', 'Sherghati', 'Tekari', 'Wazirganj'],
    'Muzaffarpur': ['Muzaffarpur', 'Kanti', 'Sahebganj', 'Motipur'],
    'Bhagalpur': ['Bhagalpur', 'Sultanganj', 'Kahalgaon', 'Naugachhia'],
    'Darbhanga': ['Darbhanga', 'Jale', 'Benipur', 'Keoti', 'Singhwara'],
    'Purnia': ['Purnia', 'Banmankhi', 'Dhamdaha', 'Kasba'],
    'Begusarai': ['Begusarai', 'Barauni', 'Teghra', 'Bakhri'],
    'Samastipur': ['Samastipur', 'Rosera', 'Dalsinghsarai', 'Patori'],
    'Vaishali': ['Vaishali', 'Hajipur', 'Mahua', 'Raghopur'],
    'Nalanda': ['Nalanda', 'Bihar Sharif', 'Rajgir', 'Hilsa'],
  },
  'Gujarat': {
    'Ahmedabad': ['Ahmedabad', 'Daskroi', 'Dholka', 'Sanand', 'Bavla'],
    'Surat': ['Surat', 'Kamrej', 'Olpad', 'Palsana', 'Bardoli'],
    'Rajkot': ['Rajkot', 'Gondal', 'Jasdan', 'Dhoraji', 'Jetpur'],
    'Vadodara': ['Vadodara', 'Padra', 'Savli', 'Karjan', 'Dabhoi'],
    'Bhavnagar': ['Bhavnagar', 'Sihor', 'Palitana', 'Mahuva'],
    'Junagadh': ['Junagadh', 'Visavadar', 'Mendarda', 'Vanthali'],
    'Kutch': ['Bhuj', 'Anjar', 'Gandhidham', 'Mundra', 'Mandvi'],
    'Mehsana': ['Mehsana', 'Visnagar', 'Unjha', 'Kadi', 'Patan'],
    'Banaskantha': ['Palanpur', 'Deesa', 'Dhanera', 'Tharad', 'Danta'],
    'Anand': ['Anand', 'Borsad', 'Petlad', 'Umreth', 'Khambhat'],
  },
  'Karnataka': {
    'Bengaluru Urban': ['Bengaluru North', 'Bengaluru South', 'Bengaluru East', 'Anekal'],
    'Mysuru': ['Mysuru', 'Nanjangud', 'Hunsur', 'T. Narasipura', 'Periyapatna'],
    'Belagavi': ['Belagavi', 'Gokak', 'Chikkodi', 'Athani', 'Raibag'],
    'Ballari': ['Ballari', 'Hospet', 'Siruguppa', 'Sandur'],
    'Dharwad': ['Dharwad', 'Hubli', 'Navalgund', 'Kalghatgi'],
    'Davangere': ['Davanagere', 'Harihar', 'Jagalur', 'Channagiri'],
    'Hassan': ['Hassan', 'Belur', 'Sakleshpur', 'Arsikere'],
    'Tumakuru': ['Tumakuru', 'Tiptur', 'Sira', 'Kunigal', 'Madhugiri'],
    'Mandya': ['Mandya', 'Maddur', 'Srirangapatna', 'Pandavapura'],
    'Kalaburagi': ['Kalaburagi', 'Aland', 'Chincholi', 'Jevargi', 'Sedam'],
  },
  'Tamil Nadu': {
    'Chennai': ['Chennai North', 'Chennai South', 'Chennai Central', 'Mylapore'],
    'Coimbatore': ['Coimbatore North', 'Coimbatore South', 'Pollachi', 'Mettupalayam', 'Sulur'],
    'Madurai': ['Madurai East', 'Madurai West', 'Melur', 'Usilampatti', 'Vadipatti'],
    'Salem': ['Salem', 'Attur', 'Mettur', 'Omalur', 'Sangagiri'],
    'Tiruchirappalli': ['Tiruchirappalli', 'Srirangam', 'Lalgudi', 'Musiri', 'Manapparai'],
    'Thanjavur': ['Thanjavur', 'Kumbakonam', 'Pattukkottai', 'Orathanadu'],
    'Erode': ['Erode', 'Bhavani', 'Gobichettipalayam', 'Perundurai', 'Sathyamangalam'],
    'Tiruppur': ['Tiruppur', 'Avinashi', 'Dharapuram', 'Palladam', 'Udumalaipettai'],
    'Dindigul': ['Dindigul', 'Palani', 'Oddanchatram', 'Natham'],
    'Vellore': ['Vellore', 'Ambur', 'Gudiyatham', 'Vaniyambadi', 'Arcot'],
  },
  'Telangana': {
    'Hyderabad': ['Hyderabad', 'Secunderabad', 'Musheerabad', 'Charminar'],
    'Rangareddy': ['Rangareddy', 'Shamshabad', 'Chevella', 'Ibrahimpatnam', 'Maheshwaram'],
    'Karimnagar': ['Karimnagar', 'Huzurabad', 'Jagtial', 'Peddapalli'],
    'Warangal Urban': ['Warangal', 'Hanamkonda', 'Kazipet'],
    'Nizamabad': ['Nizamabad', 'Bodhan', 'Armoor', 'Kamareddy'],
    'Khammam': ['Khammam', 'Kothagudem', 'Madhira', 'Yellandu'],
    'Nalgonda': ['Nalgonda', 'Miryalaguda', 'Devarakonda', 'Suryapet'],
    'Medak': ['Medak', 'Sangareddy', 'Siddipet', 'Narsapur'],
    'Adilabad': ['Adilabad', 'Nirmal', 'Mancherial', 'Utnoor'],
    'Mahbubnagar': ['Mahbubnagar', 'Jadcherla', 'Narayanpet', 'Wanaparthy', 'Gadwal'],
  },
  'West Bengal': {
    'Kolkata': ['Kolkata North', 'Kolkata South', 'Kolkata Central', 'Port'],
    'North 24 Parganas': ['Barasat', 'Basirhat', 'Barrackpore', 'Dum Dum', 'Bongaon'],
    'South 24 Parganas': ['Alipore', 'Baruipur', 'Diamond Harbour', 'Kakdwip', 'Canning'],
    'Howrah': ['Howrah', 'Uluberia', 'Shyampur', 'Amta', 'Domjur'],
    'Hooghly': ['Hooghly', 'Chinsurah', 'Serampore', 'Chandannagar', 'Arambagh'],
    'Murshidabad': ['Murshidabad', 'Berhampore', 'Kandi', 'Lalgola', 'Jangipur'],
    'Nadia': ['Krishnanagar', 'Ranaghat', 'Nabadwip', 'Kalyani', 'Tehatta'],
    'Malda': ['Malda', 'English Bazar', 'Old Malda', 'Gazole', 'Harishchandrapur'],
    'Bardhaman': ['Bardhaman', 'Durgapur', 'Asansol', 'Memari', 'Kalna'],
    'Birbhum': ['Suri', 'Bolpur', 'Rampurhat', 'Nalhati', 'Sainthia'],
  },
  'Andhra Pradesh': {
    'Guntur': ['Guntur', 'Tenali', 'Mangalagiri', 'Narasaraopet', 'Bapatla'],
    'Krishna': ['Vijayawada', 'Machilipatnam', 'Gudivada', 'Nuzvid'],
    'East Godavari': ['Kakinada', 'Rajahmundry', 'Amalapuram', 'Ramachandrapuram'],
    'West Godavari': ['Eluru', 'Bhimavaram', 'Tadepalligudem', 'Narsapur'],
    'Kurnool': ['Kurnool', 'Nandyal', 'Adoni', 'Yemmiganur'],
    'Anantapur': ['Anantapur', 'Hindupur', 'Guntakal', 'Dharmavaram', 'Penukonda'],
    'Chittoor': ['Chittoor', 'Tirupati', 'Madanapalle', 'Srikalahasti'],
    'Visakhapatnam': ['Visakhapatnam', 'Anakapalli', 'Gajuwaka', 'Narsipatnam'],
    'Nellore': ['Nellore', 'Gudur', 'Kavali', 'Atmakur'],
    'Prakasam': ['Ongole', 'Markapur', 'Chirala', 'Kandukur'],
  },
  'Odisha': {
    'Cuttack': ['Cuttack', 'Choudwar', 'Banki', 'Athagarh', 'Baramba'],
    'Khordha': ['Bhubaneswar', 'Jatni', 'Balugaon', 'Begunia'],
    'Ganjam': ['Berhampur', 'Chatrapur', 'Aska', 'Khallikote', 'Hinjili'],
    'Balasore': ['Balasore', 'Jaleswar', 'Soro', 'Remuna'],
    'Mayurbhanj': ['Baripada', 'Rairangpur', 'Karanjia', 'Udala'],
    'Sambalpur': ['Sambalpur', 'Rairakhol', 'Kuchinda', 'Dhankauda'],
    'Puri': ['Puri', 'Pipili', 'Nimapara', 'Konark'],
    'Sundargarh': ['Rourkela', 'Sundargarh', 'Rajgangpur', 'Bonai'],
    'Koraput': ['Koraput', 'Jeypore', 'Sunabeda', 'Narayanpatna'],
    'Angul': ['Angul', 'Talcher', 'Banarpal', 'Pallahara'],
  },
  'Chhattisgarh': {
    'Raipur': ['Raipur', 'Abhanpur', 'Arang', 'Tilda'],
    'Bilaspur': ['Bilaspur', 'Kota', 'Takhatpur', 'Mungeli'],
    'Durg': ['Durg', 'Bhilai', 'Patan', 'Dhamdha'],
    'Korba': ['Korba', 'Katghora', 'Pali', 'Kartala'],
    'Rajnandgaon': ['Rajnandgaon', 'Dongargarh', 'Khairagarh', 'Mohla'],
  },
  'Jharkhand': {
    'Ranchi': ['Ranchi', 'Bundu', 'Tamar', 'Kanke', 'Namkum'],
    'Dhanbad': ['Dhanbad', 'Jharia', 'Sindri', 'Govindpur'],
    'Bokaro': ['Bokaro', 'Chas', 'Bermo', 'Gomia'],
    'Hazaribagh': ['Hazaribagh', 'Barhi', 'Ichak', 'Keredari'],
    'East Singhbhum': ['Jamshedpur', 'Gamharia', 'Potka', 'Musabani'],
  },
  'Kerala': {
    'Ernakulam': ['Kochi', 'Aluva', 'Perumbavoor', 'Muvattupuzha', 'Kothamangalam'],
    'Thiruvananthapuram': ['Thiruvananthapuram', 'Nedumangad', 'Neyyattinkara', 'Attingal'],
    'Kozhikode': ['Kozhikode', 'Vatakara', 'Koyilandy', 'Feroke'],
    'Thrissur': ['Thrissur', 'Chalakudy', 'Irinjalakuda', 'Kunnamkulam', 'Kodungallur'],
    'Malappuram': ['Malappuram', 'Manjeri', 'Perinthalmanna', 'Tirur', 'Ponnani'],
    'Palakkad': ['Palakkad', 'Ottapalam', 'Mannarkkad', 'Chittur', 'Alathur'],
    'Kannur': ['Kannur', 'Thalassery', 'Payyanur', 'Taliparamba'],
    'Kollam': ['Kollam', 'Punalur', 'Karunagappally', 'Kottarakkara'],
    'Kottayam': ['Kottayam', 'Pala', 'Changanassery', 'Vaikom'],
    'Alappuzha': ['Alappuzha', 'Cherthala', 'Kayamkulam', 'Mavelikkara'],
  },
  'Uttarakhand': {
    'Dehradun': ['Dehradun', 'Rishikesh', 'Doiwala', 'Vikasnagar', 'Sahaspur'],
    'Haridwar': ['Haridwar', 'Roorkee', 'Laksar', 'Bhagwanpur'],
    'Nainital': ['Nainital', 'Haldwani', 'Ramnagar', 'Lalkuan'],
    'Udham Singh Nagar': ['Rudrapur', 'Kashipur', 'Jaspur', 'Khatima', 'Sitarganj'],
    'Almora': ['Almora', 'Ranikhet', 'Bhikiyasain', 'Someshwar'],
  },
};

// ─── Representative Mandis per District ─────────────────────────────
const MANDIS_DATA = {
  'Uttar Pradesh': {
    'Chandauli': ['Chakia Mandi', 'Mughalsarai Mandi', 'Sakaldiha Mandi', 'Chandauli Mandi'],
    'Varanasi': ['Varanasi Mandi', 'Pindra Mandi', 'Rohaniya Mandi'],
    'Gautam Buddha Nagar': ['Noida Mandi', 'Greater Noida Mandi', 'Dadri Mandi', 'Jewar Mandi'],
    'Lucknow': ['Lucknow Mandi', 'Chinhat Mandi', 'Malihabad Mandi', 'Mohanlalganj Mandi'],
    'Agra': ['Agra Mandi', 'Etmadpur Mandi', 'Fatehabad Mandi'],
    'Kanpur Nagar': ['Kanpur Mandi', 'Bilhaur Mandi', 'Ghatampur Mandi'],
    'Prayagraj': ['Prayagraj Mandi', 'Handia Mandi', 'Meja Mandi', 'Phulpur Mandi'],
    'Gorakhpur': ['Gorakhpur Mandi', 'Chauri Chaura Mandi', 'Sahjanwa Mandi'],
    'Meerut': ['Meerut Mandi', 'Sardhana Mandi', 'Mawana Mandi'],
    'Bareilly': ['Bareilly Mandi', 'Aonla Mandi', 'Faridpur Mandi'],
    'Aligarh': ['Aligarh Mandi', 'Atrauli Mandi', 'Iglas Mandi'],
    'Moradabad': ['Moradabad Mandi', 'Chandausi Mandi', 'Sambhal Mandi'],
    'Saharanpur': ['Saharanpur Mandi', 'Deoband Mandi', 'Behat Mandi'],
    'Jhansi': ['Jhansi Mandi', 'Babina Mandi', 'Moth Mandi'],
    'Mathura': ['Mathura Mandi', 'Vrindavan Mandi', 'Goverdhan Mandi'],
    'Azamgarh': ['Azamgarh Mandi', 'Lalganj Mandi', 'Phulpur Mandi'],
    'Basti': ['Basti Mandi', 'Harraiya Mandi'],
    'Sitapur': ['Sitapur Mandi', 'Biswan Mandi', 'Laharpur Mandi'],
    'Hardoi': ['Hardoi Mandi', 'Sandila Mandi', 'Shahabad Mandi'],
    'Sultanpur': ['Sultanpur Mandi', 'Kadipur Mandi'],
  },
  'Maharashtra': {
    'Pune': ['Pune Mandi', 'Market Yard Pune', 'Baramati APMC', 'Junnar APMC'],
    'Nashik': ['Nashik APMC', 'Pimpalgaon APMC', 'Sinnar APMC', 'Malegaon APMC'],
    'Nagpur': ['Nagpur APMC', 'Kamptee Mandi', 'Katol Mandi'],
    'Kolhapur': ['Kolhapur APMC', 'Hatkanangale Mandi', 'Kagal Mandi'],
    'Solapur': ['Solapur APMC', 'Pandharpur Mandi', 'Barshi APMC'],
    'Aurangabad': ['Aurangabad APMC', 'Paithan Mandi', 'Gangapur Mandi'],
    'Jalgaon': ['Jalgaon APMC', 'Bhusawal Mandi', 'Chopda Mandi'],
    'Ahmednagar': ['Ahmednagar APMC', 'Shrirampur Mandi', 'Rahuri Mandi'],
  },
  'Madhya Pradesh': {
    'Bhopal': ['Bhopal Mandi', 'Berasia Mandi'],
    'Indore': ['Indore Mandi', 'Depalpur Mandi', 'Mhow Mandi'],
    'Jabalpur': ['Jabalpur Mandi', 'Panagar Mandi', 'Sihora Mandi'],
    'Gwalior': ['Gwalior Mandi', 'Dabra Mandi'],
    'Ujjain': ['Ujjain Mandi', 'Nagda Mandi'],
    'Dewas': ['Dewas Mandi', 'Sonkatch Mandi'],
    'Sagar': ['Sagar Mandi', 'Khurai Mandi'],
    'Rewa': ['Rewa Mandi', 'Mauganj Mandi'],
    'Satna': ['Satna Mandi', 'Maihar Mandi'],
  },
  'Punjab': {
    'Amritsar': ['Amritsar Mandi', 'Attari Mandi', 'Ajnala Mandi'],
    'Ludhiana': ['Ludhiana Mandi', 'Khanna Mandi', 'Jagraon Mandi', 'Samrala Mandi'],
    'Patiala': ['Patiala Mandi', 'Rajpura Mandi', 'Nabha Mandi'],
    'Bathinda': ['Bathinda Mandi', 'Rampura Phul Mandi', 'Maur Mandi'],
    'Jalandhar': ['Jalandhar Mandi', 'Nakodar Mandi', 'Phillaur Mandi'],
    'Sangrur': ['Sangrur Mandi', 'Dhuri Mandi', 'Malerkotla Mandi'],
    'Ferozepur': ['Ferozepur Mandi', 'Zira Mandi'],
    'Moga': ['Moga Mandi', 'Baghapurana Mandi'],
  },
  'Rajasthan': {
    'Jaipur': ['Jaipur Mandi', 'Chomu Mandi', 'Sanganer Mandi', 'Bassi Mandi'],
    'Jodhpur': ['Jodhpur Mandi', 'Bilara Mandi', 'Phalodi Mandi'],
    'Udaipur': ['Udaipur Mandi', 'Salumber Mandi'],
    'Kota': ['Kota Mandi', 'Ramganj Mandi'],
    'Ajmer': ['Ajmer Mandi', 'Beawar Mandi', 'Kishangarh Mandi'],
    'Bikaner': ['Bikaner Mandi', 'Nokha Mandi'],
    'Alwar': ['Alwar Mandi', 'Behror Mandi', 'Tijara Mandi'],
    'Bharatpur': ['Bharatpur Mandi', 'Bayana Mandi', 'Deeg Mandi'],
    'Nagaur': ['Nagaur Mandi', 'Merta Mandi', 'Didwana Mandi'],
    'Sikar': ['Sikar Mandi', 'Fatehpur Mandi', 'Lachhmangarh Mandi'],
  },
  'Haryana': {
    'Gurugram': ['Gurugram Mandi', 'Sohna Mandi', 'Pataudi Mandi'],
    'Hisar': ['Hisar Mandi', 'Hansi Mandi', 'Adampur Mandi'],
    'Karnal': ['Karnal Mandi', 'Assandh Mandi', 'Indri Mandi', 'Gharaunda Mandi'],
    'Panipat': ['Panipat Mandi', 'Samalkha Mandi', 'Israna Mandi'],
    'Sonipat': ['Sonipat Mandi', 'Ganaur Mandi', 'Gohana Mandi'],
    'Ambala': ['Ambala Mandi', 'Barara Mandi', 'Naraingarh Mandi'],
    'Sirsa': ['Sirsa Mandi', 'Dabwali Mandi', 'Ellenabad Mandi'],
    'Rohtak': ['Rohtak Mandi', 'Meham Mandi'],
    'Kurukshetra': ['Kurukshetra Mandi', 'Thanesar Mandi', 'Ladwa Mandi'],
    'Fatehabad': ['Fatehabad Mandi', 'Tohana Mandi', 'Ratia Mandi'],
    'Jind': ['Jind Mandi', 'Narwana Mandi', 'Safidon Mandi'],
    'Kaithal': ['Kaithal Mandi', 'Pundri Mandi', 'Kalayat Mandi'],
  },
  'Bihar': {
    'Patna': ['Patna Mandi', 'Danapur Mandi', 'Phulwari Mandi'],
    'Gaya': ['Gaya Mandi', 'Sherghati Mandi', 'Tekari Mandi'],
    'Muzaffarpur': ['Muzaffarpur Mandi', 'Motipur Mandi'],
    'Bhagalpur': ['Bhagalpur Mandi', 'Sultanganj Mandi'],
    'Darbhanga': ['Darbhanga Mandi', 'Benipur Mandi'],
    'Purnia': ['Purnia Mandi', 'Banmankhi Mandi'],
    'Begusarai': ['Begusarai Mandi', 'Barauni Mandi'],
    'Samastipur': ['Samastipur Mandi', 'Rosera Mandi'],
    'Vaishali': ['Hajipur Mandi', 'Mahua Mandi'],
    'Nalanda': ['Bihar Sharif Mandi', 'Rajgir Mandi'],
  },
  'Gujarat': {
    'Ahmedabad': ['Ahmedabad APMC', 'Sanand APMC', 'Dholka Mandi'],
    'Surat': ['Surat APMC', 'Bardoli Mandi', 'Kamrej Mandi'],
    'Rajkot': ['Rajkot APMC', 'Gondal APMC', 'Jetpur Mandi'],
    'Vadodara': ['Vadodara APMC', 'Padra Mandi', 'Dabhoi Mandi'],
    'Junagadh': ['Junagadh APMC', 'Visavadar Mandi'],
    'Kutch': ['Bhuj Mandi', 'Anjar Mandi', 'Gandhidham Mandi'],
    'Mehsana': ['Mehsana APMC', 'Unjha APMC', 'Visnagar Mandi'],
    'Banaskantha': ['Palanpur APMC', 'Deesa Mandi', 'Dhanera Mandi'],
    'Anand': ['Anand APMC', 'Borsad Mandi', 'Petlad Mandi'],
    'Bhavnagar': ['Bhavnagar APMC', 'Mahuva APMC', 'Palitana Mandi'],
  },
  'Karnataka': {
    'Bengaluru Urban': ['Yeshwanthpur APMC', 'Bangalore APMC'],
    'Mysuru': ['Mysuru APMC', 'Nanjangud Mandi', 'Hunsur Mandi'],
    'Belagavi': ['Belagavi APMC', 'Gokak Mandi', 'Chikkodi APMC'],
    'Ballari': ['Ballari APMC', 'Hospet APMC', 'Siruguppa Mandi'],
    'Dharwad': ['Dharwad APMC', 'Hubli APMC', 'Navalgund Mandi'],
    'Davanagere': ['Davanagere APMC', 'Harihar Mandi'],
    'Hassan': ['Hassan APMC', 'Arsikere Mandi'],
    'Tumakuru': ['Tumakuru APMC', 'Tiptur Mandi', 'Sira Mandi'],
    'Mandya': ['Mandya APMC', 'Maddur Mandi'],
    'Kalaburagi': ['Kalaburagi APMC', 'Jevargi Mandi', 'Sedam Mandi'],
  },
  'Tamil Nadu': {
    'Chennai': ['Koyambedu APMC', 'Chennai APMC'],
    'Coimbatore': ['Coimbatore APMC', 'Pollachi Mandi', 'Mettupalayam Mandi'],
    'Madurai': ['Madurai APMC', 'Usilampatti Mandi', 'Melur Mandi'],
    'Salem': ['Salem APMC', 'Attur Mandi', 'Mettur Mandi'],
    'Thanjavur': ['Thanjavur APMC', 'Kumbakonam Mandi'],
    'Erode': ['Erode APMC', 'Gobichettipalayam Mandi'],
    'Tiruppur': ['Tiruppur APMC', 'Dharapuram Mandi'],
    'Vellore': ['Vellore APMC', 'Gudiyatham Mandi'],
  },
  'Telangana': {
    'Hyderabad': ['Bowenpally APMC', 'Gudimalkapur Market', 'Secunderabad Mandi'],
    'Rangareddy': ['Shamshabad Mandi', 'Chevella Mandi'],
    'Karimnagar': ['Karimnagar APMC', 'Huzurabad Mandi'],
    'Warangal Urban': ['Warangal APMC', 'Hanamkonda Mandi'],
    'Nizamabad': ['Nizamabad APMC', 'Bodhan Mandi'],
    'Khammam': ['Khammam APMC', 'Kothagudem Mandi'],
    'Nalgonda': ['Nalgonda APMC', 'Miryalaguda Mandi'],
    'Mahbubnagar': ['Mahbubnagar APMC', 'Jadcherla Mandi'],
  },
  'West Bengal': {
    'Kolkata': ['Koley Market', 'Posta Bazar', 'Sealdah Market'],
    'Howrah': ['Howrah Mandi', 'Uluberia Mandi'],
    'Murshidabad': ['Berhampore Mandi', 'Kandi Mandi'],
    'Nadia': ['Krishnanagar Mandi', 'Ranaghat Mandi'],
    'Malda': ['English Bazar Mandi', 'Malda Mandi'],
    'North 24 Parganas': ['Barasat Mandi', 'Bongaon Mandi'],
    'Bardhaman': ['Bardhaman Mandi', 'Durgapur Mandi'],
    'Birbhum': ['Suri Mandi', 'Rampurhat Mandi'],
  },
  'Andhra Pradesh': {
    'Guntur': ['Guntur APMC', 'Tenali Mandi', 'Narasaraopet Mandi'],
    'Krishna': ['Vijayawada APMC', 'Machilipatnam Mandi'],
    'East Godavari': ['Kakinada Mandi', 'Rajahmundry APMC'],
    'Kurnool': ['Kurnool APMC', 'Nandyal Mandi', 'Adoni Mandi'],
    'Anantapur': ['Anantapur APMC', 'Hindupur Mandi', 'Guntakal Mandi'],
    'Chittoor': ['Chittoor APMC', 'Tirupati Mandi', 'Madanapalle APMC'],
    'Visakhapatnam': ['Visakhapatnam APMC', 'Anakapalli Mandi'],
    'Nellore': ['Nellore APMC', 'Gudur Mandi', 'Kavali Mandi'],
  },
  'Odisha': {
    'Cuttack': ['Cuttack Mandi', 'Choudwar Mandi', 'Athagarh Mandi'],
    'Khordha': ['Bhubaneswar Mandi', 'Jatni Mandi'],
    'Ganjam': ['Berhampur Mandi', 'Chatrapur Mandi'],
    'Balasore': ['Balasore Mandi', 'Jaleswar Mandi'],
    'Sambalpur': ['Sambalpur Mandi', 'Rairakhol Mandi'],
    'Puri': ['Puri Mandi', 'Nimapara Mandi'],
  },
};

// ─── Exports: Helper functions ──────────────────────────────────────

/** Get sorted list of all states/UTs */
export function getStates() {
  return Object.keys(INDIA_DATA).sort();
}

/** Get sorted districts for a given state */
export function getDistricts(state) {
  if (!state || !INDIA_DATA[state]) return [];
  return [...INDIA_DATA[state].districts].sort();
}

/** Get blocks/tehsils for a given state + district */
export function getBlocks(state, district) {
  if (!state || !district) return [];
  const stateBlocks = BLOCKS_DATA[state];
  if (stateBlocks && stateBlocks[district]) {
    return [...stateBlocks[district]].sort();
  }
  // Fallback: generate a default block named after the district
  return [district];
}

/** Get mandis for a given state + district (optionally filtered by block) */
export function getMandis(state, district, block) {
  if (!state || !district) return [];
  const stateMandis = MANDIS_DATA[state];
  if (stateMandis && stateMandis[district]) {
    const allMandis = stateMandis[district];
    if (block) {
      // Filter mandis that include the block name
      const filtered = allMandis.filter(m =>
        m.toLowerCase().includes(block.toLowerCase())
      );
      return filtered.length > 0 ? filtered : allMandis;
    }
    return [...allMandis].sort();
  }
  // Fallback: generate a default mandi
  return [`${district} Mandi`];
}

/** Common agricultural commodities for the crop search */
export const CROP_LIST = [
  { name: 'Wheat', nameHi: 'गेहूं', icon: '🌾', category: 'Cereal' },
  { name: 'Rice', nameHi: 'चावल', icon: '🌾', category: 'Cereal' },
  { name: 'Paddy', nameHi: 'धान', icon: '🌾', category: 'Cereal' },
  { name: 'Maize', nameHi: 'मक्का', icon: '🌽', category: 'Cereal' },
  { name: 'Bajra', nameHi: 'बाजरा', icon: '🌾', category: 'Cereal' },
  { name: 'Jowar', nameHi: 'ज्वार', icon: '🌾', category: 'Cereal' },
  { name: 'Barley', nameHi: 'जौ', icon: '🌾', category: 'Cereal' },
  { name: 'Ragi', nameHi: 'रागी', icon: '🌾', category: 'Millet' },
  { name: 'Onion', nameHi: 'प्याज', icon: '🧅', category: 'Vegetable' },
  { name: 'Potato', nameHi: 'आलू', icon: '🥔', category: 'Vegetable' },
  { name: 'Tomato', nameHi: 'टमाटर', icon: '🍅', category: 'Vegetable' },
  { name: 'Brinjal', nameHi: 'बैंगन', icon: '🍆', category: 'Vegetable' },
  { name: 'Cabbage', nameHi: 'पत्ता गोभी', icon: '🥬', category: 'Vegetable' },
  { name: 'Cauliflower', nameHi: 'फूल गोभी', icon: '🥦', category: 'Vegetable' },
  { name: 'Green Chilli', nameHi: 'हरी मिर्च', icon: '🌶️', category: 'Vegetable' },
  { name: 'Capsicum', nameHi: 'शिमला मिर्च', icon: '🫑', category: 'Vegetable' },
  { name: 'Carrot', nameHi: 'गाजर', icon: '🥕', category: 'Vegetable' },
  { name: 'Radish', nameHi: 'मूली', icon: '🥕', category: 'Vegetable' },
  { name: 'Peas', nameHi: 'मटर', icon: '🟢', category: 'Vegetable' },
  { name: 'Beans', nameHi: 'सेम', icon: '🫘', category: 'Vegetable' },
  { name: 'Okra', nameHi: 'भिंडी', icon: '🟢', category: 'Vegetable' },
  { name: 'Bitter Gourd', nameHi: 'करेला', icon: '🥒', category: 'Vegetable' },
  { name: 'Bottle Gourd', nameHi: 'लौकी', icon: '🥒', category: 'Vegetable' },
  { name: 'Pumpkin', nameHi: 'कद्दू', icon: '🎃', category: 'Vegetable' },
  { name: 'Cucumber', nameHi: 'खीरा', icon: '🥒', category: 'Vegetable' },
  { name: 'Garlic', nameHi: 'लहसुन', icon: '🧄', category: 'Spice' },
  { name: 'Ginger', nameHi: 'अदरक', icon: '🫚', category: 'Spice' },
  { name: 'Turmeric', nameHi: 'हल्दी', icon: '🟡', category: 'Spice' },
  { name: 'Coriander', nameHi: 'धनिया', icon: '🌿', category: 'Spice' },
  { name: 'Cumin', nameHi: 'जीरा', icon: '🟤', category: 'Spice' },
  { name: 'Mustard', nameHi: 'सरसों', icon: '🌼', category: 'Oilseed' },
  { name: 'Soybean', nameHi: 'सोयाबीन', icon: '🟢', category: 'Oilseed' },
  { name: 'Groundnut', nameHi: 'मूंगफली', icon: '🥜', category: 'Oilseed' },
  { name: 'Sunflower', nameHi: 'सूरजमुखी', icon: '🌻', category: 'Oilseed' },
  { name: 'Sesame', nameHi: 'तिल', icon: '🟤', category: 'Oilseed' },
  { name: 'Linseed', nameHi: 'अलसी', icon: '🟤', category: 'Oilseed' },
  { name: 'Cotton', nameHi: 'कपास', icon: '☁️', category: 'Cash Crop' },
  { name: 'Sugarcane', nameHi: 'गन्ना', icon: '🎋', category: 'Cash Crop' },
  { name: 'Jute', nameHi: 'पटसन', icon: '🟤', category: 'Cash Crop' },
  { name: 'Tobacco', nameHi: 'तम्बाकू', icon: '🍂', category: 'Cash Crop' },
  { name: 'Tea', nameHi: 'चाय', icon: '🍵', category: 'Plantation' },
  { name: 'Coffee', nameHi: 'कॉफ़ी', icon: '☕', category: 'Plantation' },
  { name: 'Rubber', nameHi: 'रबड़', icon: '🟤', category: 'Plantation' },
  { name: 'Coconut', nameHi: 'नारियल', icon: '🥥', category: 'Plantation' },
  { name: 'Arecanut', nameHi: 'सुपारी', icon: '🟤', category: 'Plantation' },
  { name: 'Chickpea', nameHi: 'चना', icon: '🟤', category: 'Pulse' },
  { name: 'Lentil', nameHi: 'मसूर', icon: '🟤', category: 'Pulse' },
  { name: 'Pigeon Pea', nameHi: 'अरहर', icon: '🟤', category: 'Pulse' },
  { name: 'Moong', nameHi: 'मूंग', icon: '🟢', category: 'Pulse' },
  { name: 'Urad', nameHi: 'उड़द', icon: '⚫', category: 'Pulse' },
  { name: 'Mango', nameHi: 'आम', icon: '🥭', category: 'Fruit' },
  { name: 'Banana', nameHi: 'केला', icon: '🍌', category: 'Fruit' },
  { name: 'Apple', nameHi: 'सेब', icon: '🍎', category: 'Fruit' },
  { name: 'Guava', nameHi: 'अमरूद', icon: '🟢', category: 'Fruit' },
  { name: 'Papaya', nameHi: 'पपीता', icon: '🟠', category: 'Fruit' },
  { name: 'Grapes', nameHi: 'अंगूर', icon: '🍇', category: 'Fruit' },
  { name: 'Pomegranate', nameHi: 'अनार', icon: '🔴', category: 'Fruit' },
  { name: 'Orange', nameHi: 'संतरा', icon: '🍊', category: 'Fruit' },
  { name: 'Lemon', nameHi: 'नींबू', icon: '🍋', category: 'Fruit' },
  { name: 'Watermelon', nameHi: 'तरबूज', icon: '🍉', category: 'Fruit' },
];
