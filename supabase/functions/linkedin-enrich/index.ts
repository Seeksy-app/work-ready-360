import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PDL_API_KEY = Deno.env.get('PDL_API_KEY');
    if (!PDL_API_KEY) {
      throw new Error('PDL_API_KEY is not configured');
    }

    const { linkedinUrl, userId } = await req.json();

    if (!linkedinUrl || !userId) {
      throw new Error('linkedinUrl and userId are required');
    }

    // Normalize LinkedIn URL
    let profileUrl = linkedinUrl.trim();
    if (!profileUrl.startsWith('http')) {
      profileUrl = `https://www.linkedin.com/in/${profileUrl}`;
    }

    console.log(`Enriching LinkedIn profile: ${profileUrl}`);

    // Call People Data Labs Person Enrichment API
    const pdlResponse = await fetch(
      `https://api.peopledatalabs.com/v5/person/enrich?linkedin_url=${encodeURIComponent(profileUrl)}&min_likelihood=3`,
      {
        method: 'GET',
        headers: {
          'X-Api-Key': PDL_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!pdlResponse.ok) {
      const errText = await pdlResponse.text();
      console.error(`PDL API error [${pdlResponse.status}]:`, errText);
      
      if (pdlResponse.status === 404) {
        throw new Error('LinkedIn profile not found. Please check the URL and try again.');
      }
      if (pdlResponse.status === 402) {
        throw new Error('LinkedIn enrichment service quota exceeded. Please try again later.');
      }
      throw new Error(`LinkedIn enrichment failed: ${pdlResponse.status}`);
    }

    const pdlData = await pdlResponse.json();
    console.log(`PDL enrichment successful, likelihood: ${pdlData.likelihood}`);

    // Extract relevant fields
    const enrichedData = {
      full_name: pdlData.data?.full_name || null,
      headline: pdlData.data?.headline || null,
      summary: pdlData.data?.summary || null,
      industry: pdlData.data?.industry || null,
      job_title: pdlData.data?.job_title || null,
      job_company_name: pdlData.data?.job_company_name || null,
      skills: pdlData.data?.skills || [],
      interests: pdlData.data?.interests || [],
      experience: (pdlData.data?.experience || []).map((exp: any) => ({
        title: exp.title?.name || null,
        company: exp.company?.name || null,
        start_date: exp.start_date || null,
        end_date: exp.end_date || null,
        summary: exp.summary || null,
      })),
      education: (pdlData.data?.education || []).map((edu: any) => ({
        school: edu.school?.name || null,
        degrees: edu.degrees || [],
        majors: edu.majors || [],
        start_date: edu.start_date || null,
        end_date: edu.end_date || null,
      })),
      certifications: pdlData.data?.certifications || [],
      location: pdlData.data?.location_name || null,
    };

    // Save to profiles table
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        linkedin_url: profileUrl,
        linkedin_data: enrichedData,
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to save LinkedIn data:', updateError);
      throw new Error('Failed to save LinkedIn data');
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: enrichedData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('LinkedIn enrichment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
