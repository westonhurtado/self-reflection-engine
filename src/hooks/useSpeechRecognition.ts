import { useCallback, useEffect, useRef, useState } from "react";

export type RecognitionErrorKind = "denied" | "unsupported" | "error";

type Options = {
  /** Called with the finalized transcript after the user stops speaking. */
  onFinal: (text: string) => void;
  /** Called with the live (interim + final) transcript. */
  onInterim?: (text: string) => void;
  /** Called when speech is detected while listening. */
  onSpeechActivity?: () => void;
  onError?: (kind: RecognitionErrorKind | null) => void;
  /** Silence in ms before the transcript is finalized. */
  silenceMs?: number;
};

/** Only consecutive failed restarts (no speech activity in between) count toward this. */
const MAX_CONSECUTIVE_FAILURES = 12;

export const isSpeechRecognitionSupported =
  typeof window !== "undefined" &&
  ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

/**
 * Thin wrapper around the browser SpeechRecognition API.
 * Only emits final transcripts, guards restarts, and never restarts
 * once the caller has intentionally stopped it.
 */
export function useSpeechRecognition({
  onFinal,
  onInterim,
  onSpeechActivity,
  onError,
  silenceMs = 1200,
}: Options) {
  const [listening, setListening] = useState(false);

  const recognitionRef = useRef<any>(null);
  const wantListeningRef = useRef(false);
  const runningRef = useRef(false);
  const finalRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failuresRef = useRef(0);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cbs = useRef({ onFinal, onInterim, onSpeechActivity, onError });
  cbs.current = { onFinal, onInterim, onSpeechActivity, onError };

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isSpeechRecognitionSupported) return;

    const Ctor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      runningRef.current = true;
      setListening(true);
      cbs.current.onError?.(null);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalRef.current = `${finalRef.current} ${text}`.trim();
        } else {
          interim += text;
        }
      }

      const live = `${finalRef.current} ${interim}`.trim();
      if (live) {
        failuresRef.current = 0;
        cbs.current.onSpeechActivity?.();
      }
      cbs.current.onInterim?.(live);

      clearSilenceTimer();
      if (!live) return;
      silenceTimerRef.current = setTimeout(() => {
        const text = finalRef.current.trim();
        finalRef.current = "";
        cbs.current.onInterim?.("");
        if (text) cbs.current.onFinal(text);
      }, silenceMs);
    };

    recognition.onerror = (event: any) => {
      const err = event?.error;
      if (err === "not-allowed" || err === "service-not-allowed") {
        wantListeningRef.current = false;
        runningRef.current = false;
        setListening(false);
        cbs.current.onError?.("denied");
        return;
      }
      // Recoverable / routine: let onend handle the automatic restart silently.
    };

    recognition.onend = () => {
      runningRef.current = false;
      setListening(false);
      if (!wantListeningRef.current) return;
      if (failuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
        wantListeningRef.current = false;
        cbs.current.onError?.("error");
        return;
      }
      failuresRef.current += 1;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (!wantListeningRef.current || runningRef.current) return;
        try {
          recognition.start();
        } catch {
          /* already started */
        }
      }, 350);
    };

    recognitionRef.current = recognition;

    return () => {
      wantListeningRef.current = false;
      runningRef.current = false;
      clearSilenceTimer();
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      try {
        recognition.abort();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    };
  }, [clearSilenceTimer, silenceMs]);

  const start = useCallback(() => {
    if (!recognitionRef.current) {
      cbs.current.onError?.("unsupported");
      return;
    }
    wantListeningRef.current = true;
    failuresRef.current = 0;
    finalRef.current = "";
    if (runningRef.current) return;
    try {
      recognitionRef.current.start();
    } catch {
      /* already started */
    }
  }, []);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    clearSilenceTimer();
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    finalRef.current = "";
    try {
      recognitionRef.current?.abort();
    } catch {
      /* noop */
    }
    runningRef.current = false;
    setListening(false);
  }, [clearSilenceTimer]);

  return {
    supported: isSpeechRecognitionSupported,
    listening,
    start,
    stop,
  };
}