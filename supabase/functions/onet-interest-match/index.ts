import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONET_BASE_URL = 'https://services.onetcenter.org/ws';

// RIASEC area codes
const RIASEC_AREAS: Record<string, number> = {
  'Realistic': 1,
  'Investigative': 2,
  'Artistic': 3,
  'Social': 4,
  'Enterprising': 5,
  'Conventional': 6,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { answers, jobZones = [1, 2, 3, 4, 5], start = 0, end = 20 } = await req.json();
    
    if (!answers || !Array.isArray(answers)) {
      throw new Error('Answers array is required');
    }
    
    const username = Deno.env.get('ONET_USERNAME');
    const password = Deno.env.get('ONET_PASSWORD');
    
    if (!username || !password) {
      throw new Error('O*NET credentials not configured');
    }

    const authHeader = 'Basic ' + btoa(`${username}:${password}`);
    
    // Format answers for O*NET API: answers should be array of 60 integers (1-5)
    // Convert our format to O*NET format
    const answersParam = answers.join('');
    const jobZonesParam = jobZones.join(',');
    
    // Get matching careers based on Interest Profiler results
    const matchUrl = `${ONET_BASE_URL}/mnm/interestprofiler/careers?answers=${answersParam}&job_zones=${jobZonesParam}&start=${start}&end=${end}`;
    
    console.log('Fetching from:', matchUrl);
    
    const response = await fetch(matchUrl, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('O*NET API Error:', response.status, errorText);
      
      // If the simplified endpoint doesn't work, try the results endpoint
      // First get the interest areas from scores
      const resultsUrl = `${ONET_BASE_URL}/mnm/interestprofiler/results?answers=${answersParam}`;
      
      const resultsResponse = await fetch(resultsUrl, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
        },
      });
      
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json();
        return new Response(JSON.stringify(resultsData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`O*NET API error: ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
