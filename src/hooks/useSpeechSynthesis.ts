import { useCallback, useEffect, useRef, useState } from "react";

export const isSpeechSynthesisSupported =
  typeof window !== "undefined" && "speechSynthesis" in window;

const PREFERRED = [
  "Samantha",
  "Google UK English Female",
  "Google US English",
  "Microsoft Aria",
  "Microsoft Jenny",
  "Karen",
  "Daniel",
];

function pickVoice(voices: SpeechSynthesisVoice[]) {
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  for (const name of PREFERRED) {
    const match = english.find((v) => v.name.includes(name));
    if (match) return match;
  }
  return english.find((v) => v.localService) ?? english[0] ?? voices[0] ?? null;
}

/** Wrapper around the browser SpeechSynthesis API with a calm default voice. */
export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (!isSpeechSynthesisSupported) return;
    const synth = window.speechSynthesis;
    const load = () => {
      voiceRef.current = pickVoice(synth.getVoices());
    };
    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => {
      synth.removeEventListener?.("voiceschanged", load);
      synth.cancel();
    };
  }, []);

  const cancel = useCallback(() => {
    if (!isSpeechSynthesisSupported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      if (!isSpeechSynthesisSupported || !text.trim()) {
        onDone?.();
        return;
      }
      const synth = window.speechSynthesis;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      if (voiceRef.current) utterance.voice = voiceRef.current;
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.onstart = () => setSpeaking(true);
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        setSpeaking(false);
        onDone?.();
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      synth.speak(utterance);
    },
    []
  );

  return { supported: isSpeechSynthesisSupported, speaking, speak, cancel };
}