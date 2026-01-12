import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONET_BASE_URL = 'https://services.onetcenter.org/ws';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { keyword, start = 0, end = 20 } = await req.json();
    
    const username = Deno.env.get('ONET_USERNAME');
    const password = Deno.env.get('ONET_PASSWORD');
    
    if (!username || !password) {
      throw new Error('O*NET credentials not configured');
    }

    const authHeader = 'Basic ' + btoa(`${username}:${password}`);
    
    // Search careers using My Next Move API
    const searchUrl = `${ONET_BASE_URL}/mnm/search?keyword=${encodeURIComponent(keyword)}&start=${start}&end=${end}`;
    
    const response = await fetch(searchUrl, {
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
