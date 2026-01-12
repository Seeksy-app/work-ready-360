import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type WorkValue =
  | "Achievement"
  | "Independence"
  | "Recognition"
  | "Relationships"
  | "Support"
  | "Working_Conditions";

const WORK_VALUES: WorkValue[] = [
  "Achievement",
  "Independence",
  "Recognition",
  "Relationships",
  "Support",
  "Working_Conditions",
];

interface OnetWorkValuesProfile {
  onet_soc_code: string;
  title: string;
  values: Record<WorkValue, { importance_0_100: number }>;
}

interface MatchResult {
  onet_soc_code: string;
  title: string;
  score: number;
  explain: {
    top_user_values: WorkValue[];
    top_job_values: WorkValue[];
    overlaps: WorkValue[];
  };
}

// Helper functions
function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
}

function dot(a: number[], b: number[]): number {
  return a.reduce((s, x, i) => s + x * b[i], 0);
}

function norm(a: number[]): number {
  return Math.sqrt(dot(a, a)) || 1;
}

function pearson(a: number[], b: number[]): number {
  const ma = mean(a);
  const mb = mean(b);
  const da = a.map(x => x - ma);
  const db = b.map(x => x - mb);
  return dot(da, db) / (norm(da) * norm(db));
}

function topKValuesFromVector(vec: number[], k: number): WorkValue[] {
  return WORK_VALUES
    .map((v, i) => ({ v, x: vec[i] }))
    .sort((a, b) => b.x - a.x)
    .slice(0, k)
    .map(o => o.v);
}

/**
 * Fetch work values for a specific occupation from O*NET API
 */
async function fetchOnetWorkValues(
  occupationCode: string,
  username: string,
  password: string
): Promise<OnetWorkValuesProfile | null> {
  const baseUrl = "https://services.onetcenter.org/ws/online/occupations";
  const url = `${baseUrl}/${encodeURIComponent(occupationCode)}/summary/work_values`;
  
  const credentials = btoa(`${username}:${password}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Accept": "application/json",
      },
    });
    
    if (!response.ok) {
      console.error(`O*NET API error for ${occupationCode}:`, response.status);
      return null;
    }
    
    const data = await response.json();
    
    // Parse O*NET work values response
    // The API returns work values with importance scores (typically 0-100 or 1-7 scale)
    const workValuesData = data.work_value || data.work_values || [];
    
    const values: Record<WorkValue, { importance_0_100: number }> = {
      Achievement: { importance_0_100: 50 },
      Independence: { importance_0_100: 50 },
      Recognition: { importance_0_100: 50 },
      Relationships: { importance_0_100: 50 },
      Support: { importance_0_100: 50 },
      Working_Conditions: { importance_0_100: 50 },
    };
    
    // Map O*NET work value names to our enum
    const valueNameMap: Record<string, WorkValue> = {
      "Achievement": "Achievement",
      "Independence": "Independence",
      "Recognition": "Recognition",
      "Relationships": "Relationships",
      "Support": "Support",
      "Working Conditions": "Working_Conditions",
    };
    
    for (const wv of workValuesData) {
      const name = wv.name || wv.element?.name;
      const mappedValue = valueNameMap[name];
      
      if (mappedValue) {
        // O*NET typically uses 1-7 scale for importance
        const rawScore = wv.score || wv.importance || 50;
        let normalized: number;
        
        if (rawScore <= 7) {
          // Convert 1-7 scale to 0-100
          normalized = ((rawScore - 1) / 6) * 100;
        } else if (rawScore <= 100) {
          // Already 0-100 scale
          normalized = rawScore;
        } else {
          normalized = 50; // Default
        }
        
        values[mappedValue] = { importance_0_100: Math.round(normalized) };
      }
    }
    
    return {
      onet_soc_code: occupationCode,
      title: data.title || occupationCode,
      values,
    };
  } catch (error) {
    console.error(`Error fetching work values for ${occupationCode}:`, error);
    return null;
  }
}

/**
 * Search for occupations and get their work values
 */
async function searchOccupationsWithWorkValues(
  keyword: string,
  username: string,
  password: string,
  limit: number = 20
): Promise<OnetWorkValuesProfile[]> {
  const baseUrl = "https://services.onetcenter.org/ws/online/search";
  const url = `${baseUrl}?keyword=${encodeURIComponent(keyword)}&end=${limit}`;
  
  const credentials = btoa(`${username}:${password}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Accept": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`O*NET search error: ${response.status}`);
    }
    
    const data = await response.json();
    const occupations = data.occupation || [];
    
    // Fetch work values for each occupation (limit to avoid rate limiting)
    const profiles: OnetWorkValuesProfile[] = [];
    
    for (const occ of occupations.slice(0, Math.min(limit, 10))) {
      const profile = await fetchOnetWorkValues(occ.code, username, password);
      if (profile) {
        profile.title = occ.title || profile.title;
        profiles.push(profile);
      }
    }
    
    return profiles;
  } catch (error) {
    console.error("Error searching occupations:", error);
    throw error;
  }
}

/**
 * Match user work values against O*NET occupations
 */
function matchWorkValues(
  userValues: Record<WorkValue, number>, // normalized 0-100 scores
  onetProfiles: OnetWorkValuesProfile[],
  topk: number = 3
): MatchResult[] {
  const userVec = WORK_VALUES.map(v => userValues[v] ?? 50);
  const userTop = topKValuesFromVector(userVec, topk);
  
  const matches: MatchResult[] = onetProfiles.map(profile => {
    const jobVec = WORK_VALUES.map(v => profile.values[v]?.importance_0_100 ?? 50);
    const jobTop = topKValuesFromVector(jobVec, topk);
    
    // Hybrid weighted top-k matching
    const base = pearson(userVec, jobVec);
    const overlaps = userTop.filter(v => jobTop.includes(v));
    const bonus = (overlaps.length / topk) * 0.08;
    const score = Math.max(-1, Math.min(1, base + bonus));
    
    return {
      onet_soc_code: profile.onet_soc_code,
      title: profile.title,
      score,
      explain: {
        top_user_values: userTop,
        top_job_values: jobTop,
        overlaps,
      },
    };
  });
  
  matches.sort((a, b) => b.score - a.score);
  return matches;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ONET_USERNAME = Deno.env.get('ONET_USERNAME');
    const ONET_PASSWORD = Deno.env.get('ONET_PASSWORD');
    
    if (!ONET_USERNAME || !ONET_PASSWORD) {
      throw new Error('O*NET credentials not configured');
    }
    
    const { action, ...params } = await req.json();
    
    switch (action) {
      case 'get_occupation_values': {
        // Get work values for a specific occupation
        const { occupation_code } = params;
        if (!occupation_code) {
          throw new Error('occupation_code is required');
        }
        
        const profile = await fetchOnetWorkValues(occupation_code, ONET_USERNAME, ONET_PASSWORD);
        
        return new Response(
          JSON.stringify({ success: true, profile }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'match_careers': {
        // Match user's work values against searched occupations
        const { user_values, keyword, limit = 20 } = params;
        
        if (!user_values) {
          throw new Error('user_values is required');
        }
        
        // If keyword provided, search for occupations
        // Otherwise, use a general career search
        const searchKeyword = keyword || 'career';
        
        const profiles = await searchOccupationsWithWorkValues(
          searchKeyword,
          ONET_USERNAME,
          ONET_PASSWORD,
          limit
        );
        
        const matches = matchWorkValues(user_values, profiles);
        
        return new Response(
          JSON.stringify({
            success: true,
            method: 'hybrid_weighted_topk',
            matches,
            profiles_searched: profiles.length,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'match_specific_careers': {
        // Match user's work values against specific occupation codes
        const { user_values, occupation_codes } = params;
        
        if (!user_values || !occupation_codes?.length) {
          throw new Error('user_values and occupation_codes are required');
        }
        
        const profiles: OnetWorkValuesProfile[] = [];
        
        for (const code of occupation_codes.slice(0, 20)) {
          const profile = await fetchOnetWorkValues(code, ONET_USERNAME, ONET_PASSWORD);
          if (profile) {
            profiles.push(profile);
          }
        }
        
        const matches = matchWorkValues(user_values, profiles);
        
        return new Response(
          JSON.stringify({
            success: true,
            method: 'hybrid_weighted_topk',
            matches,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
  } catch (error: unknown) {
    console.error('Error in onet-work-values:', error);
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