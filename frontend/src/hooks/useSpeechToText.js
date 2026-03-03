import { useState, useEffect, useRef, useCallback } from 'react';
import logger from '../utils/logger';

/**
 * Web Speech API wrapper with auto-restart.
 * Chrome only — free, no API key needed.
 *
 * Returns { transcript, isListening, start, stop }
 *   - transcript: latest final result string
 *   - onResult callback fires with each final transcript line
 */
export default function useSpeechToText({ onResult, enabled = true }) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      logger.media('Speech recognition stopped');
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    stop();

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (text && onResult) onResult(text);
        }
      }
    };

    recognition.onend = () => {
      // Auto-restart if still enabled
      if (enabledRef.current && recognitionRef.current) {
        try { recognition.start(); } catch { /* already started */ }
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (e) => {
      logger.media('Speech recognition error:', e.error);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        stop();
      }
      // Other errors (network, no-speech) — auto-restart handles it
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
      logger.media('Speech recognition started');
    } catch { /* already started */ }
  }, [onResult, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { isListening, start, stop };
}
