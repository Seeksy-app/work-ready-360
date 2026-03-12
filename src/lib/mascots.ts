import mascotDefault from '@/assets/agent360-mascot.png';
import mascotChef from '@/assets/mascots/mascot-chef.png';
import mascotNurse from '@/assets/mascots/mascot-nurse.png';
import mascotEngineer from '@/assets/mascots/mascot-engineer.png';
import mascotGraduate from '@/assets/mascots/mascot-graduate.png';
import mascotArtist from '@/assets/mascots/mascot-artist.png';
import mascotBusiness from '@/assets/mascots/mascot-business.png';
import mascotScientist from '@/assets/mascots/mascot-scientist.png';

export const MASCOTS = [
  { id: 'default', label: 'Agent 360', src: mascotDefault },
  { id: 'chef', label: 'Chef', src: mascotChef },
  { id: 'nurse', label: 'Healthcare', src: mascotNurse },
  { id: 'engineer', label: 'Engineer', src: mascotEngineer },
  { id: 'graduate', label: 'Graduate', src: mascotGraduate },
  { id: 'artist', label: 'Artist', src: mascotArtist },
  { id: 'business', label: 'Business', src: mascotBusiness },
  { id: 'scientist', label: 'Scientist', src: mascotScientist },
] as const;

export const MASCOT_MAP: Record<string, string> = Object.fromEntries(
  MASCOTS.map((m) => [m.id, m.src])
);

export function getMascotSrc(choice?: string | null): string {
  return MASCOT_MAP[choice || 'default'] || mascotDefault;
}
