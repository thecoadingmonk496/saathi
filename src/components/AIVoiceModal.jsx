import { useEffect, useRef, useState } from 'react';
import { MicrophoneIcon, PaperAirplaneIcon, SpeakerWaveIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { processVoiceQuery } from '../utils/voiceEngine';
import { useUser } from '../context/UserContext';

const languageTagMap = {
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
  Assamese: 'as-IN',
};

const naturalFemaleVoiceKeywords = [
  'female', 'woman', 'natural', 'neural', 'swara', 'heera', 'neerja', 'kalpana', 'veena',
  'kavya', 'shruti', 'ananya', 'geeta', 'meera', 'zira', 'samantha', 'jenny',
  'victoria', 'google हिन्दी', 'google us english', 'google uk english female'
];

function prepareNaturalSpeechText(text, langTag) {
  if (!text) return '';
  const isHindi = langTag.startsWith('hi');
  let speechText = text
    .replace(/₹\s*([\d,]+)/g, isHindi ? '$1 रुपये' : '$1 rupees')
    .replace(/quintal/g, isHindi ? t('explorer.qtl') : 'quintal')
    .replace(/(\d+)\s*km/g, isHindi ? '$1 किलोमीटर' : '$1 kilometers');
  return speechText;
}

export default function AIVoiceModal({ onClose, onResponse, preferredLanguage = 'Hindi', onNavigate }) {
  const { t } = useUser();
  const [status, setStatus] = useState('listening'); 
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [responseText, setResponseText] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [voices, setVoices] = useState([]);

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const langTag = languageTagMap[preferredLanguage] || 'hi-IN';

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices && availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };

    loadVoices();

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    // Pre-warm the backend AI and TTS engine to eliminate cold-start latency
    fetch('https://saathi-backend-7t91.onrender.com/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'ping', language: 'en-IN' })
    }).catch(() => {});
    
    fetch('https://saathi-backend-7t91.onrender.com/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: ' ', language_code: 'en-IN' })
    }).catch(() => {});

    if (!SpeechRecognition) {
      setIsSupported(false);
      setStatus('error');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = langTag;

      recognition.onstart = () => {
        setStatus('listening');
      };

      recognition.onresult = (event) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) {
            currentFinal += result[0].transcript;
          } else {
            currentInterim += result[0].transcript;
          }
        }

        if (currentFinal) {
          setTranscript((prev) => (prev ? `${prev} ${currentFinal}` : currentFinal));
          setInterimTranscript('');
          handleFinalSpeech(currentFinal);
        } else {
          setInterimTranscript(currentInterim);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setStatus('error');
        }
      };

      recognition.onend = () => {
        setInterimTranscript((prevInterim) => {
          if (prevInterim && !transcript) {
            setTranscript(prevInterim);
            handleFinalSpeech(prevInterim);
          }
          return '';
        });
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      setIsSupported(false);
      setStatus('error');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch { }
      }
      if (audioRef.current) {
        try { audioRef.current.stop(); } catch (e) {}
        try { audioRef.current.disconnect(); } catch (e) {}
        audioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [langTag]);

  const selectVoiceForLanguage = (targetLangTag) => {
    if (!voices || voices.length === 0) return null;
    const baseLang = targetLangTag.split('-')[0];

    const isFemaleVoice = (v) => naturalFemaleVoiceKeywords.some((kw) => v.name.toLowerCase().includes(kw));

    let matched = voices.find((v) => (v.lang === targetLangTag || v.lang.replace('_', '-') === targetLangTag) && isFemaleVoice(v));

    if (!matched) {
      matched = voices.find((v) => v.lang.startsWith(baseLang) && isFemaleVoice(v));
    }

    if (!matched) {
      matched = voices.find((v) => v.lang === targetLangTag || v.lang.replace('_', '-') === targetLangTag || v.lang.startsWith(baseLang));
    }

    if (!matched) {
      const indianFemaleFallback = voices.find((v) => (v.lang.startsWith('hi') || v.lang.includes('IN')) && isFemaleVoice(v));
      if (indianFemaleFallback) {
        matched = indianFemaleFallback;
      }
    }

    if (!matched) {
      const globalFemale = voices.find(isFemaleVoice);
      if (globalFemale) {
        matched = globalFemale;
      }
    }

    return matched || voices[0] || null;
  };

  const speakText = (text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) {
      setStatus('done');
      return;
    }

    if (audioRef.current) {
      try { audioRef.current.stop(); } catch (e) {}
      try { audioRef.current.disconnect(); } catch (e) {}
      audioRef.current = null;
    }

    try {
      window.speechSynthesis.cancel(); 

      const naturalText = prepareNaturalSpeechText(text, langTag);
      const utterance = new SpeechSynthesisUtterance(naturalText);

      utterance.lang = langTag;
      utterance.rate = 0.88; 
      utterance.pitch = 1.0; 
      utterance.volume = 1.0;

      const pleasantVoice = selectVoiceForLanguage(langTag);
      if (pleasantVoice) {
        utterance.voice = pleasantVoice;
      }

      utterance.onstart = () => {
        setStatus('speaking');
      };

      utterance.onend = () => {
        setStatus('done');
      };

      utterance.onerror = (err) => {
        console.warn('Speech synthesis error:', err);
        setStatus('done');
      };

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('TTS execution error:', e);
      setStatus('done');
    }
  };

  const isProcessingRef = useRef(false);

  const handleFinalSpeech = async (queryText) => {
    if (!queryText.trim() || isProcessingRef.current) return;
    isProcessingRef.current = true;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { }
    }

    setStatus('thinking');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch('https://saathi-backend-7t91.onrender.com/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ 
          message: queryText,
          language: preferredLanguage,
          history: [],
          profile: {} 
        })
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('Live AI backend request failed');
      
      const data = await res.json();
      let aiResponse = data.ai_response;

      if (aiResponse && aiResponse.toLowerCase().includes('server is busy')) {
        throw new Error('Backend returned busy message');
      }
      
      setResponseText(aiResponse);
      onResponse?.(aiResponse);

      // Try fetching premium TTS from backend
      try {
        const ttsRes = await fetch('https://saathi-backend-7t91.onrender.com/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: aiResponse,
            language_code: data.detected_language_bcp47 || langTag
          })
        });
        
        if (ttsRes.ok) {
          const ttsData = await ttsRes.json();
          if (ttsData.audio_base64) {
            setStatus('speaking');
            
            if (audioRef.current) {
              try { audioRef.current.stop(); } catch (e) {}
              try { audioRef.current.disconnect(); } catch (e) {}
            }
            if (window.sharedAudioContext) {
              try {
                const binaryString = window.atob(ttsData.audio_base64);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                try {
                  const buffer = await new Promise((resolve, reject) => {
                    try {
                      const decodePromise = window.sharedAudioContext.decodeAudioData(bytes.buffer, resolve, reject);
                      if (decodePromise && typeof decodePromise.then === 'function') {
                        decodePromise.then(resolve).catch(reject);
                      }
                    } catch (err) {
                      reject(err);
                    }
                  });
                  
                  // Ensure browser TTS is absolutely stopped before playing backend audio
                  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                  }
                  
                  const source = window.sharedAudioContext.createBufferSource();
                  source.buffer = buffer;
                  source.connect(window.sharedAudioContext.destination);
                  
                  source.onended = () => {
                    setStatus('done');
                    isProcessingRef.current = false;
                    if (audioRef.current === source) audioRef.current = null;
                  };
                  
                  audioRef.current = source;
                  source.start(0);
                  
                  // Successfully played backend voice, explicitly return to prevent fallback
                  return; 
                } catch (decodeErr) {
                  console.warn('Decode error', decodeErr);
                  // Allow fall through to speakText
                }
              } catch (e) {
                console.warn('Web Audio playback failed:', e);
                // Allow fall through to speakText
              }
            }
          }
        }
      } catch (ttsErr) {
        console.warn('Premium TTS fetch failed:', ttsErr);
      }
      
      // Fallback to browser TTS if backend TTS failed, Web Audio failed, or decode failed
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Prevent collision with any stuck browser TTS
      }
      speakText(aiResponse);
      isProcessingRef.current = false;

    } catch (e) {
      console.warn('Live AI failed, falling back to local engine:', e);
      // Fallback to local rule-based engine
      const { response, action } = processVoiceQuery(queryText, preferredLanguage);
      setResponseText(response);
      onResponse?.(response);
      speakText(response);
      isProcessingRef.current = false;

      if (action && action.type === 'NAVIGATE' && action.path) {
        window.setTimeout(() => {
          onNavigate?.(action.path);
        }, 1800);
      }
    }
  };

  const handleRestartListening = () => {
    isProcessingRef.current = false;
    if (audioRef.current) {
      try { audioRef.current.stop(); } catch (e) {}
      try { audioRef.current.disconnect(); } catch (e) {}
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    // Unlock Audio Context again on manual restart
    if (window.sharedAudioContext && window.sharedAudioContext.state === 'suspended') {
      window.sharedAudioContext.resume();
    }

    setTranscript('');
    setInterimTranscript('');
    setResponseText('');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setStatus('listening');
      } catch {
        setStatus('listening');
      }
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    setTranscript(textInput);
    handleFinalSpeech(textInput);
    setTextInput('');
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const displayTranscript = transcript || interimTranscript;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-voice-modal-title"
        className="w-full max-w-xl rounded-lg border border-[var(--saathi-border-light)] bg-white p-5 shadow-2xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full overflow-hidden text-white shadow-lg ${
                status === 'listening'
                  ? 'animate-pulse bg-[var(--saathi-primary)] shadow-red-900/30 ring-4 ring-red-200'
                  : status === 'speaking'
                  ? 'bg-slate-600 shadow-slate-900/30 ring-4 ring-slate-200'
                  : 'bg-slate-700 shadow-slate-900/20'
              }`}
            >
              <img src="/saathi-mic-logo.png" alt="SAATHI logo" className="h-9 w-9 rounded-full bg-[#fdfbf7] object-contain p-1" />
            </span>
            <div>
              <h2 id="ai-voice-modal-title" className="text-2xl font-extrabold text-[var(--saathi-text)]">
                {status === 'listening' && (t('ai.listening') || t('ai.listening'))}
                {status === 'thinking' && (t('ai.thinking') || t('ai.thinking'))}
                {status === 'speaking' && (t('ai.speaking') || t('ai.speaking'))}
                {status === 'done' && (t('ai.responseReady') || t('ai.responseReady'))}
                {status === 'error' && (t('ai.title') || 'SAATHI AI Assistant')}
              </h2>
              <p className="mt-0.5 text-xs font-bold text-[#15803D]">
                {t('ai.languageLabel')}: <span className="underline">{preferredLanguage}</span> ({langTag})
              </p>
            </div>
          </div>

          <button
            aria-label="Close voice assistant"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-[var(--saathi-text-muted)] transition hover:bg-slate-200 hover:text-[var(--saathi-text-secondary)] focus:outline-none focus:ring-4 focus:ring-slate-200"
            type="button"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="mt-6 rounded-2xl border border-red-100 bg-gradient-to-b from-red-50/90 to-slate-50/50 p-5">
          <div className="flex h-20 items-end justify-center gap-2" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
              <span
                key={bar}
                className={`block w-2.5 rounded-full transition-all duration-300 ${
                  status === 'listening'
                    ? 'voice-wave-bar bg-[var(--saathi-primary)] shadow-md shadow-red-900/20'
                    : status === 'speaking'
                    ? 'animate-pulse bg-slate-600 shadow-md h-14'
                    : 'h-4 bg-slate-300'
                }`}
                style={{ animationDelay: `${bar * 100}ms` }}
              />
            ))}
          </div>

          <div className="mt-4 rounded-md bg-white p-4 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                {responseText ? t('ai.answerLabel') : t('ai.queryLabel')}
              </p>
              {responseText && (
                <button
                  type="button"
                  onClick={() => speakText(responseText)}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-[#065f46] hover:bg-slate-200 transition hover:scale-105"
                >
                  <SpeakerWaveIcon className="h-3.5 w-3.5" />
                  {t('ai.playVoice') || t('ai.playVoice')}
                </button>
              )}
            </div>

            <p className="mt-1.5 min-h-12 text-base font-bold leading-7 text-[var(--saathi-text)] sm:text-lg">
              {responseText || displayTranscript || (
                <span className="italic text-slate-400">
                  {status === 'listening' ? t('ai.speakPrompt') : t('ai.typePrompt')}
                </span>
              )}
            </p>
          </div>
        </div>

        <form onSubmit={handleManualSubmit} className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={t('ai.typePlaceholder') || t('ai.typePlaceholder')}
            className="flex-1 rounded-md border border-[var(--saathi-border-light)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--saathi-text)] outline-none transition placeholder:text-slate-400 focus:border-[#15803D] focus:ring-2 focus:ring-red-100"
          />
          <button
            type="submit"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--saathi-primary)] text-white shadow-sm transition hover:bg-[var(--saathi-primary-hover)] focus:outline-none focus:ring-2 focus:ring-red-200"
            aria-label="Send question"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </form>

        {!isSupported && (
          <p className="mt-2 text-xs font-semibold text-red-600">
            {t('ai.notSupported')}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {status === 'listening' ? (
            <button
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
              type="button"
              onClick={() => {
                if (recognitionRef.current) {
                  try {
                    recognitionRef.current.stop();
                  } catch { }
                }
                if (transcript) handleFinalSpeech(transcript);
                else setStatus('done');
              }}
            >
              {t('ai.stopProcess') || t('ai.stopProcess')}
            </button>
          ) : (
            <button
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--saathi-primary)] px-5 text-sm font-bold text-white transition hover:bg-[var(--saathi-primary-hover)] focus:outline-none focus:ring-4 focus:ring-red-200"
              type="button"
              onClick={handleRestartListening}
            >
              <img src="/saathi-mic-logo.png" alt="SAATHI logo" className="h-5 w-5 rounded-full bg-[#fdfbf7] object-contain p-0.5" />
              {t('ai.speakAgain') || t('ai.speakAgain')}
            </button>
          )}

          <button
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-[var(--saathi-border-light)] bg-white px-5 text-sm font-bold text-[var(--saathi-text-secondary)] transition hover:bg-[var(--saathi-surface-alt)] focus:outline-none focus:ring-4 focus:ring-slate-200"
            type="button"
            onClick={onClose}
          >
            {t('ai.close') || t('ai.close')}
          </button>
        </div>
      </section>
    </div>
  );
}
