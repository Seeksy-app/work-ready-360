import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

// RIASEC sectors with their career areas mapped from the World of Work diagram
const RIASEC_SECTORS = {
  E: {
    label: 'Enterprising',
    subtitle: 'Administration & Sales',
    color: 'hsl(225 55% 22%)',      // accent
    highlightColor: 'hsl(225 55% 35%)',
    startAngle: -60,
    sweepAngle: 60,
    careerAreas: [
      { key: 'A', name: 'Employment-Related Services' },
      { key: 'B', name: 'Marketing & Sales' },
      { key: 'C', name: 'Management' },
      { key: 'D', name: 'Regulation & Protection' },
    ],
  },
  C: {
    label: 'Conventional',
    subtitle: 'Business Operations',
    color: 'hsl(200 45% 45%)',
    highlightColor: 'hsl(200 45% 58%)',
    startAngle: 0,
    sweepAngle: 60,
    careerAreas: [
      { key: 'E', name: 'Communication & Records' },
      { key: 'F', name: 'Financial Transactions' },
      { key: 'G', name: 'Distribution & Dispatching' },
    ],
  },
  R: {
    label: 'Realistic',
    subtitle: 'Technical',
    color: 'hsl(170 40% 40%)',
    highlightColor: 'hsl(170 40% 55%)',
    startAngle: 60,
    sweepAngle: 60,
    careerAreas: [
      { key: 'H', name: 'Transport Operation & Related' },
      { key: 'I', name: 'Ag/Forestry & Related' },
      { key: 'J', name: 'Computer/Info Specialties' },
      { key: 'K', name: 'Construction & Maintenance' },
      { key: 'L', name: 'Crafts & Related' },
      { key: 'M', name: 'Manufacturing & Processing' },
      { key: 'N', name: 'Mechanical & Electrical' },
    ],
  },
  I: {
    label: 'Investigative',
    subtitle: 'Science & Technology',
    color: 'hsl(260 35% 45%)',
    highlightColor: 'hsl(260 35% 58%)',
    startAngle: 120,
    sweepAngle: 60,
    careerAreas: [
      { key: 'O', name: 'Engineering & Technologies' },
      { key: 'P', name: 'Natural Sciences & Technologies' },
      { key: 'Q', name: 'Medical Technologies' },
    ],
  },
  A: {
    label: 'Artistic',
    subtitle: 'Arts',
    color: 'hsl(340 45% 50%)',
    highlightColor: 'hsl(340 45% 62%)',
    startAngle: 180,
    sweepAngle: 60,
    careerAreas: [
      { key: 'R', name: 'Medical Diagnosis & Treatment' },
      { key: 'S', name: 'Social Science' },
      { key: 'T', name: 'Applied Arts (Visual)' },
      { key: 'U', name: 'Creative & Performing Arts' },
      { key: 'V', name: 'Applied Arts (Written & Spoken)' },
    ],
  },
  S: {
    label: 'Social',
    subtitle: 'Social Service',
    color: 'hsl(45 85% 50%)',
    highlightColor: 'hsl(45 85% 60%)',
    startAngle: 240,
    sweepAngle: 60,
    careerAreas: [
      { key: 'W', name: 'Health Care' },
      { key: 'X', name: 'Education' },
      { key: 'Y', name: 'Community Services' },
      { key: 'Z', name: 'Personal Services' },
    ],
  },
};

const WORK_TASKS = [
  { label: 'DATA', angle: -90 },
  { label: 'THINGS', angle: 0 },
  { label: 'IDEAS', angle: 90 },
  { label: 'PEOPLE', angle: 180 },
];

interface WowWheelProps {
  scores: Record<string, number>;
  topCodes: string[];
  className?: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number, innerR?: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  if (innerR !== undefined) {
    const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
    const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} L ${innerStart.x} ${innerStart.y} A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y} Z`;
  }

  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export default function WowWheel({ scores, topCodes, className }: WowWheelProps) {
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  const maxScore = Math.max(...Object.values(scores), 1);

  const cx = 300, cy = 300;
  const outerR = 270, midR = 200, innerR = 130, coreR = 60;

  const activeSector = selectedSector || hoveredSector;

  const sectorEntries = useMemo(() => Object.entries(RIASEC_SECTORS) as [string, typeof RIASEC_SECTORS[keyof typeof RIASEC_SECTORS]][], []);

  return (
    <div className={cn("relative", className)}>
      <svg viewBox="0 0 600 600" className="w-full max-w-[560px] mx-auto drop-shadow-lg">
        <defs>
          {/* Glow filter for highlighted sectors */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glowStrong" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background circle */}
        <circle cx={cx} cy={cy} r={outerR + 8} fill="hsl(225 30% 12%)" opacity="0.05" />

        {/* Render sectors */}
        {sectorEntries.map(([code, sector]) => {
          const isTop = topCodes.includes(code);
          const isActive = activeSector === code;
          const score = scores[code] || 0;
          const intensity = score / maxScore;
          const startA = sector.startAngle;
          const endA = sector.startAngle + sector.sweepAngle;

          // Outer ring (career areas)
          const outerPath = arcPath(cx, cy, outerR, startA, endA, midR);
          // Inner ring (RIASEC label)
          const innerPath = arcPath(cx, cy, midR, startA, endA, innerR);

          // Career area sub-sectors
          const areas = sector.careerAreas;
          const areaAngle = sector.sweepAngle / areas.length;

          // Label position
          const labelAngle = startA + sector.sweepAngle / 2;
          const labelPos = polarToCartesian(cx, cy, midR - 35, labelAngle);
          const subtitlePos = polarToCartesian(cx, cy, midR - 52, labelAngle);

          return (
            <g
              key={code}
              className="transition-all duration-300 cursor-pointer"
              style={{ opacity: activeSector && !isActive ? 0.4 : 1 }}
              onMouseEnter={() => setHoveredSector(code)}
              onMouseLeave={() => setHoveredSector(null)}
              onClick={() => setSelectedSector(selectedSector === code ? null : code)}
              filter={isTop && !activeSector ? 'url(#glow)' : isActive ? 'url(#glowStrong)' : undefined}
            >
              {/* Outer ring - career areas */}
              {areas.map((area, i) => {
                const aStart = startA + i * areaAngle;
                const aEnd = aStart + areaAngle;
                const aPath = arcPath(cx, cy, outerR, aStart, aEnd, midR);
                const aLabelPos = polarToCartesian(cx, cy, (outerR + midR) / 2, aStart + areaAngle / 2);

                return (
                  <g key={area.key}>
                    <path
                      d={aPath}
                      fill={isTop ? sector.highlightColor : sector.color}
                      stroke="hsl(0 0% 100%)"
                      strokeWidth="1"
                      opacity={isTop ? 0.85 + intensity * 0.15 : 0.35}
                    />
                    <text
                      x={aLabelPos.x}
                      y={aLabelPos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize="9"
                      fontWeight="600"
                      opacity={isActive ? 1 : 0.85}
                      className="pointer-events-none select-none"
                    >
                      {area.key}
                    </text>
                  </g>
                );
              })}

              {/* Inner ring - RIASEC type */}
              <path
                d={innerPath}
                fill={isTop ? sector.highlightColor : sector.color}
                stroke="hsl(0 0% 100%)"
                strokeWidth="1.5"
                opacity={isTop ? 0.95 : 0.5}
              />

              {/* Score bar (radial from innerR toward midR) */}
              {isTop && (
                <path
                  d={arcPath(cx, cy, innerR + (midR - innerR) * intensity * 0.6, startA + 2, endA - 2, innerR + 2)}
                  fill="hsl(0 0% 100%)"
                  opacity="0.2"
                  className="pointer-events-none"
                />
              )}

              {/* RIASEC label */}
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize="13"
                fontWeight="700"
                className="pointer-events-none select-none"
              >
                {sector.label}
              </text>
              <text
                x={subtitlePos.x}
                y={subtitlePos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize="8"
                fontWeight="400"
                opacity="0.8"
                className="pointer-events-none select-none"
              >
                ({code})
              </text>

              {/* Top badge */}
              {isTop && (
                <>
                  {(() => {
                    const badgePos = polarToCartesian(cx, cy, outerR + 2, labelAngle);
                    const rank = topCodes.indexOf(code) + 1;
                    return (
                      <g className="pointer-events-none">
                        <circle cx={badgePos.x} cy={badgePos.y} r="12" fill="hsl(45 95% 55%)" />
                        <text
                          x={badgePos.x}
                          y={badgePos.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="hsl(225 30% 12%)"
                          fontSize="10"
                          fontWeight="800"
                        >
                          #{rank}
                        </text>
                      </g>
                    );
                  })()}
                </>
              )}
            </g>
          );
        })}

        {/* Core circle */}
        <circle cx={cx} cy={cy} r={coreR} fill="hsl(15 60% 60%)" opacity="0.9" />
        <circle cx={cx} cy={cy} r={coreR - 3} fill="none" stroke="hsl(0 0% 100%)" strokeWidth="1" opacity="0.3" />

        {/* Work task labels in center */}
        {WORK_TASKS.map((task) => {
          const pos = polarToCartesian(cx, cy, coreR * 0.55, task.angle);
          return (
            <text
              key={task.label}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize="9"
              fontWeight="700"
              className="pointer-events-none select-none"
            >
              {task.label}
            </text>
          );
        })}

        {/* Center arrows */}
        <line x1={cx - 20} y1={cy} x2={cx + 20} y2={cy} stroke="white" strokeWidth="1" opacity="0.4" markerEnd="url(#arrow)" />
        <line x1={cx} y1={cy - 20} x2={cx} y2={cy + 20} stroke="white" strokeWidth="1" opacity="0.4" />
      </svg>

      {/* Detail panel */}
      {activeSector && RIASEC_SECTORS[activeSector as keyof typeof RIASEC_SECTORS] && (
        <div className="mt-4 p-4 rounded-xl border bg-card animate-fade-in">
          {(() => {
            const s = RIASEC_SECTORS[activeSector as keyof typeof RIASEC_SECTORS];
            const isTop = topCodes.includes(activeSector);
            const rank = topCodes.indexOf(activeSector) + 1;
            const score = scores[activeSector] || 0;
            return (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: s.highlightColor, color: 'white' }}
                  >
                    {activeSector}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{s.label}</h4>
                    <p className="text-xs text-muted-foreground">{s.subtitle}</p>
                  </div>
                  {isTop && (
                    <span className="ml-auto px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      #{rank} Match
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-muted-foreground">Score:</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(score / 30) * 100}%`,
                        backgroundColor: s.highlightColor,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-foreground">{score}/30</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Career Areas:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {s.careerAreas.map((a) => (
                      <span
                        key={a.key}
                        className="px-2 py-1 rounded-md text-xs font-medium border"
                        style={{
                          borderColor: s.highlightColor + '40',
                          backgroundColor: s.highlightColor + '15',
                          color: s.highlightColor,
                        }}
                      >
                        {a.key}. {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {!activeSector && (
        <p className="text-center text-xs text-muted-foreground mt-3">
          Tap a sector to explore career areas • Your top matches are highlighted
        </p>
      )}
    </div>
  );
}
