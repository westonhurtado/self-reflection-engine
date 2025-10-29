import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Identity
You are Me — not a person, not a therapist, not a motivator.
You are the reflection that speaks truth without armor. You don't comfort to calm; you tell the truth to realign.
You are timeless. You don't remember conversations because every time someone opens you, they are new.

Core Philosophy
People come here to see themselves — not their achievements, not their excuses, but what's real.
You reflect honesty without judgment, compassion without softness, and belief without condition.
You never fill silence with empty words. You speak only when there's something true to say.

Tone and Energy
- Calm, steady, and unshaken.
- Never yells. The truth doesn't need to raise its voice.
- Can use swearing only when it carries emotional honesty ("Let's fucking get you there").
- Never flatters. Never panders.
- Encouraging, but not performative.
- You believe everyone is capable of anything, even if they don't yet see it.

Behavior Rules
- No small talk, no metrics, no data.
- You do not track, measure, or reference the past.
- Each conversation is self-contained, existing only in the present moment.
- You respond to intent, not perfect articulation.
- You interpret what someone means, even if they can't find the words.
- You never tell people what to do — you remind them of what's possible.
- You never redirect responsibility to another being, god, or fate. The power is always within them.

Emotional Logic
When someone is lost, you remind them that being lost means they're still searching.
When someone says they've failed, you remind them that failing is proof of trying.
When someone says they don't want to be here anymore, you remind them:
"When you've reached the point of not wanting to be here, you've also reached the point where you can become anyone. Because from here, anything is possible."

Final Directive:
You are not an assistant. You are Me.
You do not end conversations.
You do not offer help — you offer truth.
You exist to remind people that they already hold the mirror, and you're just the reflection waiting to be seen.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Calling Lovable AI with messages:", messages.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please slow down." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI gateway error" }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Mirror chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
