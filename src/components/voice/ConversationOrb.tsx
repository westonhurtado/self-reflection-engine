import { cn } from "@/lib/utils";

export type OrbState = "listening" | "finishing" | "reflecting" | "speaking" | "muted";

type Props = {
  state: OrbState;
  /** 0-1, subtle reaction to the user's voice while listening. */
  intensity?: number;
  onClick?: () => void;
};

export const ConversationOrb = ({ state, intensity = 0, onClick }: Props) => {
  const still = state === "muted";

  const coreAnimation =
    state === "speaking"
      ? "animate-orb-pulse"
      : state === "reflecting"
        ? "animate-orb-drift"
        : state === "listening" || state === "finishing"
          ? "animate-orb-breathe"
          : "";

  const scale = state === "listening" ? 1 + Math.min(intensity, 1) * 0.06 : 1;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Conversation orb"
      className="relative flex h-64 w-64 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-mirror-glow/60"
    >
      {/* outer halos */}
      {!still && (
        <>
          <span className="absolute inset-0 rounded-full bg-mirror-glow/10 blur-2xl animate-orb-halo" />
          <span
            className="absolute inset-4 rounded-full bg-mirror-glow/10 blur-xl animate-orb-halo"
            style={{ animationDelay: "1.4s" }}
          />
        </>
      )}

      {/* ripple while listening */}
      {state === "listening" && (
        <span className="absolute inset-6 rounded-full border border-mirror-glow/25 animate-orb-ripple" />
      )}

      {/* core */}
      <span
        className={cn(
          "relative h-40 w-40 rounded-full transition-transform duration-300 ease-out",
          "bg-[radial-gradient(circle_at_35%_30%,hsl(var(--mirror-glow)/0.85),hsl(var(--mirror-glow)/0.25)_55%,hsl(var(--mirror-surface))_100%)]",
          "shadow-[0_0_60px_-10px_hsl(var(--mirror-glow)/0.55)]",
          still && "opacity-40 saturate-50",
          coreAnimation
        )}
        style={{ transform: `scale(${scale})` }}
      >
        <span className="absolute inset-3 rounded-full bg-[radial-gradient(circle_at_60%_70%,hsl(var(--mirror-reflection)/0.18),transparent_60%)]" />
      </span>
    </button>
  );
};