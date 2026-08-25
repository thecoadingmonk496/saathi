const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL || (import.meta.env.DEV ? 'http://localhost:8001' : 'https://saathi-backend-7t91.onrender.com');

export async function processVoiceQuery(transcript, language = 'English') {
  if (!transcript || !transcript.trim()) {
    return { response: "I didn't catch that. Could you please repeat?", action: null, audioBase64: null };
  }

  try {
    // 1. Get AI Text Response
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const chatRes = await fetch(`${FASTAPI_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: transcript,
        history: [],
        profile: {}
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!chatRes.ok) {
      console.error(`FastAPI /chat error: ${chatRes.status} ${chatRes.statusText}`);
      return { 
        response: "I'm having trouble connecting to my brain right now. Please try again later.", 
        action: null, 
        audioBase64: null 
      };
    }

    const chatData = await chatRes.json();
    const aiResponse = chatData.ai_response || "Sorry, I couldn't generate a response.";

    // 2. Synthesize Audio for the AI Response
    let audioBase64 = null;
    try {
      const languageMap = {
        English: 'en-IN',
        Hindi: 'hi-IN',
        Marathi: 'mr-IN',
        Punjabi: 'pa-IN',
        Bengali: 'bn-IN',
        Telugu: 'te-IN',
        Tamil: 'ta-IN',
        Gujarati: 'gu-IN',
        Kannada: 'kn-IN',
        Malayalam: 'ml-IN',
        Odia: 'or-IN',
        Assamese: 'as-IN'
      };
      
      const ttsRes = await fetch(`${FASTAPI_URL}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: aiResponse,
          language_code: languageMap[language] || 'hi-IN',
          speaker: 'shubh'
        }),
      });

      if (ttsRes.ok) {
        const ttsData = await ttsRes.json();
        audioBase64 = ttsData.audio_base64 || null;
      } else {
        console.warn(`FastAPI /tts error: ${ttsRes.status}`);
      }
    } catch (ttsErr) {
      console.warn('Failed to synthesize TTS, continuing with text only.', ttsErr);
    }

    return {
      response: aiResponse,
      action: null, 
      audioBase64
    };

  } catch (error) {
    console.error('Failed to connect to FastAPI voice bot:', error);
    return { 
      response: "Unable to connect to Saathi AI. Please try again.", 
      action: null, 
      audioBase64: null 
    };
  }
}
