import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default voices (can be overridden by request)
const DEFAULT_HOST_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George
const DEFAULT_GUEST_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah

interface ProfilePodcastRequest {
  type: 'profile';
  userName?: string;
  resumeContent?: string;
  linkedinData?: {
    headline?: string;
    summary?: string;
    job_title?: string;
    job_company_name?: string;
    skills?: string[];
    experience?: Array<{ title?: string; company?: string; summary?: string }>;
    education?: Array<{ school?: string; degrees?: string[]; majors?: string[] }>;
    certifications?: string[];
    industry?: string;
  };
  interestProfilerResults?: {
    scores: Record<string, number>;
    topInterests: string[];
  };
  workImportanceResults?: {
    scores: Record<string, number>;
    topValues: string[];
  };
  userId?: string;
  savePodcast?: boolean;
}

interface CareerPodcastRequest {
  type: 'career';
  careerTitle: string;
  careerDescription?: string;
  whatTheyDo?: string;
  skills?: string[];
  knowledge?: string[];
  outlook?: string;
  salary?: { annual_median?: number };
  userInterests?: string[];
  userValues?: string[];
  userValuesScores?: Record<string, number>;
  careerWorkValues?: Record<string, number>;
  occupationCode?: string;
  userId?: string;
  savePodcast?: boolean;
}

type PodcastRequest = ProfilePodcastRequest | CareerPodcastRequest;

async function generateTTS(text: string, voiceId: string, apiKey: string): Promise<ArrayBuffer> {
  console.log(`Generating TTS for voice ${voiceId}, text length: ${text.length}`);
  
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`TTS API error: ${error}`);
    throw new Error(`TTS API error: ${response.status}`);
  }

  return await response.arrayBuffer();
}

async function generateAIScript(data: ProfilePodcastRequest): Promise<Array<{ speaker: 'host' | 'guest'; text: string }>> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  const systemPrompt = `You are a podcast script writer for "Career Spotlight", a two-person career guidance podcast.
You write engaging, conversational dialogue between a Host (professional male) and Co-host (enthusiastic female expert).

CRITICAL RULES:
1. Output ONLY valid JSON - an array of objects with "speaker" ("host" or "guest") and "text" (the dialogue)
2. Keep each speech segment to 2-4 sentences max (for natural audio generation)
3. Make it warm, encouraging, and personalized
4. Total script should be 8-12 segments (4-6 exchanges)
5. No markdown, no code blocks, just the JSON array
6. Avoid overly formal or stiff language - be conversational

Example format:
[
  {"speaker": "host", "text": "Welcome to Career Spotlight! Today we have something special..."},
  {"speaker": "guest", "text": "That's right! We're going to talk about..."}
]`;

  let userPrompt = `Create a personalized career profile podcast episode for ${data.userName || 'our listener'}.

Here's what we know about them:

`;

  if (data.interestProfilerResults) {
    userPrompt += `**Interest Profiler Results (RIASEC):**
Top Interests: ${data.interestProfilerResults.topInterests.join(', ')}
Scores: ${JSON.stringify(data.interestProfilerResults.scores)}

`;
  }

  if (data.workImportanceResults) {
    userPrompt += `**Work Values/Importance Results:**
Top Values: ${data.workImportanceResults.topValues.join(', ')}
Scores: ${JSON.stringify(data.workImportanceResults.scores)}

`;
  }

  if (data.resumeContent) {
    userPrompt += `**Resume Summary:**
${data.resumeContent.slice(0, 2000)}

`;
  }

  if (data.linkedinData) {
    const li = data.linkedinData;
    userPrompt += `**LinkedIn Profile:**
Current Role: ${li.job_title || 'N/A'} at ${li.job_company_name || 'N/A'}
Headline: ${li.headline || 'N/A'}
Industry: ${li.industry || 'N/A'}
Skills: ${(li.skills || []).slice(0, 10).join(', ') || 'N/A'}
Recent Experience: ${(li.experience || []).slice(0, 3).map(e => `${e.title} at ${e.company}`).join('; ') || 'N/A'}
Education: ${(li.education || []).slice(0, 2).map(e => `${(e.degrees || []).join(', ')} from ${e.school}`).join('; ') || 'N/A'}

`;
  }

  userPrompt += `Create an engaging podcast script that:
1. Welcomes the listener personally
2. Discusses their interest profile and what it reveals about them
3. Connects their work values to potential career paths
4. If resume provided, highlights their experience and how it fits
5. Offers encouraging, actionable career guidance
6. Ends with motivation and next steps

Remember: Output ONLY the JSON array, nothing else.`;

  console.log("Calling Lovable AI for script generation...");
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI API error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a moment.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please add credits to continue.");
    }
    throw new Error(`AI API error: ${response.status}`);
  }

  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content received from AI");
  }

  console.log("AI response received, parsing script...");
  
  // Parse the JSON response - handle potential markdown wrapping
  let scriptText = content.trim();
  if (scriptText.startsWith("```json")) {
    scriptText = scriptText.slice(7);
  }
  if (scriptText.startsWith("```")) {
    scriptText = scriptText.slice(3);
  }
  if (scriptText.endsWith("```")) {
    scriptText = scriptText.slice(0, -3);
  }
  scriptText = scriptText.trim();

  try {
    const script = JSON.parse(scriptText);
    if (!Array.isArray(script)) {
      throw new Error("Script is not an array");
    }
    return script;
  } catch (parseError) {
    console.error("Failed to parse AI script:", parseError, "Content:", scriptText.slice(0, 500));
    throw new Error("Failed to parse AI-generated script");
  }
}

function generateWorkValuesExplanation(
  userValues: string[],
  userValuesScores?: Record<string, number>,
  careerWorkValues?: Record<string, number>
): { matchExplanation: string; topMatches: string[]; gaps: string[] } {
  const topMatches: string[] = [];
  const gaps: string[] = [];
  
  if (!userValues || userValues.length === 0) {
    return { matchExplanation: '', topMatches: [], gaps: [] };
  }

  // Format value names for display (e.g., "Working_Conditions" -> "Working Conditions")
  const formatValue = (v: string) => v.replace(/_/g, ' ');

  // If we have both user scores and career values, do detailed matching
  if (userValuesScores && careerWorkValues) {
    const userTop3 = Object.entries(userValuesScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([key]) => key);
    
    const careerTop3 = Object.entries(careerWorkValues)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([key]) => key);
    
    // Find overlaps
    for (const value of userTop3) {
      if (careerTop3.includes(value)) {
        topMatches.push(formatValue(value));
      }
    }
    
    // Find gaps (user values not emphasized in career)
    for (const value of userTop3) {
      const careerScore = careerWorkValues[value] || 0;
      if (careerScore < 50) {
        gaps.push(formatValue(value));
      }
    }
  } else {
    // Fallback to simple user values
    topMatches.push(...userValues.slice(0, 3).map(formatValue));
  }

  let matchExplanation = '';
  if (topMatches.length > 0) {
    matchExplanation = `This career matches your top values: ${topMatches.join(' and ')}. `;
  }
  if (gaps.length > 0) {
    matchExplanation += `However, your value for ${gaps.join(' and ')} may be less emphasized in this role.`;
  }

  return { matchExplanation, topMatches, gaps };
}

function generateCareerScript(data: CareerPodcastRequest): Array<{ speaker: 'host' | 'guest'; text: string }> {
  const script: Array<{ speaker: 'host' | 'guest'; text: string }> = [];
  
  script.push({
    speaker: 'host',
    text: `Welcome to Career Spotlight! I'm your host, and today we're diving deep into an exciting career path: ${data.careerTitle}. I've got my co-host here to help break it all down.`
  });
  
  script.push({
    speaker: 'guest',
    text: `Thanks! I'm really excited about this one. ${data.careerTitle} is such a fascinating field, and there's so much to explore here.`
  });

  if (data.whatTheyDo) {
    script.push({
      speaker: 'host',
      text: `So let's start with the basics. What exactly does someone in this role do day to day?`
    });
    
    script.push({
      speaker: 'guest',
      text: `Great question! ${data.whatTheyDo}`
    });
  }

  if (data.skills && data.skills.length > 0) {
    const topSkills = data.skills.slice(0, 4).join(', ');
    script.push({
      speaker: 'host',
      text: `What kind of skills would someone need to succeed in this career?`
    });
    
    script.push({
      speaker: 'guest',
      text: `The key skills include ${topSkills}. These are really the foundation you'll want to build on if you're considering this path.`
    });
  }

  if (data.userInterests && data.userInterests.length > 0) {
    const interests = data.userInterests.slice(0, 3).join(', ');
    script.push({
      speaker: 'host',
      text: `Now here's something really cool - we actually have some personalized insights based on your assessment results.`
    });
    
    script.push({
      speaker: 'guest',
      text: `That's right! Your top interests include ${interests}, which actually align really well with this career. People with these interests often thrive in this field.`
    });
  }

  // Enhanced work values matching explanation
  if (data.userValues && data.userValues.length > 0) {
    const { matchExplanation, topMatches, gaps } = generateWorkValuesExplanation(
      data.userValues,
      data.userValuesScores,
      data.careerWorkValues
    );
    
    script.push({
      speaker: 'host',
      text: `What about work values? This is really important for long-term job satisfaction.`
    });
    
    if (topMatches.length > 0) {
      script.push({
        speaker: 'guest',
        text: `Great news here! This career matches your top values: ${topMatches.join(' and ')}. That's a strong indicator you'd find this work meaningful and fulfilling.`
      });
      
      if (gaps.length > 0) {
        script.push({
          speaker: 'host',
          text: `Are there any areas where there might be some trade-offs?`
        });
        
        script.push({
          speaker: 'guest',
          text: `Worth noting that your value for ${gaps.join(' and ')} may be less emphasized in this particular role. But that doesn't mean it can't work - it just means being intentional about finding those needs elsewhere, or seeking out specific employers who prioritize those values.`
        });
      }
    } else {
      const values = data.userValues.slice(0, 3).join(', ');
      script.push({
        speaker: 'guest',
        text: `Your work values emphasize ${values}. This career can definitely satisfy those needs, especially as you grow in the role and find the right work environment.`
      });
    }
  }

  script.push({
    speaker: 'host',
    text: `This has been incredibly insightful. Any final thoughts for someone considering this career?`
  });
  
  script.push({
    speaker: 'guest',
    text: `I'd say do your research, maybe try to shadow someone in the field, and don't be afraid to start building those skills now. Every expert was once a beginner!`
  });
  
  script.push({
    speaker: 'host',
    text: `Excellent advice! Thanks for tuning in to Career Spotlight. We hope this helped you learn more about ${data.careerTitle}. Good luck on your career journey!`
  });

  return script;
}

async function savePodcastToDatabase(
  supabaseUrl: string,
  supabaseServiceKey: string,
  userId: string,
  audioData: Uint8Array,
  transcript: string,
  duration: number,
  data: PodcastRequest
): Promise<{ podcastId: string; audioUrl: string }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const podcastId = crypto.randomUUID();
  const fileName = `${userId}/${podcastId}.mp3`;
  
  // Upload audio to storage
  const { error: uploadError } = await supabase.storage
    .from('podcasts')
    .upload(fileName, audioData, {
      contentType: 'audio/mpeg',
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    throw new Error(`Failed to upload audio: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('podcasts')
    .getPublicUrl(fileName);

  const audioUrl = urlData.publicUrl;

  // Determine title based on podcast type
  let title: string;
  let occupationCode: string | null = null;
  let occupationTitle: string | null = null;

  if (data.type === 'profile') {
    title = `Career Profile - ${new Date().toLocaleDateString()}`;
  } else {
    title = `Career Spotlight: ${data.careerTitle}`;
    occupationCode = data.occupationCode || null;
    occupationTitle = data.careerTitle || null;
  }

  // Save podcast record to database using raw insert
  const { error: dbError } = await supabase
    .from('podcasts')
    .insert([{
      id: podcastId,
      user_id: userId,
      title,
      audio_url: audioUrl,
      transcript,
      duration_seconds: duration,
      status: 'completed',
      occupation_code: occupationCode,
      occupation_title: occupationTitle,
    }]);

  if (dbError) {
    console.error("Database insert error:", dbError);
    // Try to clean up the uploaded file
    await supabase.storage.from('podcasts').remove([fileName]);
    throw new Error(`Failed to save podcast: ${dbError.message}`);
  }

  console.log(`Podcast saved successfully: ${podcastId}`);
  return { podcastId, audioUrl };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    const data: PodcastRequest & { hostVoiceId?: string; guestVoiceId?: string } = await req.json();
    console.log("Generating podcast, type:", data.type || 'career');

    const HOST_VOICE_ID = data.hostVoiceId || DEFAULT_HOST_VOICE_ID;
    const GUEST_VOICE_ID = data.guestVoiceId || DEFAULT_GUEST_VOICE_ID;

    // Generate the script based on type
    let script: Array<{ speaker: 'host' | 'guest'; text: string }>;
    
    if (data.type === 'profile') {
      console.log("Generating AI-powered profile podcast...");
      script = await generateAIScript(data);
    } else {
      console.log("Generating career-focused podcast for:", (data as CareerPodcastRequest).careerTitle);
      script = generateCareerScript(data as CareerPodcastRequest);
    }
    
    console.log(`Script has ${script.length} segments`);

    // Generate audio for each segment
    const audioSegments: ArrayBuffer[] = [];
    
    for (let i = 0; i < script.length; i++) {
      const segment = script[i];
      console.log(`Generating audio segment ${i + 1}/${script.length}...`);
      const voiceId = segment.speaker === 'host' ? HOST_VOICE_ID : GUEST_VOICE_ID;
      const audio = await generateTTS(segment.text, voiceId, ELEVENLABS_API_KEY);
      audioSegments.push(audio);
    }

    console.log(`Generated ${audioSegments.length} audio segments`);

    // Combine all audio segments into one
    const totalLength = audioSegments.reduce((acc, seg) => acc + seg.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const segment of audioSegments) {
      combined.set(new Uint8Array(segment), offset);
      offset += segment.byteLength;
    }

    // Create transcript
    const transcript = script.map(s => 
      `[${s.speaker === 'host' ? 'Host' : 'Co-host'}]: ${s.text}`
    ).join('\n\n');

    // Calculate approximate duration (rough estimate based on audio size)
    const duration = Math.round(totalLength / 16000);

    // Save to database if requested
    let savedPodcast: { podcastId: string; audioUrl: string } | null = null;
    
    if (data.savePodcast && data.userId) {
      console.log("Saving podcast to database...");
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase credentials not configured");
      } else {
        savedPodcast = await savePodcastToDatabase(
          supabaseUrl,
          supabaseServiceKey,
          data.userId,
          combined,
          transcript,
          duration,
          data
        );
      }
    }

    // Return base64 encoded audio with transcript
    const audioBase64 = base64Encode(combined.buffer as ArrayBuffer);
    
    return new Response(
      JSON.stringify({
        success: true,
        audioContent: audioBase64,
        transcript,
        duration,
        podcastId: savedPodcast?.podcastId,
        audioUrl: savedPodcast?.audioUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: unknown) {
    console.error("Error generating podcast:", error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate podcast';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
