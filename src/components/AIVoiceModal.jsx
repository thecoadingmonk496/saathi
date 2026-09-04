import { useEffect, useRef, useState } from 'react';
import { MicrophoneIcon, PaperAirplaneIcon, SpeakerWaveIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useUser } from '../context/UserContext';

const API_BASE = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';
const WS_BASE = import.meta.env.VITE_FASTAPI_WS_URL || API_BASE.replace(/^http/, 'ws') + '/ws/voice';

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
  const [wsTrigger, setWsTrigger] = useState(0);
  const [chatHistory, setChatHistory] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [responseText, setResponseText] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const audioPlayerRef = useRef(typeof Audio !== 'undefined' ? new Audio() : null);
  const audioUrlRef = useRef(null);
  const chatEndRef = useRef(null);
  const silenceTimerRef = useRef(null);
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, responseText, transcript, interimTranscript]);
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
      recognition.continuous = true;
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
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

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
          } else {
            setInterimTranscript(currentInterim);
          }

          silenceTimerRef.current = setTimeout(() => {
             if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch(e) {}
             }
          }, 1500);
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
             setTranscript((currentTranscript) => {
                const combined = currentTranscript + (prevInterim ? ' ' + prevInterim : '');
                const cleanCombined = combined.trim();
                
                if (cleanCombined) {
                   handleFinalSpeech(cleanCombined);
                } else {
                   setTimeout(() => {
                     const st = statusRef.current;
                     if (st === 'listening' || st === 'user_speaking') {
                       startRecognition();
                     }
                   }, 100);
                }
                return currentTranscript;
             });
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
      };
      // Start recognition immediately on mount so Chrome doesn't block it for lack of user gesture
      if (statusRef.current !== 'ended' && statusRef.current !== 'ending') {
        setStatus('listening');
        startRecognition();
      }
      ws.onmessage = async (event) => {
        if (statusRef.current === 'ended' || statusRef.current === 'ending') return;
        try {
          const data = JSON.parse(event.data);
          if (data.status === 'success') {
            const aiResponse = data.ai_response || "Sorry, I couldn't understand that.";
            setResponseText(aiResponse);
            setChatHistory(prev => [...prev, { role: 'assistant', content: aiResponse }]);
            onResponse?.(aiResponse);

            if (data.audio_base64) {
              await playBackendTTSData(data.audio_base64, data.mime_type || data.format);
            } else {
              console.error('Sarvam returned no audio');
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
      if (wsRef.current) wsRef.current.close();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      if (audioPlayerRef.current && !audioPlayerRef.current.paused) audioPlayerRef.current.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, [langTag, wsTrigger]);

  const handleFinalSpeech = (queryText) => {
    if (!queryText.trim()) return;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }
    setStatus('processing');
    setChatHistory(prev => [...prev, { role: 'user', content: queryText }]);
    const trySend = (retries = 10) => {
      if (!wsRef.current) return setStatus('error');
      if (wsRef.current.readyState === WebSocket.OPEN) {
         wsRef.current.send(JSON.stringify({
            action: "text",
            query: queryText,
            generate_audio: true
         }));
      } else if (wsRef.current.readyState === WebSocket.CONNECTING && retries > 0) {
         setTimeout(() => trySend(retries - 1), 100);
      } else {
         console.error("WebSocket is not open");
         setStatus('error');
      }
    };
    trySend();
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
                  : status === 'ai_speaking'
                  ? 'bg-slate-600 shadow-slate-900/30 ring-4 ring-slate-200'
                  : 'bg-slate-700 shadow-slate-900/20'
              }`}
            >
              <img src="/saathi-mic-logo.png" alt="SAATHI logo" className="h-9 w-9 rounded-full bg-[#fdfbf7] object-contain p-1" />
            </span>
            <div>
              <h2 id="ai-voice-modal-title" className="text-2xl font-extrabold text-[var(--saathi-text)]">
                {status === 'listening' && (t('ai.listening') || t('ai.listening'))}
                {status === 'processing' && (t('ai.thinking') || t('ai.thinking'))}
                {status === 'ai_speaking' && (t('ai.speaking') || t('ai.speaking'))}
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
                          onClick={() => console.log('Replay not supported in WS mode')}
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
                      : status === 'ai_speaking'
                      ? 'animate-pulse bg-slate-600 shadow-md h-14'
                      : status === 'processing'
                      ? 'animate-pulse bg-amber-400 shadow-md h-8'
                      : 'h-4 bg-slate-300'
                  }`}
                  style={{ animationDelay: `${bar * 100}ms` }}
                />
              ))}
            </div>

            {/* Show current transcript (not yet in history) */}
            {(displayTranscript && (status === 'listening' || status === 'user_speaking')) && (
              <div className="mt-3 rounded-md bg-white p-3 shadow-sm border border-slate-100">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('ai.queryLabel')}
                </p>
                <p className="mt-1 text-base font-bold leading-7 text-[var(--saathi-text)]">
                  {displayTranscript}
                </p>
              </div>
            )}

            {/* Status text when no current transcript */}
            {!displayTranscript && chatHistory.length === 0 && status === 'listening' && (
              <p className="mt-3 text-center text-sm font-semibold text-slate-400 italic">
                {t('ai.speakPrompt')}
              </p>
            )}

            {status === 'processing' && (
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
                {t('ai.stopProcess') || t('ai.stopProcess')}
              </button>
            ) : (
              <button
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                type="button"
                onClick={() => { setStatus('idle'); setResponseText(''); setTranscript(''); setInterimTranscript(''); setWsTrigger(prev => prev + 1); }}
              >
                <MicrophoneIcon className="h-5 w-5" />
                {t('ai.speakAgain') || t('ai.speakAgain')}
              </button>
            )}

            <button
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-200"
              type="button"
              onClick={onClose}
            >
              {t('ai.close') || t('ai.close')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
