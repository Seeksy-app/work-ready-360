import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Two distinct voices for the dialogue
const HOST_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George - professional male host
const GUEST_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah - engaging female co-host

interface PodcastRequest {
  careerTitle: string;
  careerDescription: string;
  whatTheyDo?: string;
  skills?: string[];
  knowledge?: string[];
  outlook?: string;
  salary?: { annual_median?: number };
  userInterests?: string[];
  userValues?: string[];
}

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

function generatePodcastScript(data: PodcastRequest): Array<{ speaker: 'host' | 'guest'; text: string }> {
  const script: Array<{ speaker: 'host' | 'guest'; text: string }> = [];
  
  // Introduction
  script.push({
    speaker: 'host',
    text: `Welcome to Career Spotlight! I'm your host, and today we're diving deep into an exciting career path: ${data.careerTitle}. I've got my co-host here to help break it all down.`
  });
  
  script.push({
    speaker: 'guest',
    text: `Thanks! I'm really excited about this one. ${data.careerTitle} is such a fascinating field, and there's so much to explore here.`
  });

  // What they do
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

  // Skills section
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

  // Knowledge areas
  if (data.knowledge && data.knowledge.length > 0) {
    const topKnowledge = data.knowledge.slice(0, 3).join(', ');
    script.push({
      speaker: 'host',
      text: `And what about the educational background or knowledge areas?`
    });
    
    script.push({
      speaker: 'guest',
      text: `You'll want to have a strong foundation in ${topKnowledge}. This knowledge base will really set you up for success.`
    });
  }

  // User personalization - interests
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

  // User personalization - values
  if (data.userValues && data.userValues.length > 0) {
    const values = data.userValues.slice(0, 3).join(', ');
    script.push({
      speaker: 'host',
      text: `What about work values? How does this career match up?`
    });
    
    script.push({
      speaker: 'guest',
      text: `Your work values emphasize ${values}. This career can definitely satisfy those needs, especially as you grow in the role.`
    });
  }

  // Salary and outlook
  if (data.salary?.annual_median || data.outlook) {
    script.push({
      speaker: 'host',
      text: `Let's talk numbers and future prospects. What can people expect?`
    });
    
    let outlookText = "";
    if (data.salary?.annual_median) {
      outlookText += `The median salary is around $${data.salary.annual_median.toLocaleString()} per year. `;
    }
    if (data.outlook) {
      outlookText += `As for the job outlook: ${data.outlook}`;
    }
    
    script.push({
      speaker: 'guest',
      text: outlookText || "The job market for this field continues to evolve with new opportunities emerging."
    });
  }

  // Closing
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    const data: PodcastRequest = await req.json();
    console.log("Generating podcast for:", data.careerTitle);

    // Generate the script
    const script = generatePodcastScript(data);
    console.log(`Script has ${script.length} segments`);

    // Generate audio for each segment
    const audioSegments: ArrayBuffer[] = [];
    
    for (const segment of script) {
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
    
    // Convert to ArrayBuffer for base64 encoding
    const combinedBuffer = combined.buffer as ArrayBuffer;

    // Create transcript
    const transcript = script.map(s => 
      `[${s.speaker === 'host' ? 'Host' : 'Co-host'}]: ${s.text}`
    ).join('\n\n');

    // Return base64 encoded audio with transcript
    const audioBase64 = base64Encode(combinedBuffer);
    
    return new Response(
      JSON.stringify({
        success: true,
        audioContent: audioBase64,
        transcript,
        duration: Math.round(totalLength / 16000), // Rough estimate
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
