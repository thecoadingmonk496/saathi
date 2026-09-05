import { useEffect, useRef, useState } from 'react';
import { MicrophoneIcon, PaperAirplaneIcon, SpeakerWaveIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useUser } from '../context/UserContext';

const API_BASE = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';
const WS_BASE = import.meta.env.VITE_FASTAPI_WS_URL || `${API_BASE.replace(/^http/, 'ws')}/ws/voice`;

const SILENCE_TIMEOUT_MS = 1500;
const STARTUP_NOISE_WINDOW_MS = 1800;
const REQUEST_TIMEOUT_MS = 45000;

const startupNoiseWords = new Set([
  'hello',
  'hi',
  'hey',
  'namaste',
  'namaskar',
  'नमस्ते',
  'नमस्कार',
]);

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

function normaliseMimeType(mimeType, format) {
  if (mimeType?.includes('/')) return mimeType;
  if (format === 'mp3' || format === 'mpeg') return 'audio/mpeg';
  if (format === 'wav') return 'audio/wav';
  return 'audio/mpeg';
}

export default function AIVoiceModal({
  onClose,
  onResponse,
  preferredLanguage = 'Hindi',
  initialQuery = '',
}) {
  const { t } = useUser();
  const [status, setStatus] = useState('idle');
  const [chatHistory, setChatHistory] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [responseText, setResponseText] = useState('');
  const [helperMessage, setHelperMessage] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  const audioPlayerRef = useRef(typeof Audio !== 'undefined' ? new Audio() : null);
  const audioUrlRef = useRef(null);
  const chatEndRef = useRef(null);
  const chatHistoryRef = useRef([]);
  const endingRef = useRef(false);
  const handledInitialQueryRef = useRef(false);
  const interimTranscriptRef = useRef('');
  const isSubmittingRef = useRef(false);
  const isTypingRef = useRef(false);
  const recognitionRef = useRef(null);
  const recognitionStartedAtRef = useRef(0);
  const requestTimeoutRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const statusRef = useRef('idle');
  const suppressNextOnEndRef = useRef(false);
  const transcriptRef = useRef('');
  const wsRef = useRef(null);

  const langTag = languageTagMap[preferredLanguage] || 'hi-IN';

  const setStatusValue = (nextStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  };

  const setTranscriptValue = (value) => {
    transcriptRef.current = value;
    setTranscript(value);
  };

  const setInterimTranscriptValue = (value) => {
    interimTranscriptRef.current = value;
    setInterimTranscript(value);
  };

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const clearRequestTimeout = () => {
    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
      requestTimeoutRef.current = null;
    }
  };

  const releaseAudioUrl = () => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };

  const stopRecognition = ({ discardCurrentTurn = false } = {}) => {
    clearSilenceTimer();
    suppressNextOnEndRef.current = true;

    if (discardCurrentTurn) {
      setTranscriptValue('');
      setInterimTranscriptValue('');
    }

    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      try { recognition.abort(); } catch (e) {}
    }
  };

  const failAssistant = (message) => {
    clearRequestTimeout();
    isSubmittingRef.current = false;
    setResponseText(message);
    setHelperMessage(message);
    setStatusValue('error');
  };

  const recoverSpeechRecognition = (message) => {
    clearRequestTimeout();
    isSubmittingRef.current = false;
    stopRecognition({ discardCurrentTurn: true });
    setHelperMessage(message);
    setStatusValue('done');
  };

  const isLikelyStartupNoise = (text) => {
    const clean = (text || '')
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '');
    const elapsed = Date.now() - recognitionStartedAtRef.current;
    return elapsed < STARTUP_NOISE_WINDOW_MS && startupNoiseWords.has(clean);
  };

  const playBackendTTSData = async (audioBase64, mimeType) => {
    try {
      if (audioPlayerRef.current && !audioPlayerRef.current.paused) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      }
      releaseAudioUrl();

      if (!audioBase64) {
        setStatusValue('done');
        return;
      }

      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let index = 0; index < binaryString.length; index += 1) {
        bytes[index] = binaryString.charCodeAt(index);
      }

      const audioBlob = new Blob([bytes], { type: mimeType || 'audio/mpeg' });
      if (audioBlob.size <= 100) {
        throw new Error('Audio blob too small');
      }

      audioUrlRef.current = URL.createObjectURL(audioBlob);
      audioPlayerRef.current.src = audioUrlRef.current;
      audioPlayerRef.current.volume = 1.0;
      audioPlayerRef.current.onended = () => {
        releaseAudioUrl();
        if (!endingRef.current) setStatusValue('done');
      };
      audioPlayerRef.current.onerror = () => {
        releaseAudioUrl();
        if (!endingRef.current) setStatusValue('done');
      };

      setStatusValue('ai_speaking');
      await audioPlayerRef.current.play();
    } catch (error) {
      console.warn('Backend TTS playback failed:', error);
      releaseAudioUrl();
      if (!endingRef.current) setStatusValue('done');
    }
  };

  const connectWebSocket = () => {
    const existingSocket = wsRef.current;
    if (
      existingSocket &&
      (existingSocket.readyState === WebSocket.OPEN || existingSocket.readyState === WebSocket.CONNECTING)
    ) {
      return existingSocket;
    }

    const socket = new WebSocket(WS_BASE);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('SAATHI WebSocket connected');
    };

    socket.onmessage = async (event) => {
      if (endingRef.current) return;

      clearRequestTimeout();
      isSubmittingRef.current = false;

      try {
        const data = JSON.parse(event.data);
        if (data.status !== 'success') {
          failAssistant(data.message || "I'm having trouble connecting right now.");
          return;
        }

        const aiResponse = data.ai_response || "Sorry, I couldn't understand that.";
        setResponseText(aiResponse);
        setTranscriptValue('');
        setInterimTranscriptValue('');
        setChatHistory((prev) => [...prev, {
          role: 'assistant',
          content: aiResponse,
          audioBase64: data.audio_base64 || '',
          mimeType: normaliseMimeType(data.mime_type, data.format),
        }]);
        onResponse?.(aiResponse);

        if (data.audio_base64) {
          await playBackendTTSData(
            data.audio_base64,
            normaliseMimeType(data.mime_type, data.format)
          );
        } else {
          setStatusValue('done');
        }
      } catch (error) {
        console.error('WS parse error:', error);
        failAssistant("I received an unreadable response. Please try again.");
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (isSubmittingRef.current && !endingRef.current) {
        failAssistant("I couldn't reach the SAATHI voice server. Please try again.");
      }
    };

    socket.onclose = () => {
      console.log('SAATHI WebSocket closed');
      if (wsRef.current === socket) wsRef.current = null;
      if (isSubmittingRef.current && !endingRef.current) {
        failAssistant('The SAATHI voice connection closed before the answer arrived.');
      }
    };

    return socket;
  };

  const sendQuery = (queryText, history) => {
    requestTimeoutRef.current = setTimeout(() => {
      failAssistant('SAATHI is taking too long to respond. Please try again.');
    }, REQUEST_TIMEOUT_MS);

    const payload = JSON.stringify({
      action: 'text',
      query: queryText,
      history,
      preferred_language: preferredLanguage,
      language_code: langTag,
      generate_audio: true,
    });

    const trySend = (retries = 80) => {
      if (endingRef.current) return;

      let socket = wsRef.current;
      if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
        socket = connectWebSocket();
      }

      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
        return;
      }

      if (socket.readyState === WebSocket.CONNECTING && retries > 0) {
        setTimeout(() => trySend(retries - 1), 100);
        return;
      }

      failAssistant("I couldn't connect to the SAATHI voice server. Please try again.");
    };

    trySend();
  };

  const handleFinalSpeech = (queryText, { source = 'text' } = {}) => {
    const cleanQuery = queryText.trim();
    if (!cleanQuery || isSubmittingRef.current || endingRef.current) return;

    if (source === 'voice' && chatHistoryRef.current.length === 0 && isLikelyStartupNoise(cleanQuery)) {
      setTranscriptValue('');
      setInterimTranscriptValue('');
      setStatusValue('done');
      return;
    }

    isSubmittingRef.current = true;
    stopRecognition();
    setStatusValue('processing');
    setTranscriptValue(cleanQuery);

    const history = chatHistoryRef.current;
    setChatHistory((prev) => [...prev, { role: 'user', content: cleanQuery }]);
    sendQuery(cleanQuery, history);
  };

  const startRecognition = () => {
    const currentStatus = statusRef.current;
    if (
      isTypingRef.current ||
      isSubmittingRef.current ||
      endingRef.current ||
      currentStatus === 'ai_speaking' ||
      currentStatus === 'processing' ||
      currentStatus === 'ending' ||
      currentStatus === 'ended'
    ) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setStatusValue('done');
      return;
    }

    stopRecognition();
    suppressNextOnEndRef.current = false;
    clearSilenceTimer();
    setResponseText('');
    setHelperMessage('');

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = langTag;

      recognition.onstart = () => {
        recognitionStartedAtRef.current = Date.now();
        setStatusValue('listening');
      };

      recognition.onresult = (event) => {
        if (isTypingRef.current || endingRef.current || recognitionRef.current !== recognition) {
          stopRecognition({ discardCurrentTurn: true });
          setStatusValue('done');
          return;
        }

        clearSilenceTimer();
        setStatusValue('user_speaking');

        const finalParts = [];
        const interimParts = [];
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const value = result[0]?.transcript?.trim();
          if (!value) continue;
          if (result.isFinal) finalParts.push(value);
          else interimParts.push(value);
        }

        if (finalParts.length > 0) {
          const nextTranscript = [transcriptRef.current, ...finalParts].filter(Boolean).join(' ');
          setTranscriptValue(nextTranscript);
          setInterimTranscriptValue('');
        } else {
          setInterimTranscriptValue(interimParts.join(' '));
        }

        silenceTimerRef.current = setTimeout(() => {
          if (recognitionRef.current === recognition) {
            try { recognition.stop(); } catch (e) {}
          }
        }, SILENCE_TIMEOUT_MS);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'aborted') return;

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setIsSupported(false);
          stopRecognition({ discardCurrentTurn: true });
          failAssistant('Microphone access is blocked. You can still type your question.');
          return;
        }

        if (event.error === 'no-speech') {
          recoverSpeechRecognition('I did not catch anything. Please speak again or type your question.');
          return;
        }

        if (event.error === 'network') {
          recoverSpeechRecognition('Chrome speech recognition had a network hiccup. Please speak again or type your question.');
          return;
        }

        if (event.error === 'audio-capture') {
          recoverSpeechRecognition('I could not access your microphone. Check that it is connected and not being used by another app.');
          return;
        }

        recoverSpeechRecognition(`Speech recognition stopped (${event.error || 'unknown error'}). Please speak again or type your question.`);
      };

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        recognitionRef.current = null;

        if (suppressNextOnEndRef.current) {
          suppressNextOnEndRef.current = false;
          return;
        }

        const cleanCombined = `${transcriptRef.current} ${interimTranscriptRef.current}`.trim();
        setInterimTranscriptValue('');

        if (cleanCombined) {
          handleFinalSpeech(cleanCombined, { source: 'voice' });
        } else {
          setStatusValue('done');
        }
      };

      recognitionRef.current = recognition;
      recognitionStartedAtRef.current = Date.now();
      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setIsSupported(false);
      setStatusValue('done');
    }
  };

  const handleManualSubmit = (event) => {
    event.preventDefault();
    const cleanInput = textInput.trim();
    if (!cleanInput) return;

    setHelperMessage('');
    setTextInput('');
    setTranscriptValue(cleanInput);
    handleFinalSpeech(cleanInput, { source: 'text' });
  };

  const replayAssistantMessage = async (message) => {
    if (!message?.content || endingRef.current) return;

    stopRecognition({ discardCurrentTurn: true });
    setHelperMessage('');

    if (message.audioBase64) {
      await playBackendTTSData(message.audioBase64, message.mimeType);
      return;
    }

    try {
      setStatusValue('processing');
      const response = await fetch(`${API_BASE}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message.content,
          language_code: langTag,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS request failed with ${response.status}`);
      }

      const data = await response.json();
      if (!data.audio_base64) {
        throw new Error('TTS response did not include audio');
      }

      await playBackendTTSData(
        data.audio_base64,
        normaliseMimeType(data.mime_type, data.format)
      );
    } catch (error) {
      console.warn('Replay TTS failed:', error);
      setHelperMessage('I could not replay the voice right now, but the answer is still shown above.');
      setStatusValue('done');
    }
  };

  const handleEndCall = () => {
    if (endingRef.current) return;
    endingRef.current = true;
    setStatusValue('ending');
    clearRequestTimeout();
    stopRecognition({ discardCurrentTurn: true });
    if (audioPlayerRef.current && !audioPlayerRef.current.paused) {
      audioPlayerRef.current.pause();
    }
    releaseAudioUrl();

    const socket = wsRef.current;
    wsRef.current = null;
    if (socket) {
      try { socket.close(); } catch (e) {}
    }

    setStatusValue('ended');
    onClose?.();
  };

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    chatHistoryRef.current = chatHistory;
  }, [chatHistory]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, responseText, transcript, interimTranscript]);

  useEffect(() => {
    endingRef.current = false;
    connectWebSocket();

    if (initialQuery.trim() && !handledInitialQueryRef.current) {
      handledInitialQueryRef.current = true;
      handleFinalSpeech(initialQuery, { source: 'text' });
    } else {
      startRecognition();
    }

    return () => {
      endingRef.current = true;
      clearRequestTimeout();
      clearSilenceTimer();
      stopRecognition({ discardCurrentTurn: true });
      if (audioPlayerRef.current && !audioPlayerRef.current.paused) {
        audioPlayerRef.current.pause();
      }
      releaseAudioUrl();
      const socket = wsRef.current;
      wsRef.current = null;
      if (socket) {
        try { socket.close(); } catch (e) {}
      }
    };
  }, [langTag]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleEndCall();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const displayTranscript = `${transcript} ${interimTranscript}`.trim();
  const canStop = status === 'listening' || status === 'user_speaking';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={handleEndCall}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-voice-modal-title"
        className="flex w-full max-w-xl flex-col rounded-lg border border-[var(--saathi-border-light)] bg-white shadow-2xl sm:max-h-[85vh]"
        style={{ maxHeight: '90vh' }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 pb-4 sm:p-7 sm:pb-5">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full shadow-lg ${
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
                {status === 'listening' && (t('ai.listening') || 'SAATHI is listening...')}
                {status === 'user_speaking' && (t('ai.listening') || 'SAATHI is listening...')}
                {status === 'processing' && (t('ai.thinking') || 'SAATHI is thinking...')}
                {status === 'ai_speaking' && (t('ai.speaking') || 'Speaking response...')}
                {status === 'done' && (responseText ? (t('ai.responseReady') || 'Response ready') : (t('ai.title') || 'Ask SAATHI'))}
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
            onClick={handleEndCall}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 pt-4 sm:p-7 sm:pt-5" style={{ minHeight: '200px', maxHeight: '50vh' }}>
          {chatHistory.length > 0 && (
            <div className="mb-4 space-y-3">
              {chatHistory.map((msg, idx) => (
                <div
                  key={`${msg.role}-${idx}`}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-semibold leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'rounded-br-md bg-[var(--saathi-primary)] text-white'
                        : 'rounded-bl-md border border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50 text-[var(--saathi-text)]'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="mb-1 flex items-center gap-1.5">
                        <img src="/saathi-mic-logo.png" alt="" className="h-4 w-4 rounded-full bg-[#fdfbf7] object-contain" />
                        <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600">SAATHI</span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            replayAssistantMessage(msg);
                          }}
                          className="ml-auto inline-flex items-center gap-0.5 rounded bg-emerald-100/70 px-1.5 py-0.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-200"
                          aria-label="Play this response"
                          title="Play this response"
                        >
                          <SpeakerWaveIcon className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {msg.role === 'user' && (
                      <p className="mb-0.5 text-xs font-extrabold uppercase tracking-wider text-white/70">You</p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-red-100 bg-gradient-to-b from-red-50/90 to-slate-50/50 p-4">
            <div className="flex h-16 items-end justify-center gap-2" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
                <span
                  key={bar}
                  className={`block w-2.5 rounded-full transition-all duration-300 ${
                    status === 'listening' || status === 'user_speaking'
                      ? 'voice-wave-bar bg-[var(--saathi-primary)] shadow-md shadow-red-900/20'
                      : status === 'ai_speaking'
                        ? 'h-14 animate-pulse bg-slate-600 shadow-md'
                        : status === 'processing'
                          ? 'h-8 animate-pulse bg-amber-400 shadow-md'
                          : 'h-4 bg-slate-300'
                  }`}
                  style={{ animationDelay: `${bar * 100}ms` }}
                />
              ))}
            </div>

            {displayTranscript && (status === 'listening' || status === 'user_speaking' || status === 'processing') && (
              <div className="mt-3 rounded-md border border-slate-100 bg-white p-3 shadow-sm">
                <p className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
                  {t('ai.queryLabel') || 'Your Spoken Query'}
                </p>
                <p className="mt-1 text-base font-bold leading-7 text-[var(--saathi-text)]">
                  {displayTranscript}
                </p>
              </div>
            )}

            {!displayTranscript && chatHistory.length === 0 && status === 'listening' && (
              <p className="mt-3 text-center text-sm font-semibold italic text-slate-400">
                {t('ai.speakPrompt') || 'Speak clearly into your microphone...'}
              </p>
            )}

            {status === 'processing' && (
              <p className="mt-3 animate-pulse text-center text-sm font-semibold text-amber-600">
                {t('ai.thinking') || 'SAATHI is thinking...'}
              </p>
            )}

            {status === 'error' && (
              <p className="mt-3 text-center text-sm font-semibold text-red-600">
                {responseText || "I'm having trouble connecting right now."}
              </p>
            )}

            {status === 'done' && helperMessage && !responseText && (
              <p className="mt-3 text-center text-sm font-semibold text-slate-500">
                {helperMessage}
              </p>
            )}
          </div>

          <div ref={chatEndRef} />
        </div>

        <div className="border-t border-slate-100 p-5 pt-4 sm:p-7 sm:pt-5">
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(event) => {
                isTypingRef.current = true;
                if (statusRef.current === 'listening' || statusRef.current === 'user_speaking') {
                  stopRecognition({ discardCurrentTurn: true });
                  setStatusValue('done');
                }
                setTextInput(event.target.value);
                setHelperMessage('');
              }}
              onFocus={() => {
                isTypingRef.current = true;
                if (statusRef.current === 'listening' || statusRef.current === 'user_speaking') {
                  stopRecognition({ discardCurrentTurn: true });
                  setStatusValue('done');
                }
              }}
              onBlur={() => {
                isTypingRef.current = false;
              }}
              placeholder={t('ai.typePlaceholder') || 'Or type your question here (e.g. Wheat price)'}
              className="flex-1 rounded-md border border-[var(--saathi-border-light)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--saathi-text)] outline-none transition placeholder:text-slate-400 focus:border-[#15803D] focus:ring-2 focus:ring-red-100"
            />
            <button
              type="submit"
              disabled={isSubmittingRef.current}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--saathi-primary)] text-white shadow-sm transition hover:bg-[var(--saathi-primary-hover)] focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send question"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </form>

          {!isSupported && (
            <p className="mt-2 text-xs font-semibold text-red-600">
              {t('ai.notSupported') || 'Speech recognition is not supported here. You can type your question.'}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            {canStop ? (
              <button
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                type="button"
                onClick={() => {
                  const cleanCombined = `${transcriptRef.current} ${interimTranscriptRef.current}`.trim();
                  if (cleanCombined) {
                    handleFinalSpeech(cleanCombined, { source: 'voice' });
                  } else {
                    stopRecognition({ discardCurrentTurn: true });
                    setStatusValue('done');
                  }
                }}
              >
                {t('ai.stopProcess') || 'Stop & Process'}
              </button>
            ) : (
              <button
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={status === 'processing' || status === 'ai_speaking'}
                onClick={() => {
                  isTypingRef.current = false;
                  isSubmittingRef.current = false;
                  setResponseText('');
                  setHelperMessage('');
                  setTranscriptValue('');
                  setInterimTranscriptValue('');
                  setStatusValue('idle');
                  startRecognition();
                }}
              >
                <MicrophoneIcon className="h-5 w-5" />
                {t('ai.speakAgain') || 'Speak Again'}
              </button>
            )}

            <button
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
              type="button"
              onClick={handleEndCall}
            >
              {t('ai.close') || 'Close'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
