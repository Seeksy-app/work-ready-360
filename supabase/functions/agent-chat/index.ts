import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ONET_BASE_URL = "https://services.onetcenter.org/ws";

function getOnetAuth(): string | null {
  const u = Deno.env.get("ONET_USERNAME");
  const p = Deno.env.get("ONET_PASSWORD");
  if (!u || !p) return null;
  return "Basic " + btoa(`${u}:${p}`);
}

async function onetSearch(keyword: string): Promise<any> {
  const auth = getOnetAuth();
  if (!auth) return { error: "O*NET credentials not configured" };
  const url = `${ONET_BASE_URL}/mnm/search?keyword=${encodeURIComponent(keyword)}&start=0&end=10`;
  const res = await fetch(url, { headers: { Authorization: auth, Accept: "application/json" } });
  if (!res.ok) return { error: `O*NET API error: ${res.status}` };
  return res.json();
}

async function onetCareerDetail(code: string): Promise<any> {
  const auth = getOnetAuth();
  if (!auth) return { error: "O*NET credentials not configured" };
  const careerUrl = `${ONET_BASE_URL}/mnm/careers/${code}`;
  const res = await fetch(careerUrl, { headers: { Authorization: auth, Accept: "application/json" } });
  if (!res.ok) return { error: `O*NET API error: ${res.status}` };
  const career = await res.json();

  const [skillsRes, knowledgeRes, outlookRes] = await Promise.all([
    fetch(`${ONET_BASE_URL}/mnm/careers/${code}/skills`, { headers: { Authorization: auth, Accept: "application/json" } }),
    fetch(`${ONET_BASE_URL}/mnm/careers/${code}/knowledge`, { headers: { Authorization: auth, Accept: "application/json" } }),
    fetch(`${ONET_BASE_URL}/mnm/careers/${code}/outlook`, { headers: { Authorization: auth, Accept: "application/json" } }),
  ]);
  const [skills, knowledge, outlook] = await Promise.all([
    skillsRes.ok ? skillsRes.json() : { element: [] },
    knowledgeRes.ok ? knowledgeRes.json() : { element: [] },
    outlookRes.ok ? outlookRes.json() : null,
  ]);

  return { ...career, skills: skills.element || [], knowledge: knowledge.element || [], outlook };
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_careers",
      description: "Search O*NET occupations by keyword. Use when users ask about career options, job types, or occupations related to a topic.",
      parameters: {
        type: "object",
        properties: { keyword: { type: "string", description: "Search keyword, e.g. 'technology', 'nursing', 'data science'" } },
        required: ["keyword"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_career_details",
      description: "Get detailed O*NET information about a specific occupation including skills, knowledge, and outlook. Use when a user wants to learn more about a specific career.",
      parameters: {
        type: "object",
        properties: { code: { type: "string", description: "O*NET occupation code, e.g. '15-1252.00'" } },
        required: ["code"],
        additionalProperties: false,
      },
    },
  },
];

const SYSTEM_PROMPT = `You are Agent360, the AI career coach for WorkReady360. You help users navigate their career journey with warmth, encouragement, and actionable advice.

You have access to the O*NET occupation database via tools. When users ask about careers, occupations, or job options, USE the search_careers tool to find real occupations. When they want details about a specific career, use get_career_details.

When presenting career search results:
- Show the occupation title and code
- Briefly describe what looks like a good fit based on the user's question
- Offer to dive deeper into any specific occupation

When presenting career details:
- Highlight key skills, knowledge areas, and job outlook
- Relate it back to the user's interests if known
- Be encouraging about pathways into the career

Career data is provided by O*NET (onetcenter.org), sponsored by the U.S. Department of Labor.

Keep responses concise (2-4 sentences unless providing career data). Be encouraging but honest. Use a warm, professional tone. If asked about something outside career topics, gently redirect.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const allMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];

    // First call: may return tool_calls or a direct response
    const firstResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: allMessages,
        tools: TOOLS,
        stream: false,
      }),
    });

    if (!firstResponse.ok) {
      if (firstResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (firstResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await firstResponse.text();
      console.error("AI gateway error:", firstResponse.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstData = await firstResponse.json();
    const choice = firstData.choices?.[0];

    // If no tool calls, stream the final answer
    if (!choice?.message?.tool_calls?.length) {
      // Re-request with streaming for direct answers
      const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: allMessages,
          stream: true,
        }),
      });
      if (!streamResponse.ok) {
        return new Response(JSON.stringify({ error: "AI service unavailable" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(streamResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Execute tool calls
    const toolResults: any[] = [];
    for (const tc of choice.message.tool_calls) {
      const args = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
      let result: any;
      if (tc.function.name === "search_careers") {
        result = await onetSearch(args.keyword);
      } else if (tc.function.name === "get_career_details") {
        result = await onetCareerDetail(args.code);
      } else {
        result = { error: "Unknown tool" };
      }
      toolResults.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }

    // Second call: stream the final response with tool results
    const finalMessages = [
      ...allMessages,
      choice.message,
      ...toolResults,
    ];

    const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: finalMessages,
        stream: true,
      }),
    });

    if (!finalResponse.ok) {
      const t = await finalResponse.text();
      console.error("AI gateway final error:", finalResponse.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(finalResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("agent-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
