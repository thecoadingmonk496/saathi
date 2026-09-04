import { useEffect, useRef, useState } from 'react';
import { MicrophoneIcon, PaperAirplaneIcon, SpeakerWaveIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { processVoiceQuery } from '../utils/voiceEngine';
import { useUser } from '../context/UserContext';

const API_BASE = import.meta.env.VITE_FASTAPI_URL || 'https://saathi-backend-7t91.onrender.com';

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
    .replace(/quintal/g, isHindi ? 'क्विंटल' : 'quintal')
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

  // Chat history: array of { role: 'user' | 'assistant', content: string }
  const [chatHistory, setChatHistory] = useState([]);

  const recognitionRef = useRef(null);
  const audioPlayerRef = useRef(typeof Audio !== 'undefined' ? new Audio() : null);
  const audioUrlRef = useRef(null);
  const chatEndRef = useRef(null);
  const isProcessingRef = useRef(false);
  const langTag = languageTagMap[preferredLanguage] || 'hi-IN';

  // Auto-scroll to latest message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, responseText]);

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

  const playAudioBase64 = async (audioBase64, mimeType = 'audio/wav') => {
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      const binaryString = window.atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBlob = new Blob([bytes], { type: mimeType });
      audioUrlRef.current = URL.createObjectURL(audioBlob);
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio();
      }
      audioPlayerRef.current.src = audioUrlRef.current;
      audioPlayerRef.current.volume = 1.0;
      setStatus('speaking');
      audioPlayerRef.current.onended = () => {
        setStatus('done');
        isProcessingRef.current = false;
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };
      await audioPlayerRef.current.play();
      return true;
    } catch (err) {
      console.warn('HTML5 Audio playback error:', err);
      return false;
    }
  };

  const startRecognition = () => {
    if (isProcessingRef.current) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setStatus('error');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = langTag;

      recognition.onstart = () => {
        setStatus('listening');
      };

      recognition.onresult = (event) => {
        if (isProcessingRef.current) return;
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
        console.warn('Speech recognition notice:', event.error);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          if (!isProcessingRef.current) setStatus('done');
        }
      };

      recognition.onend = () => {
        if (isProcessingRef.current) return;
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
  };

  useEffect(() => {
    startRecognition();

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      if (audioPlayerRef.current && !audioPlayerRef.current.paused) {
        audioPlayerRef.current.pause();
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
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

    if (!matched || !isFemaleVoice(matched)) {
      const indianFemaleFallback = voices.find((v) => (v.lang.startsWith('hi') || v.lang.includes('IN')) && isFemaleVoice(v));
      if (indianFemaleFallback) {
        matched = indianFemaleFallback;
      }
    }

    if (!matched || !isFemaleVoice(matched)) {
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

  const replayMessage = async (text) => {
    if (audioPlayerRef.current && !audioPlayerRef.current.paused) {
      audioPlayerRef.current.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    try {
      const res = await fetch(`${API_BASE}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          language_code: langTag,
          speaker: 'shubh'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audio_base64) {
          const played = await playAudioBase64(data.audio_base64, data.mime_type || 'audio/wav');
          if (played) return;
        }
      }
    } catch (e) {
      console.warn('Replay TTS fetch failed:', e);
    }
    speakText(text);
  };

  const handleFinalSpeech = async (queryText) => {
    if (!queryText.trim() || isProcessingRef.current) return;
    isProcessingRef.current = true;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { }
    }

    // Add user message to chat history
    const userMessage = { role: 'user', content: queryText.trim() };
    setChatHistory((prev) => [...prev, userMessage]);

    setStatus('thinking');

    try {
      // Build history array for backend context (previous messages in this session)
      const historyForBackend = chatHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: queryText,
          language: preferredLanguage,
          history: historyForBackend,
          profile: {} 
        })
      });

      if (!res.ok) throw new Error(`Backend request failed with status: ${res.status}`);
      
      const data = await res.json();
      let aiResponse = data.ai_response || "Sorry, I couldn't understand that.";

      // Add assistant message to chat history
      setChatHistory((prev) => [...prev, { role: 'assistant', content: aiResponse }]);
      setResponseText(aiResponse);
      onResponse?.(aiResponse);

      // Fetch premium Sarvam TTS from backend
      try {
        const ttsRes = await fetch(`${API_BASE}/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: aiResponse,
            language_code: data.detected_language_bcp47 || langTag,
            speaker: 'shubh'
          })
        });
        
        if (ttsRes.ok) {
          const ttsData = await ttsRes.json();
          if (ttsData.audio_base64) {
            const played = await playAudioBase64(ttsData.audio_base64, ttsData.mime_type || 'audio/wav');
            if (played) return;
          }
        }
      } catch (ttsErr) {
        console.warn('Premium Sarvam TTS fetch failed:', ttsErr);
      }
      
      // Fallback only if Sarvam TTS was unreachable
      speakText(aiResponse);
      isProcessingRef.current = false;

    } catch (e) {
      console.warn('Live AI failed, falling back to local engine:', e);
      // Fallback to local rule-based engine
      const { response, action } = processVoiceQuery(queryText, preferredLanguage);

      // Add assistant message to chat history
      setChatHistory((prev) => [...prev, { role: 'assistant', content: response }]);
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
    if (audioPlayerRef.current && !audioPlayerRef.current.paused) {
      audioPlayerRef.current.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setTranscript('');
    setInterimTranscript('');
    setResponseText('');

    startRecognition();
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessingRef.current) return;
    const inputVal = textInput;
    setTextInput('');
    setTranscript(inputVal);
    handleFinalSpeech(inputVal);
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
        className="flex w-full max-w-xl flex-col rounded-lg border border-[var(--saathi-border-light)] bg-white shadow-2xl sm:max-h-[85vh]"
        style={{ maxHeight: '90vh' }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header - Fixed */}
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-7 pb-4 sm:pb-5">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full overflow-hidden shadow-lg ${
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
                {status === 'listening' && (t('ai.listening') || 'Listening...')}
                {status === 'thinking' && (t('ai.thinking') || 'SAATHI is thinking...')}
                {status === 'speaking' && (t('ai.speaking') || 'SAATHI is speaking...')}
                {status === 'done' && (t('ai.responseReady') || 'Response Ready')}
                {status === 'error' && (t('ai.title') || 'SAATHI AI Assistant')}
              </h2>
              <p className="mt-0.5 text-xs font-bold text-[#15803D]">
                {t('ai.languageLabel') || 'Language'}: <span className="underline">{preferredLanguage}</span> ({langTag})
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

        {/* Scrollable Chat Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 pt-4 sm:pt-5" style={{ minHeight: '200px', maxHeight: '50vh' }}>
          
          {/* Previous chat messages */}
          {chatHistory.length > 0 && (
            <div className="mb-4 space-y-3">
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-semibold leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-[var(--saathi-primary)] text-white rounded-br-md'
                        : 'bg-gradient-to-br from-emerald-50 to-green-50 text-[var(--saathi-text)] border border-emerald-100 rounded-bl-md'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="mb-1 flex items-center gap-1.5">
                        <img src="/saathi-mic-logo.png" alt="" className="h-4 w-4 rounded-full bg-[#fdfbf7] object-contain" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">SAATHI</span>
                        <button
                          type="button"
                          onClick={() => replayMessage(msg.content)}
                          className="ml-auto inline-flex items-center gap-0.5 rounded bg-emerald-100/70 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-200 transition"
                          aria-label="Play this response"
                        >
                          <SpeakerWaveIcon className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {msg.role === 'user' && (
                      <p className="mb-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white/70">You</p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Current active area - Listening/Thinking indicator */}
          <div className="rounded-2xl border border-red-100 bg-gradient-to-b from-red-50/90 to-slate-50/50 p-4">
            <div className="flex h-16 items-end justify-center gap-2" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
                <span
                  key={bar}
                  className={`block w-2.5 rounded-full transition-all duration-300 ${
                    status === 'listening'
                      ? 'voice-wave-bar bg-[var(--saathi-primary)] shadow-md shadow-red-900/20'
                      : status === 'speaking'
                      ? 'animate-pulse bg-slate-600 shadow-md h-14'
                      : status === 'thinking'
                      ? 'animate-pulse bg-amber-400 shadow-md h-8'
                      : 'h-4 bg-slate-300'
                  }`}
                  style={{ animationDelay: `${bar * 100}ms` }}
                />
              ))}
            </div>

            {/* Show current transcript (not yet in history) */}
            {(displayTranscript && status === 'listening') && (
              <div className="mt-3 rounded-md bg-white p-3 shadow-sm border border-slate-100">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('ai.queryLabel') || 'YOUR QUERY'}
                </p>
                <p className="mt-1 text-base font-bold leading-7 text-[var(--saathi-text)]">
                  {displayTranscript}
                </p>
              </div>
            )}

            {/* Status text when no current transcript */}
            {!displayTranscript && chatHistory.length === 0 && status === 'listening' && (
              <p className="mt-3 text-center text-sm font-semibold text-slate-400 italic">
                {t('ai.speakPrompt') || 'Speak clearly into your microphone...'}
              </p>
            )}

            {status === 'thinking' && (
              <p className="mt-3 text-center text-sm font-semibold text-amber-600 animate-pulse">
                {t('ai.thinking') || 'SAATHI is thinking...'}
              </p>
            )}
          </div>

          {/* Scroll anchor */}
          <div ref={chatEndRef} />
        </div>

        {/* Input & Actions - Fixed at bottom */}
        <div className="border-t border-slate-100 p-5 sm:p-7 pt-4 sm:pt-5">
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={t('ai.typePlaceholder') || 'Or type your question here (e.g. Wheat price)'}
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
              {t('ai.notSupported') || 'Speech recognition is not supported in this browser.'}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            {status === 'listening' ? (
              <button
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
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
                {t('ai.stopProcess') || 'Stop Processing'}
              </button>
            ) : (
              <button
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                type="button"
                onClick={handleRestartListening}
              >
                <MicrophoneIcon className="h-5 w-5" />
                {t('ai.speakAgain') || 'Speak Again'}
              </button>
            )}

            <button
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-200"
              type="button"
              onClick={onClose}
            >
              {t('ai.close') || 'Close'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
