import { useCallback, useEffect, useRef, useState } from "react";
import { X, Mic, MicOff, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationOrb, type OrbState } from "./ConversationOrb";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

type Message = { role: "user" | "assistant"; content: string };

type Props = {
  messages: Message[];
  /** The same submission path used by typed chat. */
  onSend: (text: string) => Promise<string | null>;
  onClose: () => void;
};

const STATUS: Record<OrbState, string> = {
  listening: "Listening",
  finishing: "Finishing your thought",
  reflecting: "Reflecting",
  speaking: "Speaking",
  muted: "Tap to continue",
};

export const ConversationMode = ({ messages, onSend, onClose }: Props) => {
  const [orbState, setOrbState] = useState<OrbState>("listening");
  const [interim, setInterim] = useState("");
  const [intensity, setIntensity] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busyRef = useRef(false);
  const activeRef = useRef(true);
  const lastSentRef = useRef("");
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<{ start: () => void; stop: () => void }>({
    start: () => {},
    stop: () => {},
  });

  const { speak, cancel: cancelSpeech } = useSpeechSynthesis();

  const handleFinal = useCallback(
    async (text: string) => {
      if (!activeRef.current || busyRef.current) return;
      const clean = text.trim();
      if (!clean) return;
      if (clean === lastSentRef.current) return;

      busyRef.current = true;
      lastSentRef.current = clean;
      setInterim("");
      setOrbState("finishing");
      // Never let the mirror hear itself.
      controlsRef.current.stop();

      setTimeout(() => {
        if (activeRef.current && busyRef.current) setOrbState("reflecting");
      }, 450);

      const reply = await onSend(clean);

      if (!activeRef.current) {
        busyRef.current = false;
        return;
      }

      if (!reply) {
        busyRef.current = false;
        setOrbState("listening");
        controlsRef.current.start();
        return;
      }

      setOrbState("speaking");
      speak(reply, () => {
        busyRef.current = false;
        if (!activeRef.current) return;
        setOrbState("listening");
        controlsRef.current.start();
      });
    },
    [onSend, speak]
  );

  const recognition = useSpeechRecognition({
    onFinal: handleFinal,
    onInterim: (text) => {
      setInterim(text);
      setIntensity(Math.min(text.length / 60, 1));
    },
    onError: (kind) => {
      if (kind === "denied") {
        setError(
          "Microphone access was denied. Enable it in your browser settings, then reopen conversation mode."
        );
        setOrbState("muted");
      } else if (kind === "unsupported") {
        setError("This browser doesn't support speech recognition.");
        setOrbState("muted");
      } else {
        setError("Listening was interrupted. Tap the orb to continue.");
        setOrbState("muted");
      }
    },
  });

  const { supported, listening, start, stop } = recognition;
  controlsRef.current = { start, stop };

  // Enter conversation mode: begin listening immediately.
  useEffect(() => {
    activeRef.current = true;
    if (!supported) {
      setError("This browser doesn't support speech recognition.");
      setOrbState("muted");
      return;
    }
    start();
    setOrbState("listening");

    return () => {
      activeRef.current = false;
      stop();
      cancelSpeech();
    };
  }, [supported, start, stop, cancelSpeech]);

  useEffect(() => {
    if (showTranscript) {
      transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [showTranscript, messages]);

  const resumeListening = useCallback(() => {
    if (!supported) return;
    setError(null);
    cancelSpeech();
    busyRef.current = false;
    setOrbState("listening");
    start();
  }, [supported, start, cancelSpeech]);

  const handleOrbTap = () => {
    if (orbState === "speaking") {
      // Tap to interrupt: stop the spoken reply and listen again.
      resumeListening();
      return;
    }
    if (orbState === "muted") {
      resumeListening();
    }
  };

  const toggleMute = () => {
    if (orbState === "muted") {
      resumeListening();
      return;
    }
    cancelSpeech();
    stop();
    busyRef.current = false;
    setInterim("");
    setOrbState("muted");
  };

  const endConversation = () => {
    activeRef.current = false;
    stop();
    cancelSpeech();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-mirror-depth animate-in">
      <div className="flex justify-end p-6">
        <Button
          type="button"
          onClick={endConversation}
          size="icon"
          variant="ghost"
          className="h-11 w-11 rounded-full text-text-secondary hover:bg-mirror-surface hover:text-text-primary"
          title="End conversation"
          aria-label="End conversation"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
        <ConversationOrb
          state={orbState}
          intensity={orbState === "listening" && listening ? intensity : 0}
          onClick={handleOrbTap}
        />

        <div className="max-w-xl space-y-3 text-center">
          <p className="text-lg font-light tracking-wide text-text-primary">
            {STATUS[orbState]}
          </p>
          {orbState === "listening" && interim && (
            <p className="text-sm font-light text-text-muted line-clamp-3">{interim}</p>
          )}
          {orbState === "speaking" && (
            <p className="text-xs font-light text-text-muted">Tap the orb to interrupt</p>
          )}
          {error && <p className="text-sm font-light text-destructive">{error}</p>}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 pb-12">
        <Button
          type="button"
          onClick={toggleMute}
          disabled={!supported}
          size="icon"
          className={`h-14 w-14 rounded-full border border-border transition-colors ${
            orbState === "muted"
              ? "bg-mirror-surface text-text-muted hover:bg-mirror-surface"
              : "bg-mirror-surface/70 text-text-primary hover:bg-mirror-surface"
          }`}
          title={orbState === "muted" ? "Resume listening" : "Mute microphone"}
          aria-label={orbState === "muted" ? "Resume listening" : "Mute microphone"}
        >
          {orbState === "muted" ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button
          type="button"
          onClick={() => setShowTranscript(true)}
          size="icon"
          className="h-14 w-14 rounded-full border border-border bg-mirror-surface/70 text-text-primary transition-colors hover:bg-mirror-surface"
          title="Show transcript"
          aria-label="Show transcript"
        >
          <MessageSquareText className="h-5 w-5" />
        </Button>

        <Button
          type="button"
          onClick={endConversation}
          className="h-14 rounded-full bg-mirror-glow px-6 font-light text-mirror-depth transition-colors hover:bg-mirror-glow/90"
        >
          End conversation
        </Button>
      </div>

      {/* Transcript panel */}
      {showTranscript && (
        <div className="absolute inset-0 z-10 flex flex-col bg-mirror-depth/95 backdrop-blur-sm animate-in">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <p className="font-light tracking-wide text-text-primary">Transcript</p>
            <Button
              type="button"
              onClick={() => setShowTranscript(false)}
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full text-text-secondary hover:bg-mirror-surface hover:text-text-primary"
              aria-label="Close transcript"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-8">
            {messages.length === 0 && (
              <p className="text-center text-sm font-light text-text-muted">
                Nothing spoken yet.
              </p>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-2xl rounded-2xl px-6 py-4 ${
                    msg.role === "user"
                      ? "border border-border bg-mirror-surface/80 text-text-primary"
                      : "bg-transparent text-text-secondary"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-base font-light leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};