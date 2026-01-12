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
    const { code } = await req.json();
    
    if (!code) {
      throw new Error('Occupation code is required');
    }
    
    const username = Deno.env.get('ONET_USERNAME');
    const password = Deno.env.get('ONET_PASSWORD');
    
    if (!username || !password) {
      throw new Error('O*NET credentials not configured');
    }

    const authHeader = 'Basic ' + btoa(`${username}:${password}`);
    
    // Get career overview from My Next Move
    const careerUrl = `${ONET_BASE_URL}/mnm/careers/${code}`;
    
    const response = await fetch(careerUrl, {
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

    const careerData = await response.json();

    // Fetch additional details: skills, knowledge, abilities
    const [skillsRes, knowledgeRes, abilitiesRes, outlookRes] = await Promise.all([
      fetch(`${ONET_BASE_URL}/mnm/careers/${code}/skills`, {
        headers: { 'Authorization': authHeader, 'Accept': 'application/json' },
      }),
      fetch(`${ONET_BASE_URL}/mnm/careers/${code}/knowledge`, {
        headers: { 'Authorization': authHeader, 'Accept': 'application/json' },
      }),
      fetch(`${ONET_BASE_URL}/mnm/careers/${code}/abilities`, {
        headers: { 'Authorization': authHeader, 'Accept': 'application/json' },
      }),
      fetch(`${ONET_BASE_URL}/mnm/careers/${code}/outlook`, {
        headers: { 'Authorization': authHeader, 'Accept': 'application/json' },
      }),
    ]);

    const [skills, knowledge, abilities, outlook] = await Promise.all([
      skillsRes.ok ? skillsRes.json() : { element: [] },
      knowledgeRes.ok ? knowledgeRes.json() : { element: [] },
      abilitiesRes.ok ? abilitiesRes.json() : { element: [] },
      outlookRes.ok ? outlookRes.json() : null,
    ]);

    const result = {
      ...careerData,
      skills: skills.element || [],
      knowledge: knowledge.element || [],
      abilities: abilities.element || [],
      outlook: outlook,
    };

    return new Response(JSON.stringify(result), {
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
