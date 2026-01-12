import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface OnetCareer {
  code: string;
  title: string;
  href?: string;
  tags?: {
    bright_outlook?: boolean;
    green?: boolean;
  };
}

export interface OnetSearchResult {
  keyword: string;
  total: number;
  start: number;
  end: number;
  career: OnetCareer[];
}

export interface OnetCareerDetail {
  code: string;
  title: string;
  description?: string;
  also_called?: { title: string }[];
  what_they_do?: string;
  on_the_job?: { task: string }[];
  skills: { name: string; description?: string; score?: { value: number } }[];
  knowledge: { name: string; description?: string; score?: { value: number } }[];
  abilities: { name: string; description?: string; score?: { value: number } }[];
  outlook?: {
    category?: string;
    description?: string;
    salary?: { annual_median?: number };
  };
  education?: {
    category?: string;
    typical_education?: string;
  };
  personality?: {
    top_interest?: {
      title: string;
      description: string;
    };
  };
}

export interface OnetCareersResult {
  interest: string;
  interestCode: string;
  careers: OnetCareer[];
  total: number;
}

// Search careers by keyword
export async function searchCareers(keyword: string, start = 0, end = 20): Promise<OnetSearchResult> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/onet-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ keyword, start, end }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to search careers');
  }

  return response.json();
}

// Get detailed career information
export async function getCareerDetails(code: string): Promise<OnetCareerDetail> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/onet-career`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get career details');
  }

  return response.json();
}

// Get matching careers based on Interest Profiler answers
export async function getMatchingCareers(
  answers: number[],
  jobZones: number[] = [1, 2, 3, 4, 5],
  start = 0,
  end = 20
) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/onet-interest-match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ answers, jobZones, start, end }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get matching careers');
  }

  return response.json();
}

// Get careers by interest area
export async function getCareersByInterest(
  interests: string[],
  jobZone?: number,
  start = 0,
  end = 20
): Promise<OnetCareersResult> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/onet-careers-by-interest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ interests, jobZone, start, end }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get careers by interest');
  }

  return response.json();
}

// Map RIASEC category letters to full names
export const RIASEC_NAMES: Record<string, string> = {
  R: 'Realistic',
  I: 'Investigative',
  A: 'Artistic',
  S: 'Social',
  E: 'Enterprising',
  C: 'Conventional',
};

// Map full names to short codes
export const RIASEC_CODES: Record<string, string> = {
  Realistic: 'R',
  Investigative: 'I',
  Artistic: 'A',
  Social: 'S',
  Enterprising: 'E',
  Conventional: 'C',
};
