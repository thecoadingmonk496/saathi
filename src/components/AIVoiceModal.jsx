import { useEffect, useRef, useState } from 'react';
import { MicrophoneIcon, PaperAirplaneIcon, SpeakerWaveIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useUser } from '../context/UserContext';

const API_BASE = import.meta.env.VITE_FASTAPI_URL
  || (import.meta.env.DEV ? 'http://localhost:8000' : 'https://saathi-backend-7t91.onrender.com');
const WS_BASE = import.meta.env.VITE_FASTAPI_WS_URL
  || API_BASE.replace(/^http/, 'ws') + '/ws/voice';

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

export default function AIVoiceModal({ onClose, onResponse, preferredLanguage = 'Hindi' }) {
  const { t } = useUser();
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [responseText, setResponseText] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const audioPlayerRef = useRef(typeof Audio !== 'undefined' ? new Audio() : null);
  const audioUrlRef = useRef(null);
  const recognitionRef = useRef(null);
  const wsRef = useRef(null);
  const statusRef = useRef(status);

  useEffect(() => { statusRef.current = status; }, [status]);

  const langTag = languageTagMap[preferredLanguage] || 'hi-IN';

  const playBackendTTSData = async (audioBase64, mimeType) => {
    try {
      if (audioPlayerRef.current && !audioPlayerRef.current.paused) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }

      setStatus('ai_speaking');
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBlob = new Blob([bytes], { type: mimeType || 'audio/wav' });
      if (audioBlob.size <= 100) throw new Error('Audio blob too small');
      audioUrlRef.current = URL.createObjectURL(audioBlob);
      audioPlayerRef.current.src = audioUrlRef.current;
      audioPlayerRef.current.volume = 1.0;

      audioPlayerRef.current.onended = () => {
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
        if (statusRef.current !== 'ended' && statusRef.current !== 'ending') {
          setStatus('listening');
          startRecognition();
        }
      };
      await audioPlayerRef.current.play();
    } catch (err) {
      console.error('Sarvam backend TTS playback failed:', err);
      setStatus('error');
    }
  };

  const startRecognition = () => {
    const currentStatus = statusRef.current;
    if (currentStatus === 'ai_speaking' || currentStatus === 'processing' || currentStatus === 'ended' || currentStatus === 'ending' || currentStatus === 'error') {
      return;
    }
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
        if (statusRef.current !== 'ended' && statusRef.current !== 'ending') {
           setStatus('listening');
        }
      };

      recognition.onresult = (event) => {
        if (statusRef.current !== 'ended' && statusRef.current !== 'ending') {
           setStatus('user_speaking');
        }
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
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
           if (statusRef.current !== 'ended' && statusRef.current !== 'ending') {
              setStatus('error');
           }
        }
      };

      recognition.onend = () => {
        setInterimTranscript((prevInterim) => {
          if (prevInterim && !transcript) {
            setTranscript(prevInterim);
            handleFinalSpeech(prevInterim);
            return '';
          }
          setTimeout(() => {
            const st = statusRef.current;
            if (st === 'listening' || st === 'user_speaking') {
              startRecognition();
            }
          }, 100);
          return '';
        });
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
    }
  };

  useEffect(() => {
    let ws = null;
    try {
      ws = new WebSocket(WS_BASE);
      ws.onopen = () => {
        console.log("SAATHI WebSocket connected");
        if (statusRef.current !== 'ended' && statusRef.current !== 'ending') {
          setStatus('listening');
          startRecognition();
        }
      };
      ws.onmessage = async (event) => {
        if (statusRef.current === 'ended' || statusRef.current === 'ending') return;
        try {
          const data = JSON.parse(event.data);
          if (data.status === 'success') {
            const aiResponse = data.ai_response || "Sorry, I couldn't understand that.";
            setResponseText(aiResponse);
            onResponse?.(aiResponse);

            if (data.audio_base64 && typeof data.voice === 'string' && data.voice.startsWith('sarvam-')) {
              await playBackendTTSData(data.audio_base64, data.mime_type || 'audio/wav');
            } else {
              console.error('Refusing non-Sarvam or missing TTS audio', {
                voice: data.voice,
                hasAudio: Boolean(data.audio_base64),
              });
              setStatus('error');
            }
          } else {
            console.error("WS API Error:", data.message);
            const errorMsg = t('ai.notSupported') || "I'm having trouble connecting right now.";
            setResponseText(errorMsg);
            setStatus('error');
          }
        } catch (error) {
          console.error("WS Parse Error:", error);
        }
      };
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        if (statusRef.current !== 'ended' && statusRef.current !== 'ending') {
           setStatus('error');
        }
      };
      ws.onclose = () => {
        console.log("SAATHI WebSocket closed");
        if (statusRef.current !== 'ended' && statusRef.current !== 'ending') {
           setStatus('error');
        }
      };
      wsRef.current = ws;
    } catch (err) {
      console.error("Failed to connect to WS:", err);
      setStatus('error');
    }

    return () => {
      setStatus('ended');
      if (wsRef.current) wsRef.current.close();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      if (audioPlayerRef.current && !audioPlayerRef.current.paused) audioPlayerRef.current.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, [langTag]);

  const handleFinalSpeech = (queryText) => {
    if (!queryText.trim()) return;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
    setStatus('processing');
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
       wsRef.current.send(JSON.stringify({
          action: "text",
          query: queryText,
          generate_audio: true
       }));
    } else {
       console.error("WebSocket is not open");
       setStatus('error');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    setTranscript(textInput);
    handleFinalSpeech(textInput);
    setTextInput('');
  };

  const handleEndCall = () => {
    setStatus('ending');
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
    if (audioPlayerRef.current && !audioPlayerRef.current.paused) audioPlayerRef.current.pause();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('ended');
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleEndCall();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const displayTranscript = transcript || interimTranscript;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-md sm:items-center sm:p-4"
      role="presentation"
      onClick={handleEndCall}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-voice-modal-title"
        className="w-full max-w-xl rounded-t-3xl border border-white/60 bg-white/95 p-5 shadow-2xl backdrop-blur-xl sm:rounded-3xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full overflow-hidden text-white shadow-lg ${
                status === 'listening'
                  ? 'animate-pulse bg-[#15803D] shadow-green-900/30 ring-4 ring-green-200'
                  : status === 'user_speaking'
                  ? 'animate-pulse bg-blue-600 shadow-blue-900/30 ring-4 ring-blue-200'
                  : status === 'processing'
                  ? 'animate-pulse bg-yellow-500 shadow-yellow-900/30 ring-4 ring-yellow-200'
                  : status === 'ai_speaking'
                  ? 'bg-emerald-600 shadow-emerald-900/30 ring-4 ring-emerald-200'
                  : 'bg-slate-700 shadow-slate-900/20'
              }`}
            >
              <img src="/saathi-mic-logo.png" alt="SAATHI logo" className="h-9 w-9 rounded-full bg-[#fdfbf7] object-contain p-1" />
            </span>
            <div>
              <h2 id="ai-voice-modal-title" className="text-2xl font-extrabold text-slate-900">
                {status === 'idle' && (t('ai.connecting') || 'Connecting...')}
                {status === 'listening' && (t('ai.listening') || t('ai.listening'))}
                {status === 'user_speaking' && (t('ai.hearing') || 'Hearing...')}
                {status === 'processing' && (t('ai.thinking') || t('ai.thinking'))}
                {status === 'ai_speaking' && (t('ai.speaking') || t('ai.speaking'))}
                {status === 'error' && (t('ai.error') || 'Connection Error')}
                {status === 'ended' && 'Call Ended'}
              </h2>
              <p className="mt-0.5 text-xs font-bold text-[#15803D]">
                {t('ai.languageLabel')}: <span className="underline">{preferredLanguage}</span> ({langTag})
              </p>
            </div>
          </div>

          <button
            aria-label="Close voice assistant"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-200"
            type="button"
            onClick={handleEndCall}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="mt-6 rounded-2xl border border-green-100 bg-gradient-to-b from-green-50/90 to-emerald-50/50 p-5">
          <div className="flex h-20 items-end justify-center gap-2" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
              <span
                key={bar}
                className={`block w-2.5 rounded-full transition-all duration-300 ${
                  status === 'listening' || status === 'user_speaking'
                    ? 'voice-wave-bar bg-[#15803D] shadow-md shadow-green-900/20'
                    : status === 'ai_speaking'
                    ? 'animate-pulse bg-emerald-600 shadow-md h-14'
                    : 'h-4 bg-slate-300'
                }`}
                style={{ animationDelay: `${bar * 100}ms` }}
              />
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                {responseText ? t('ai.answerLabel') : t('ai.queryLabel')}
              </p>
            </div>

            <p className="mt-1.5 min-h-12 text-base font-bold leading-7 text-slate-800 sm:text-lg">
              {responseText || displayTranscript || (
                <span className="italic text-slate-400">
                  {status === 'listening' || status === 'idle' ? t('ai.speakPrompt') : t('ai.typePrompt')}
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
            disabled={status === 'processing' || status === 'ai_speaking' || status === 'ended'}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#15803D] focus:ring-4 focus:ring-green-100 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status === 'processing' || status === 'ai_speaking' || status === 'ended'}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#15803D] text-white shadow-sm transition hover:bg-[#11632f] focus:outline-none focus:ring-4 focus:ring-green-200 disabled:opacity-50"
            aria-label="Send question"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </form>

        {!isSupported && (
          <p className="mt-2 text-xs font-semibold text-amber-600">
            {t('ai.notSupported')}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {status === 'error' || status === 'ended' ? (
            <button
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
              type="button"
              onClick={handleEndCall}
            >
              {t('ai.close') || t('ai.close')}
            </button>
          ) : (
            <button
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200"
              type="button"
              onClick={handleEndCall}
            >
              End Call / Stop Voice Chat
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
