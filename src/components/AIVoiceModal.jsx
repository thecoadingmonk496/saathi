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
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);
  const langTag = languageTagMap[preferredLanguage] || 'hi-IN';

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

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
        audioRef.current.pause();
      }
    };
  }, [langTag]);

  const playBase64Audio = (base64String) => {
    if (!base64String) {
      setStatus('done');
      return;
    }
    
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      
      const binaryString = window.atob(base64String);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const newAudioUrl = URL.createObjectURL(blob);
      
      setAudioUrl(newAudioUrl);
      
      const audio = new Audio(newAudioUrl);
      audioRef.current = audio;
      
      audio.onplay = () => setStatus('speaking');
      audio.onended = () => setStatus('done');
      audio.onerror = (e) => {
        console.error('Audio playback error', e);
        setStatus('done');
      };
      
      audio.play().catch(e => {
        console.error('Autoplay prevented', e);
        setStatus('done');
      });
    } catch (error) {
      console.error('Failed to decode or play base64 audio:', error);
      setStatus('done');
    }
  };

  const speakText = (text) => {
    return;
  };

  const handleFinalSpeech = async (queryText) => {
    if (!queryText.trim()) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { }
    }

    setStatus('thinking');

    try {
      const { response, action, audioBase64 } = await processVoiceQuery(queryText, preferredLanguage);
      setResponseText(response);
      onResponse?.(response);

      if (audioBase64) {
        playBase64Audio(audioBase64);
      } else {
        setStatus('done');
      }

      if (action && action.type === 'NAVIGATE' && action.path) {
        window.setTimeout(() => {
          onNavigate?.(action.path);
        }, 1800);
      }
    } catch (err) {
      console.error('API Error in handleFinalSpeech:', err);
      setStatus('error');
    }
  };

  const handleRestartListening = () => {
    if (audioRef.current) {
      audioRef.current.pause();
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
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-md sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
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
                  : status === 'speaking'
                  ? 'bg-emerald-600 shadow-emerald-900/30 ring-4 ring-emerald-200'
                  : 'bg-slate-700 shadow-slate-900/20'
              }`}
            >
              <img src="/saathi-mic-logo.png" alt="SAATHI logo" className="h-9 w-9 rounded-full bg-[#fdfbf7] object-contain p-1" />
            </span>
            <div>
              <h2 id="ai-voice-modal-title" className="text-2xl font-extrabold text-slate-900">
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
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-200"
            type="button"
            onClick={onClose}
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
                  status === 'listening'
                    ? 'voice-wave-bar bg-[#15803D] shadow-md shadow-green-900/20'
                    : status === 'speaking'
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
              {responseText && (
                <button
                  type="button"
                  onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(e => console.error(e)); } }}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-[#065f46] hover:bg-emerald-200 transition hover:scale-105"
                >
                  <SpeakerWaveIcon className="h-3.5 w-3.5" />
                  {t('ai.playVoice') || t('ai.playVoice')}
                </button>
              )}
            </div>

            <p className="mt-1.5 min-h-12 text-base font-bold leading-7 text-slate-800 sm:text-lg">
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
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#15803D] focus:ring-4 focus:ring-green-100"
          />
          <button
            type="submit"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#15803D] text-white shadow-sm transition hover:bg-[#11632f] focus:outline-none focus:ring-4 focus:ring-green-200"
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
          {status === 'listening' ? (
            <button
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200"
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
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#15803D] px-5 text-sm font-bold text-white transition hover:bg-[#11632f] focus:outline-none focus:ring-4 focus:ring-green-200"
              type="button"
              onClick={handleRestartListening}
            >
              <img src="/saathi-mic-logo.png" alt="SAATHI logo" className="h-5 w-5 rounded-full bg-[#fdfbf7] object-contain p-0.5" />
              {t('ai.speakAgain') || t('ai.speakAgain')}
            </button>
          )}

          <button
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
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
