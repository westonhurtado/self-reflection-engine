# Voice Conversation Mode

Replace the current inline voice toggle with a dedicated full-screen Conversation Mode built around an animated orb, while keeping the existing text chat and AI pipeline untouched.

## Experience

Tap the mic button in the chat composer to enter a focused full-screen view:

- Large centered animated orb with a short status label beneath it.
- Controls: end conversation, mute/unmute mic, show transcript.
- Cycle: Listening -> Finishing your thought -> Reflecting -> Speaking -> Listening, hands-free until closed.
- Tapping the orb (or mic) while the mirror is speaking cancels the spoken reply and returns to Listening immediately.
- Closing returns to normal chat with the whole voice exchange visible as ordinary messages.

Orb states: Listening (gentle breathing, subtly reacts to speech volume of interim results), Finishing (brief settle), Reflecting (slow calm drift), Speaking (soft rhythmic pulse), Muted (still, "Tap to continue").

## Structure

- `src/hooks/useSpeechRecognition.ts` — wraps SpeechRecognition/webkitSpeechRecognition: start/stop/abort, interim + final transcript, 1.2s silence timer to finalize, guarded restart (no restart when ended/muted/speaking, capped retries so no infinite loop), permission-denied and unsupported reporting.
- `src/hooks/useSpeechSynthesis.ts` — wraps SpeechSynthesis: pick a natural available voice, calm rate (~0.95), cancel before each utterance, onend/onerror callbacks, cancel on unmount.
- `src/components/voice/ConversationOrb.tsx` — the orb, driven by a `state` prop.
- `src/components/voice/ConversationMode.tsx` — full-screen overlay: orb, status label, controls, transcript panel, error messaging.
- `src/components/MirrorChat.tsx` — strips out the current inline voice logic; keeps `sendMessage`/`streamChat` as the single submission path and passes it to ConversationMode along with `messages`.

## Behavior rules honored

- Voice turns go through the same `sendMessage` used by typed chat; no second AI pipeline, no separate history.
- Only final transcripts are sent; empty and duplicate submissions are blocked with a busy flag; interim text never touches the composer.
- Recognition is stopped before synthesis starts and only restarted after synthesis fully ends, so the mirror never transcribes itself.
- Replies are spoken only while Conversation Mode is active; normal typing stays silent.
- Errors (denied mic, unsupported browser, recognition failures) are shown in the overlay and never spoken.
- All recognition/synthesis instances are aborted and cancelled on unmount or exit.

## Technical notes

- Orb animations added as new keyframes/animations in `tailwind.config.ts` (breathe, drift, pulse) using existing `mirror-glow` / `mirror-depth` tokens — original composition, no third-party visual copying.
- Transcript panel reuses the existing message rendering styles and auto-scrolls to the newest message.
- No backend, edge function, or database changes.
