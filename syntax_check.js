        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        agri: {
                            50: '#f0fdf4',
                            100: '#dcfce7',
                            500: '#22c55e',
                            600: '#16a34a',
                            700: '#15803d',
                            900: '#14532d',
                        }
                    },
                    fontFamily: {
                        sans: ['Inter', 'system-ui', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    <script>
        const API_BASE = "http://127.0.0.1:8000";
        let isListening = false;
        let isProcessing = false;  // Global lock: true while a fetch is in-flight
        let recognition = null;
        let selectedLanguage = 'hi-IN'; // default starting language for UI text

        const chatContainer = document.getElementById('chat-container');
        const textInput = document.getElementById('text-input');
        const sendBtn = document.getElementById('send-btn');
        const recordBtn = document.getElementById('record-btn');
        const recordIcon = document.getElementById('record-icon');
        const recordingStatus = document.getElementById('recording-status');
        const audioPlayer = new Audio();
        audioPlayer.preload = "auto";
        let audioUrl = null;
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        // removed languageSelect

        // Placeholder text per language
        const placeholders = {
            'hi-IN': 'अपना सवाल यहाँ लिखें (जैसे: गेहूं का भाव क्या है?)...',
            'ta-IN': 'உங்கள் கேள்வியை இங்கே எழுதுங்கள்...',
            'te-IN': 'మీ ప్రశ్నను ఇక్కడ రాయండి...',
            'bn-IN': 'আপনার প্রশ্ন এখানে লিখুন...',
            'mr-IN': 'तुमचा प्रश्न इथे लिहा...',
            'gu-IN': 'તમારો પ્રશ્ન અહીં લખો...',
            'kn-IN': 'ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ...',
            'ml-IN': 'നിങ്ങളുടെ ചോദ്യം ഇവിടെ എഴുതുക...',
            'pa-IN': 'ਆਪਣਾ ਸਵਾਲ ਇੱਥੇ ਲਿਖੋ...',
            'en-IN': 'Type your question here (e.g., What is the price of wheat?)...',
        };

        // Listening status text per language
        const listeningText = {
            'hi-IN': '🎙️ सुन रहा हूँ...',
            'ta-IN': '🎙️ கேட்கிறேன்...',
            'te-IN': '🎙️ వింటున్నాను...',
            'bn-IN': '🎙️ শুনছি...',
            'mr-IN': '🎙️ ऐकत आहे...',
            'gu-IN': '🎙️ સાંભળી રહ્યો છું...',
            'kn-IN': '🎙️ ಕೇಳುತ್ತಿದ್ದೇನೆ...',
            'ml-IN': '🎙️ കേൾക്കുന്നു...',
            'pa-IN': '🎙️ ਸੁਣ ਰਿਹਾ ਹਾਂ...',
            'en-IN': '🎙️ Listening...',
        };

        const welcomeTexts = {
            'hi-IN': "नमस्ते! मैं 'साथी', आपका कृषि मित्र हूँ। आप मुझसे खेती, मंडी भाव, या मौसम के बारे में सवाल पूछ सकते हैं। बोलकर या टाइप करके अपना सवाल पूछें।",
            'en-IN': "Hello! I am 'Saathi', your agricultural friend. You can ask me questions about farming, Mandi prices, or weather. Speak or type your question.",
            'ta-IN': "வணக்கம்! நான் 'சாத்தி', உங்கள் விவசாய நண்பன். விவசாயம், மண்டி விலைகள் அல்லது வானிலை பற்றி நீங்கள் என்னிடம் கேள்விகள் கேட்கலாம். உங்கள் கேள்வியைப் பேசவும் அல்லது தட்டச்சு செய்யவும்.",
            'te-IN': "నమస్కారం! నేను 'సాథి', మీ వ్యవసాయ మిత్రుడిని. మీరు నన్ను వ్యవసాయం, మండి ధరలు లేదా వాతావరణం గురించి ప్రశ్నలు అడగవచ్చు. మీ ప్రశ్నను మాట్లాడండి లేదా టైప్ చేయండి.",
            'bn-IN': "নমস্কার! আমি 'সাথী', আপনার কৃষি বন্ধু। আপনি আমাকে চাষাবাদ, মান্ডি দর বা আবহাওয়া সম্পর্কে প্রশ্ন করতে পারেন। আপনার প্রশ্ন বলুন বা টাইপ করুন।",
            'mr-IN': "नमस्कार! मी 'साथी', तुमचा कृषी मित्र आहे. तुम्ही मला शेती, बाजारभाव किंवा हवामानाबद्दल प्रश्न विचारू शकता. तुमचा प्रश्न बोला किंवा टाइप करा.",
            'gu-IN': "નમસ્તે! હું 'સાથી', તમારો કૃષિ મિત્ર છું. તમે મને ખેતી, મંડીના ભાવ અથવા હવામાન વિશે પ્રશ્નો પૂછી શકો છો. તમારો પ્રશ્ન બોલો અથવા ટાઇપ કરો.",
            'kn-IN': "ನಮಸ್ಕಾರ! ನಾನು 'ಸಾಥಿ', ನಿಮ್ಮ ಕೃಷಿ ಸ್ನೇಹಿತ. ಕೃಷಿ, ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳು ಅಥವಾ ಹವಾಮಾನದ ಬಗ್ಗೆ ನೀವು ನನ್ನನ್ನು ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಬಹುದು. ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಮಾತನಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ.",
            'ml-IN': "നമസ്കാരം! ഞാൻ 'സാഥി', നിങ്ങളുടെ കാർഷിക സുഹൃത്താണ്. കൃഷി, മണ്ടി വിലകൾ, അല്ലെങ്കിൽ കാലാവസ്ഥ എന്നിവയെക്കുറിച്ച് നിങ്ങൾക്ക് എന്നോട് ചോദ്യങ്ങൾ ചോദിക്കാം. നിങ്ങളുടെ ചോദ്യം സംസാരിക്കുകയോ ടൈപ്പുചെയ്യുകയോ ചെയ്യുക.",
            'pa-IN': "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ 'ਸਾਥੀ', ਤੁਹਾਡਾ ਖੇਤੀਬਾੜੀ ਦੋਸਤ ਹਾਂ। ਤੁਸੀਂ ਮੈਨੂੰ ਖੇਤੀਬਾੜੀ, ਮੰਡੀ ਦੀਆਂ ਕੀਮਤਾਂ ਜਾਂ ਮੌਸਮ ਬਾਰੇ ਸਵਾਲ ਪੁੱਛ ਸਕਦੇ ਹੋ। ਆਪਣਾ ਸਵਾਲ ਬੋਲੋ ਜਾਂ ਟਾਈਪ ਕਰੋ।",
            'or-IN': "ନମସ୍କାର! ମୁଁ 'ସାଥୀ', ଆପଣଙ୍କ କୃଷି ବନ୍ଧୁ। ଆପଣ ମୋତେ କୃଷି, ମଣ୍ଡି ଦର କିମ୍ବା ପାଗ ବିଷୟରେ ପ୍ରଶ୍ନ ପଚାରିପାରିବେ। ଆପଣଙ୍କ ପ୍ରଶ୍ନ କୁହନ୍ତୁ କିମ୍ବା ଟାଇପ୍ କରନ୍ତୁ।",
            'ur-IN': "آداب! میں 'ساتھی'، آپ کا زرعی دوست ہوں۔ آپ مجھ سے کھیتی باڑی، منڈی کے نرخ، یا موسم کے بارے میں سوالات پوچھ سکتے ہیں۔ اپنا سوال بولیں یا ٹائپ کریں۔"
        };

        const networkErrorTexts = {
            'hi-IN': 'नेटवर्क त्रुटि या सर्वर ने उत्तर देने में बहुत समय लिया। कृपया पुनः प्रयास करें।',
            'ta-IN': 'நெட்வொர்க் பிழை அல்லது சேவையகம் பதிலளிக்க அதிக நேரம் எடுத்தது. மீண்டும் முயற்சிக்கவும்.',
            'te-IN': 'నెట్‌వర్క్ లోపం లేదా సర్వర్ ప్రతిస్పందించడానికి చాలా సమయం తీసుకుంది. దయచేసి మళ్లీ ప్రయత్నించండి.',
            'bn-IN': 'নেটওয়ার্ক ত্রুটি বা সার্ভার প্রতিক্রিয়া জানাতে খুব বেশি সময় নিয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
            'mr-IN': 'नेटवर्क त्रुटी किंवा सर्व्हरने प्रतिसाद देण्यासाठी खूप वेळ घेतला. कृपया पुन्हा प्रयत्न करा.',
            'gu-IN': 'નેટવર્ક ભૂલ અથવા સર્વર પ્રતિસાદ આપવામાં ખૂબ લાંબો સમય લીધો. કૃપા કરીને ફરી પ્રયાસ કરો.',
            'kn-IN': 'ನೆಟ್‌ವರ್ಕ್ ದೋಷ ಅಥವಾ ಸರ್ವರ್ ಪ್ರತಿಕ್ರಿಯಿಸಲು ಹೆಚ್ಚು ಸಮಯ ತೆಗೆದುಕೊಂಡಿದೆ. ದಯವಿಟ್ಟು ಪುನಃ ಪ್ರಯತ್ನಿಸಿ.',
            'ml-IN': 'നെറ്റ്‌വർക്ക് പിശക് അല്ലെങ്കിൽ സെർവർ പ്രതികരിക്കാൻ വളരെയധികം സമയമെടുത്തു. ദയവായി വീണ്ടും ശ്രമിക്കുക.',
            'pa-IN': 'ਨੈੱਟਵਰਕ ਗਲਤੀ ਜਾਂ ਸਰਵਰ ਨੇ ਜਵਾਬ ਦੇਣ ਵਿੱਚ ਬਹੁਤ ਸਮਾਂ ਲਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
            'or-IN': 'ନେଟୱର୍କ ତ୍ରୁଟି କିମ୍ବା ସର୍ଭର ପ୍ରତିକ୍ରିୟା ଦେବାକୁ ବହୁତ ସମୟ ନେଇଛି | ଦୟାକରି ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ |',
            'ur-IN': 'نیٹ ورک کی خرابی یا سرور نے جواب دینے میں بہت وقت لیا۔ براہ کرم دوبارہ کوشش کریں۔',
            'en-IN': 'Network error or server took too long to respond. Please try again.'
        };

        // Per-language message shown when the browser's own fetch timeout fires
        const timeoutErrorTexts = {
            'hi-IN': '⏱️ सर्वर 25 सेकंड में उत्तर नहीं दे सका। कृपया कुछ देर बाद पुनः प्रयास करें।',
            'ta-IN': '⏱️ சேவையகம் 25 விநாடிகளில் பதிலளிக்கவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.',
            'te-IN': '⏱️ సర్వర్ 25 సెకన్లలో ప్రతిస్పందించలేదు. దయచేసి కొంత సమయం తర్వాత మళ్లీ ప్రయత్నించండి.',
            'bn-IN': '⏱️ সার্ভার ২৫ সেকেন্ডে সাড়া দেয়নি। একটু পরে আবার চেষ্টা করুন।',
            'mr-IN': '⏱️ सर्व्हरने 25 सेकंदात प्रतिसाद दिला नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.',
            'gu-IN': '⏱️ સર્વર 25 સેકન્ડમાં પ્રતિસાદ આપ્યો નહીં. થોડા સમય બાદ ફરી પ્રયાસ કરો.',
            'kn-IN': '⏱️ ಸರ್ವರ್ 25 ಸೆಕೆಂಡ್‌ಗಳಲ್ಲಿ ಪ್ರತಿಕ್ರಿಯಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
            'ml-IN': '⏱️ 25 സെക്കൻഡിനുള്ളിൽ സെർവർ പ്രതികരിച്ചില്ല. കുറച്ച് സമയം കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക.',
            'pa-IN': '⏱️ ਸਰਵਰ ਨੇ 25 ਸਕਿੰਟਾਂ ਵਿੱਚ ਜਵਾਬ ਨਹੀਂ ਦਿੱਤਾ। ਕਿਰਪਾ ਕਰਕੇ ਥੋੜੀ ਦੇਰ ਬਾਅਦ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
            'or-IN': 'ସର୍ଭର 25 ସେକେଣ୍ଡ ମଧ୍ୟରେ ସାଡ଼ା ଦେଇ ନ ପାରିଲା। ଦୟାକରି ଟିକେ ସମୟ ପରେ ପୁନଃ ଚେଷ୍ଟା କରନ୍ତୁ।',
            'ur-IN': '⏱️ سرور 25 سیکنڈ میں جواب نہ دے سکا۔ براہ کرم کچھ دیر بعد دوبارہ کوشش کریں۔',
            'en-IN': '⏱️ Server did not respond within 25 seconds. Please try again in a moment.'
        };

        // --- Dynamic UI Updates based on Detected Language ---
        function updateUIForLanguage(langCode) {
            // Keep the selected language for subsequent voice inputs
            selectedLanguage = langCode;
            
            // Optionally update placeholder
            const fallbackCode = (placeholders[langCode]) ? langCode : 'en-IN';
            textInput.placeholder = placeholders[fallbackCode];
        }

        // --- Initialize Web Speech API ---
        function initSpeechRecognition() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                console.warn('Speech Recognition API not supported in this browser.');
                recordBtn.title = 'Speech Recognition not supported';
                recordBtn.classList.add('opacity-50');
                return null;
            }

            const recog = new SpeechRecognition();
            recog.continuous = true; // Use continuous to avoid cutting off early
            recog.interimResults = false; // We only want final results
            // recog.lang is intentionally left unset so the browser does not force transliteration

            recog.onstart = () => {
                console.log(`[VOICE] recognition started (lang: ${recog.lang})`);
            };

            recog.onresult = (event) => {
                // Combine all final transcripts
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        transcript += event.results[i][0].transcript;
                    }
                }
                transcript = transcript.trim();
                
                if (!transcript) return;
                console.log('[VOICE] final transcript received:', transcript);

                // Guard: ignore result if another request is already in-flight
                if (isProcessing) {
                    console.warn('Ignoring speech result — request already in progress.');
                    return;
                }

                // Stop immediately so we don't process further speech
                if (recognition) {
                    recognition.stop();
                }

                console.log('[VOICE] submitting transcript');
                appendMessage(`(🎙️) ${transcript}`, 'user');
                sendChatToBackend(transcript);
            };

            recog.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                stopListeningUI();
                if (event.error === 'not-allowed') {
                    alert('माइक्रोफ़ोन एक्सेस की अनुमति नहीं है। कृपया ब्राउज़र सेटिंग्स चेक करें। (Microphone access denied.)');
                }
            };

            recog.onend = () => {
                console.log('[VOICE] recognition ended');
                stopListeningUI();
                // Clean up instance so a fresh one is created next time
                recognition = null;
            };

            return recog;
        }

        // --- Toggle Speech Recognition ---
        async function toggleSpeechRecognition() {
            await unlockAudio();

            // Do not start a new recording while a fetch is pending
            if (isProcessing && !isListening) return;

            if (isListening) {
                if (recognition) recognition.stop();
                stopListeningUI();
            } else {
                // Ensure any old instance is cleaned up
                if (recognition) {
                    try { recognition.stop(); } catch(e) {}
                    recognition = null;
                }
                
                recognition = initSpeechRecognition();
                if (!recognition) return;
                
                // Do NOT set recognition.lang so that speech is transcribed naturally
                // recognition.lang = selectedLanguage;
                
                try {
                    recognition.start();
                    startListeningUI();
                } catch (e) {
                    console.error('Failed to start speech recognition:', e);
                }
            }
        }

        function startListeningUI() {
            isListening = true;
            recordBtn.classList.replace('bg-blue-500', 'bg-red-500');
            recordBtn.classList.replace('hover:bg-blue-600', 'hover:bg-red-600');
            recordBtn.classList.add('pulse-animation');
            recordIcon.classList.replace('fa-microphone', 'fa-stop');
            recordingStatus.textContent = listeningText[selectedLanguage] || listeningText['hi-IN'];
            recordingStatus.classList.remove('hidden');
        }

        function stopListeningUI() {
            isListening = false;
            recordBtn.classList.replace('bg-red-500', 'bg-blue-500');
            recordBtn.classList.replace('hover:bg-red-600', 'hover:bg-blue-600');
            recordBtn.classList.remove('pulse-animation');
            recordIcon.classList.replace('fa-stop', 'fa-microphone');
            recordingStatus.classList.add('hidden');
        }

        // --- Send chat message to /chat endpoint ---
        // FRONTEND_TIMEOUT_MS: 60 000ms — last-resort safety net only.
        // The server enforces its own 20s asyncio.wait_for timeout and will
        // always return a clean HTTP response long before this fires.
        // A short AbortController timeout is the #1 cause of premature client
        // disconnects, so we keep this high and rely on the server ceiling.
        const FRONTEND_TIMEOUT_MS = 60000;

        // Localised "Thinking..." status text shown while a request is in-flight
        const thinkingText = {
            'hi-IN': '🤔 सोच रहा हूँ...',
            'ta-IN': '🤔 யோசிக்கிறேன்...',
            'te-IN': '🤔 ఆలోచిస్తున్నాను...',
            'bn-IN': '🤔 ভাবছি...',
            'mr-IN': '🤔 विचार करत आहे...',
            'gu-IN': '🤔 વિચારી રહ્યો છું...',
            'kn-IN': '🤔 ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ...',
            'ml-IN': '🤔 ചിന്തിക്കുന്നു...',
            'pa-IN': '🤔 ਸੋਚ ਰਿਹਾ ਹਾਂ...',
            'or-IN': '🤔 ଭାବୁଛି...',
            'ur-IN': '🤔 سوچ رہا ہوں...',
            'en-IN': '🤔 Thinking / सोच रहा हूँ...'
        };

        // --- Farm Profile & Conversational History State ---
        let farmerProfile = { state: "", district: "", soilType: "", crop: "" };
        let chatHistory = [];

        function loadFarmerProfile() {
            try {
                const saved = localStorage.getItem('saathi_farmer_profile');
                if (saved) {
                    farmerProfile = JSON.parse(saved);
                    document.getElementById('prof-state').value = farmerProfile.state || '';
                    document.getElementById('prof-district').value = farmerProfile.district || '';
                    document.getElementById('prof-soil').value = farmerProfile.soilType || '';
                    document.getElementById('prof-crop').value = farmerProfile.crop || '';
                }
            } catch (e) {
                console.error('Failed to load farmer profile:', e);
            }
        }

        function saveFarmerProfile() {
            farmerProfile = {
                state: document.getElementById('prof-state').value.trim(),
                district: document.getElementById('prof-district').value.trim(),
                soilType: document.getElementById('prof-soil').value.trim(),
                crop: document.getElementById('prof-crop').value.trim()
            };
            localStorage.setItem('saathi_farmer_profile', JSON.stringify(farmerProfile));
            closeProfileModal();
        }

        function openProfileModal() {
            document.getElementById('profile-modal').classList.remove('hidden');
        }

        function closeProfileModal() {
            document.getElementById('profile-modal').classList.add('hidden');
        }

        window.addEventListener('DOMContentLoaded', () => {
            console.log("[INIT] textInput:", textInput);
            console.log("[INIT] sendBtn:", sendBtn);
            console.log("[INIT] recordBtn:", recordBtn);
            console.log("[INIT] chatContainer:", chatContainer);
            loadFarmerProfile();
        });

        // --- TTS and Audio Utilities ---
        async function unlockAudio() {
            try {
                if (!audioPlayer.src) {
                    audioPlayer.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"; // empty 1ms audio to initialize
                }
                audioPlayer.muted = true;
                const playPromise = audioPlayer.play();
                if (playPromise !== undefined) {
                    await playPromise.catch(() => {});
                }
                audioPlayer.pause();
                audioPlayer.currentTime = 0;
                audioPlayer.muted = false;
                console.log("[TTS] audio unlocked");
            } catch (error) {
                console.warn("[TTS] audio unlock failed", error);
            }
        }


        // --- TTS and Audio Utilities ---
        async function unlockAudio() {
            try {
                audioPlayer.muted = true;
                await audioPlayer.play().catch(() => {});
                audioPlayer.pause();
                audioPlayer.currentTime = 0;
                audioPlayer.muted = false;
                console.log("[TTS] audio unlocked");
            } catch (error) {
                console.warn("[TTS] audio unlock failed", error);
            }
        }

        function cleanTextForSpeech(text) {
            return text
                .replace(/[*_`#]/g, "")
                .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
                .replace(/\s+/g, " ")
                .trim();
        }

        function speakWithBrowserTTS(text, language) {
            if (!("speechSynthesis" in window)) {
                console.warn("[TTS] Browser speech synthesis unavailable");
                return;
            }

            speechSynthesis.cancel();
            
            const cleanedText = cleanTextForSpeech(text);
            const utterance = new SpeechSynthesisUtterance(cleanedText);
            utterance.lang = language;
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            const voices = speechSynthesis.getVoices();
            const matchingVoice = voices.find(
                voice => voice.lang.toLowerCase() === language.toLowerCase()
            );

            if (matchingVoice) {
                utterance.voice = matchingVoice;
            }

            utterance.onstart = () => console.log("[TTS] browser speech started");
            utterance.onend = () => console.log("[TTS] browser speech ended");
            utterance.onerror = (event) => console.error("[TTS] browser speech error:", event.error);

            speechSynthesis.speak(utterance);
        }

        async function playBackendTTS(text, langCode) {
            console.log('[TTS] request started');
            const response = await fetch(`${API_BASE}/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    language_code: langCode
                })
            });

            if (!response.ok) {
                throw new Error(`TTS failed with status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.audio_base64) {
                console.log('[TTS] audio received');
                const binaryString = atob(data.audio_base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                console.log(`[TTS] audio bytes: ${bytes.length}`);
                if (bytes.length === 0) {
                    throw new Error("Received empty audio bytes");
                }
                
                const mimeType = data.mime_type || "audio/wav";
                console.log(`[TTS] MIME: ${mimeType}`);

                const audioBlob = new Blob([bytes], { type: mimeType });
                
                if (audioUrl) {
                    URL.revokeObjectURL(audioUrl);
                }
                audioUrl = URL.createObjectURL(audioBlob);
                audioPlayer.src = audioUrl;

                audioPlayer.volume = 1.0;
                audioPlayer.muted = false;
                
                console.log("[TTS] muted:", audioPlayer.muted);
                console.log("[TTS] volume:", audioPlayer.volume);
                console.log("[TTS] src:", audioPlayer.src.substring(0, 50));

                audioPlayer.onloadedmetadata = () => {
                    console.log("[TTS] audio loaded, metadata loaded", audioPlayer.duration);
                };
                audioPlayer.oncanplay = () => console.log("[TTS] audio can play");
                audioPlayer.onplay = () => console.log("[TTS] PLAY EVENT");
                audioPlayer.onplaying = () => console.log("[TTS] PLAYING EVENT");
                audioPlayer.onpause = () => console.log("[TTS] PAUSE EVENT");
                
                audioPlayer.onended = () => {
                    console.log('[TTS] playback ended');
                    console.log('[TTS] ENDED EVENT');
                    URL.revokeObjectURL(audioUrl);
                    audioUrl = null;
                };

                audioPlayer.onerror = () => {
                    console.error("[TTS] AUDIO ERROR", audioPlayer.error);
                };

                await audioPlayer.play();
                console.log('[TTS] playback started successfully');
            } else {
                throw new Error("No audio returned from backend");
            }
        }

        // Fallback removed here. Now handled in playBackendTTS error.

        // --- Check Backend Health ---
        async function checkHealth() {
            try {
                const res = await fetch(`${API_BASE}/health`);
                if(res.ok) {
                    statusIndicator.classList.remove('bg-red-500');
                    statusIndicator.classList.add('bg-green-500');
                    statusText.innerText = '🟢 Online';
                } else {
                    throw new Error('Health check returned non-OK status');
                }
            } catch (error) {
                console.error('Backend health check failed:', error);
                statusIndicator.classList.remove('bg-green-500');
                statusIndicator.classList.add('bg-red-500');
                statusText.innerText = '🔴 Offline';
            }
        }
        checkHealth();

        // --- UI Helpers ---
        function scrollToBottom() {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function appendMessage(text, sender = 'user', isError = false) {
            const wrapper = document.createElement('div');
            wrapper.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`;
            
            const bubble = document.createElement('div');
            
            if (sender === 'user') {
                bubble.className = 'bg-agri-600 text-white p-3 rounded-2xl rounded-tr-none max-w-[80%] shadow-sm break-words';
            } else {
                bubble.className = `p-3 rounded-2xl rounded-tl-none max-w-[80%] shadow-sm border ${isError ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-800 border-gray-100'}`;
            }
            
            bubble.innerText = text;
            wrapper.appendChild(bubble);
            chatContainer.appendChild(wrapper);
            scrollToBottom();
            return wrapper;
        }

        function appendTypingIndicator() {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex justify-start typing-indicator-wrapper';
            wrapper.innerHTML = `
                <div class="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 flex space-x-2 items-center">
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0s"></div>
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
                </div>
            `;
            chatContainer.appendChild(wrapper);
            scrollToBottom();
            return wrapper;
        }

        function removeTypingIndicator() {
            const indicators = document.querySelectorAll('.typing-indicator-wrapper');
            indicators.forEach(ind => ind.remove());
        }

        async function sendMessage() {
            if (isProcessing) return;

            const input = textInput.value.trim();
            if (!input) return;

            console.log("[CHAT] sendMessage started:", input);

            // Unlock audio from user interaction.
            await unlockAudio().catch(error => {
                console.warn("[TTS] audio unlock failed:", error);
            });

            // IMMEDIATELY display user's message.
            appendMessage(input, "user");
            console.log("[CHAT] user message appended");

            // Clear input.
            textInput.value = "";

            // Prevent duplicate requests.
            isProcessing = true;
            setButtonsDisabled(true);

            // Show typing indicator.
            appendTypingIndicator();
            recordingStatus.textContent = thinkingText[selectedLanguage] || thinkingText['en-IN'];
            recordingStatus.classList.remove('hidden');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), FRONTEND_TIMEOUT_MS);

            // Add user turn to history
            chatHistory.push({ role: "user", content: input });
            if (chatHistory.length > 10) chatHistory = chatHistory.slice(-10);

            let aiResponse = "";
            let responseLang = "en-IN";

            try {
                console.log("[CHAT] POST /chat started");
                
                const payload = {
                    message: input,
                    generate_audio: false, // Start without audio to ensure chat is fast
                    history: chatHistory,
                    profile: farmerProfile
                };
                console.log("[CHAT] request payload prepared:", payload);

                const response = await fetch(`${API_BASE}/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                console.log("[CHAT] POST /chat completed");
                console.log("[CHAT] HTTP status:", response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("[CHAT] backend error:", response.status, errorText);
                    throw new Error(`Chat request failed: ${response.status}`);
                }

                const data = await response.json();
                console.log("[CHAT] JSON response received:", data);

                aiResponse = data.ai_response || data.response || data.message;
                if (!aiResponse) {
                    console.error("[CHAT] Missing ai_response:", data);
                    throw new Error("Backend returned no AI response");
                }
                console.log("[CHAT] AI response extracted");

                if (data.detected_language_bcp47) {
                    responseLang = data.detected_language_bcp47;
                    updateUIForLanguage(responseLang);
                }
                const detectedName = data.detected_language || 'Auto';
                document.getElementById('lang-indicator-text').textContent = detectedName;

            } catch (error) {
                console.error("[CHAT] request failed:", error);
                
                let displayError;
                if (error.name === 'AbortError') {
                    displayError = timeoutErrorTexts[selectedLanguage] || timeoutErrorTexts['en-IN'];
                } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
                    displayError = networkErrorTexts[selectedLanguage] || networkErrorTexts['en-IN'];
                } else {
                    displayError = "I'm having trouble connecting right now. Please try again.";
                }
                aiResponse = displayError;
            } finally {
                clearTimeout(timeoutId);
                removeTypingIndicator();
                isProcessing = false;
                setButtonsDisabled(false);
                recordingStatus.classList.add('hidden');
            }

            // ONLY AFTER network is done, show the AI message
            appendMessage(aiResponse, "ai", aiResponse.includes("error") || aiResponse.includes("trouble") || aiResponse.includes("त्रुटि"));
            console.log("[CHAT] AI message appended");

            chatHistory.push({ role: "assistant", content: aiResponse });
            if (chatHistory.length > 10) chatHistory = chatHistory.slice(-10);

            // Now optionally trigger TTS asynchronously, DO NOT AWAIT it
            console.log("[TTS] request started");
            
            // Stop any playing TTS first
            if (!audioPlayer.paused) {
                audioPlayer.pause();
                audioPlayer.currentTime = 0;
            }
            speechSynthesis.cancel();
            
            const cleanedText = cleanTextForSpeech(aiResponse);
            playBackendTTS(cleanedText, responseLang).catch(err => {
                console.error("[TTS] backend TTS failed, falling back", err);
                speakWithBrowserTTS(cleanedText, responseLang);
            });
        }

        function setButtonsDisabled(disabled) {
            textInput.disabled = disabled;
            sendBtn.disabled = disabled;
            recordBtn.disabled = disabled;
        }

        // Attach event listeners
        sendBtn.addEventListener("click", async (event) => {
            event.preventDefault();
            console.log("[CHAT] SEND BUTTON CLICKED");
            await sendMessage();
        });

        recordBtn.addEventListener("click", async (event) => {
            event.preventDefault();
            toggleSpeechRecognition();
        });

        textInput.addEventListener("keydown", async (event) => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                console.log("[CHAT] ENTER PRESSED");
                await sendMessage();
            }
        });
