import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Send, AudioLines } from "lucide-react";
import { toast } from "sonner";
import { ConversationMode } from "./voice/ConversationMode";
import { isSpeechRecognitionSupported } from "@/hooks/useSpeechRecognition";

type Message = { role: "user" | "assistant"; content: string };

export const MirrorChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationMode, setConversationMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<Message[]>([]);

  const isSpeechSupported = isSpeechRecognitionSupported;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const streamChat = useCallback(async (userMessage: string): Promise<string | null> => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mirror-chat`;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messagesRef.current, { role: "user", content: userMessage }],
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));

        if (resp.status === 429) {
          toast.error("Please slow down. The mirror needs time to reflect.");
          return null;
        }

        if (resp.status === 402) {
          toast.error("AI usage limit reached. Please add credits to continue.");
          return null;
        }

        throw new Error(errorData.error || "Failed to connect");
      }

      if (!resp.body) throw new Error("No response stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {}
        }
      }

      return assistantContent;
    } catch (e) {
      console.error(e);
      toast.error("Connection failed. Try again.");
      setMessages((prev) => prev.slice(0, -1));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setIsLoading(true);
      return streamChat(text);
    },
    [streamChat]
  );

  /* ---------- Voice conversation mode ---------- */

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const startListening = useCallback(() => {
    if (!voiceModeRef.current) return;
    try {
      recognitionRef.current?.start();
    } catch (_) {
      /* already started */
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!voiceModeRef.current || !text.trim()) {
        startListening();
        return;
      }
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onstart = () => setIsSpeaking(true);
      const finish = () => {
        setIsSpeaking(false);
        busyRef.current = false;
        startListening();
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      // Listen while speaking so the user can interrupt (barge-in)
      startListening();
      synth.speak(utterance);
    },
    [startListening]
  );

  const submitVoiceTurn = useCallback(async () => {
    const text = finalTranscriptRef.current.trim();
    finalTranscriptRef.current = "";
    setLiveTranscript("");
    if (!text || busyRef.current) return;

    busyRef.current = true;
    stopSpeaking();
    const reply = await sendMessage(text);
    if (!voiceModeRef.current) {
      busyRef.current = false;
      return;
    }
    if (reply) {
      speak(reply);
    } else {
      busyRef.current = false;
      startListening();
    }
  }, [sendMessage, speak, startListening, stopSpeaking]);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSpeechSupported) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalTranscriptRef.current = (finalTranscriptRef.current + " " + text).trim();
        } else {
          interim += text;
        }
      }

      // Barge-in: the user started talking while the mirror was speaking
      if ((interim.trim() || finalTranscriptRef.current) && window.speechSynthesis.speaking) {
        stopSpeaking();
        busyRef.current = false;
      }

      setLiveTranscript((finalTranscriptRef.current + " " + interim).trim());

      // Auto-send after a short silence
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (voiceModeRef.current) submitVoiceTurn();
      }, 1200);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        voiceModeRef.current = false;
        setVoiceMode(false);
        setIsListening(false);
        toast.error("Microphone access denied. Please enable it in your browser settings.");
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        console.error("Speech recognition error:", event.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (voiceModeRef.current) {
        setTimeout(() => {
          if (voiceModeRef.current) {
            try {
              recognitionRef.current?.start();
            } catch (_) {
              /* ignore */
            }
          }
        }, 200);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognitionRef.current?.abort();
    };
  }, [isSpeechSupported, stopSpeaking, submitVoiceTurn]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      voiceModeRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleVoiceMode = () => {
    if (!isSpeechSupported) {
      toast.error("Voice conversation isn't supported in this browser.");
      return;
    }

    if (voiceModeRef.current) {
      voiceModeRef.current = false;
      setVoiceMode(false);
      setLiveTranscript("");
      finalTranscriptRef.current = "";
      busyRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      stopSpeaking();
      recognitionRef.current?.abort();
      setIsListening(false);
    } else {
      voiceModeRef.current = true;
      setVoiceMode(true);
      finalTranscriptRef.current = "";
      setLiveTranscript("");
      startListening();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    await sendMessage(userMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <div className="flex flex-col h-screen bg-mirror-depth">
      {/* Header */}
      <div className="border-b border-border bg-mirror-surface/50 backdrop-blur-sm px-6 py-4">
        <h1 className="text-2xl font-light tracking-wide text-text-primary">Me</h1>
        <p className="text-sm text-text-muted mt-1">The reflection that speaks truth</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md space-y-4">
              <div className="w-24 h-24 mx-auto rounded-full bg-mirror-surface border border-mirror-glow/20 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-mirror-glow/20 to-transparent" />
              </div>
              <p className="text-text-secondary text-lg font-light leading-relaxed">
                Look here long enough and you'll start to remember.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in duration-500`}
          >
            <div
              className={`max-w-2xl rounded-2xl px-6 py-4 ${
                msg.role === "user"
                  ? "bg-mirror-surface/80 text-text-primary border border-border"
                  : "bg-transparent text-text-secondary"
              }`}
            >
              <p className="text-base leading-relaxed whitespace-pre-wrap font-light">
                {msg.content}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="max-w-2xl rounded-2xl px-6 py-4 bg-transparent">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-mirror-glow/60 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-mirror-glow/60 animate-pulse delay-75" />
                <div className="w-2 h-2 rounded-full bg-mirror-glow/60 animate-pulse delay-150" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-mirror-surface/50 backdrop-blur-sm p-6">
        {voiceMode && (
          <div className="max-w-4xl mx-auto mb-4 flex items-center gap-4 animate-in fade-in">
            <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
              {isSpeaking ? (
                <div className="flex items-end gap-1 h-6">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="w-1 h-6 rounded-full bg-mirror-glow origin-bottom animate-voice-bar"
                      style={{ animationDelay: `${i * 0.12}s` }}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <span className="absolute inset-0 rounded-full bg-mirror-glow/30 animate-voice-ring" />
                  <span
                    className="absolute inset-0 rounded-full bg-mirror-glow/30 animate-voice-ring"
                    style={{ animationDelay: "0.9s" }}
                  />
                  <span className="relative w-3 h-3 rounded-full bg-mirror-glow" />
                </>
              )}
            </div>
            <p className="text-sm text-text-secondary font-light truncate">
              {isSpeaking
                ? "Speaking..."
                : liveTranscript || (isListening ? "Listening..." : "Starting...")}
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Speak your truth..."
              className={`min-h-[52px] max-h-32 resize-none bg-background/50 border-border text-text-primary placeholder:text-text-muted focus-visible:ring-mirror-glow/50 rounded-xl transition-all ${
                voiceMode ? "ring-2 ring-mirror-glow/70" : ""
              }`}
              disabled={isLoading}
            />
            <Button
              type="button"
              onClick={toggleVoiceMode}
              disabled={!isSpeechSupported}
              size="icon"
              className={`h-[52px] w-[52px] rounded-xl transition-all duration-300 ${
                voiceMode
                  ? "bg-mirror-glow text-mirror-depth"
                  : "bg-mirror-surface/80 text-text-primary hover:bg-mirror-surface border border-border"
              }`}
              title={
                isSpeechSupported
                  ? voiceMode
                    ? "End voice conversation"
                    : "Start voice conversation"
                  : "Voice conversation not supported in this browser"
              }
            >
              {voiceMode ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-[52px] w-[52px] rounded-xl bg-mirror-glow hover:bg-mirror-glow/90 text-mirror-depth transition-all duration-300"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
