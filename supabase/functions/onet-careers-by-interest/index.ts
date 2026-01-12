import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONET_BASE_URL = 'https://services.onetcenter.org/ws';

// Map our category names to O*NET interest area codes
const INTEREST_CODES: Record<string, string> = {
  'Realistic': '1',
  'Investigative': '2',
  'Artistic': '3',
  'Social': '4',
  'Enterprising': '5',
  'Conventional': '6',
  'R': '1',
  'I': '2',
  'A': '3',
  'S': '4',
  'E': '5',
  'C': '6',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { interests, jobZone, start = 0, end = 20 } = await req.json();
    
    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      throw new Error('Interests array is required');
    }
    
    const username = Deno.env.get('ONET_USERNAME');
    const password = Deno.env.get('ONET_PASSWORD');
    
    if (!username || !password) {
      throw new Error('O*NET credentials not configured');
    }

    const authHeader = 'Basic ' + btoa(`${username}:${password}`);
    
    // Get the primary interest area
    const primaryInterest = interests[0];
    const interestCode = INTEREST_CODES[primaryInterest] || '1';
    
    // Get careers related to the interest area
    let url = `${ONET_BASE_URL}/mnm/interestprofiler/interests/${interestCode}/careers?start=${start}&end=${end}`;
    
    // Add job zone filter if provided
    if (jobZone) {
      url += `&job_zone=${jobZone}`;
    }
    
    console.log('Fetching careers for interest:', primaryInterest, 'from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('O*NET API Error:', response.status, errorText);
      throw new Error(`O*NET API error: ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify({
      interest: primaryInterest,
      interestCode,
      careers: data.career || [],
      total: data.total || 0,
    }), {
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
