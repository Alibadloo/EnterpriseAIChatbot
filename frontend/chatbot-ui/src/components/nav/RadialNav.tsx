import { Home, Clock, Search, Settings } from 'lucide-react';
import type { TabId } from '../../types';
import { useAppSelector } from '../../store/store';

/*
 * 4-item dial — equal spacing at 90° intervals
 *
 *    Chat (0° / top)
 *       ▲
 * History ◄   ► Search
 * (270°)       (90°)
 *       ▼
 *   Settings (180° / bottom)
 *
 * Disc: 300px   Ring R=80 (stroke 12)   Icons R=108   Knob R=50
 * Min edge clearance: 300/2 − 108 − 16 = 26px  ✓
 */
const S      = 300;
const CX     = S / 2;   // 150
const CY     = S / 2;   // 150
const R_RING = 80;
const R_W    = 12;
const R_ICON = 108;
const R_KNOB = 50;
const SPAN   = 40;      // arc half-span in degrees

const ITEMS = [
  { id: 'chat'     as TabId, icon: Home,     clock: 0,   label: 'Chat'     },
  { id: 'search'   as TabId, icon: Search,   clock: 90,  label: 'Search'   },
  { id: 'settings' as TabId, icon: Settings, clock: 180, label: 'Settings' },
  { id: 'history'  as TabId, icon: Clock,    clock: 270, label: 'History'  },
];

function pt(deg: number, r: number) {
  const a = (deg - 90) * (Math.PI / 180);
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function arcPath(center: number, halfSpan: number, r: number) {
  const a = pt(center - halfSpan, r);
  const b = pt(center + halfSpan, r);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

interface Props { active: TabId; onChange: (t: TabId) => void; }

export default function RadialNav({ active, onChange }: Props) {
  const isDark     = useAppSelector(s => s.app.theme) === 'dark';
  const accent     = isDark ? '#e879f9' : '#3b82f6';
  const activeItem = ITEMS.find(i => i.id === active) ?? ITEMS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, userSelect: 'none' }}>

      {/* neumorphic disc */}
      <div style={{
        position: 'relative',
        width: S, height: S,
        borderRadius: '50%',
        flexShrink: 0,
        background: isDark ? '#1c1c1c' : '#eaeaee',
        boxShadow: isDark
          ? '12px 12px 28px #060606, -12px -12px 28px #303030'
          : '12px 12px 28px #bebec4, -12px -12px 28px #ffffff',
        transition: 'background .3s, box-shadow .3s',
      }}>

        {/* SVG: ring + arc + knob + pointer */}
        <svg
          width={S} height={S}
          style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
        >
          {/* ring track */}
          <circle
            cx={CX} cy={CY} r={R_RING}
            fill="none"
            stroke={isDark ? '#282828' : '#d2d2da'}
            strokeWidth={R_W}
          />

          {/* glowing arc */}
          <path
            d={arcPath(activeItem.clock, SPAN, R_RING)}
            fill="none"
            stroke={accent}
            strokeWidth={R_W}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 5px ${accent}) drop-shadow(0 0 12px ${accent}66)` }}
          />

          {/* knob shadow disc */}
          <circle
            cx={CX} cy={CY} r={R_KNOB + 5}
            fill={isDark ? '#181818' : '#eaeaee'}
            style={{
              filter: isDark
                ? 'drop-shadow(3px 3px 8px #040404) drop-shadow(-3px -3px 8px #2c2c2c)'
                : 'drop-shadow(3px 3px 8px #b8b8c0) drop-shadow(-3px -3px 8px #ffffff)',
            }}
          />
          <circle cx={CX} cy={CY} r={R_KNOB} fill={isDark ? '#111' : '#f0f0f4'} />
          <circle cx={CX} cy={CY} r={R_KNOB} fill="none" stroke={accent} strokeWidth={1.5} strokeOpacity={0.5} />

          {/* rotating pointer via CSS transform on <g> */}
          <g style={{
            transformOrigin: `${CX}px ${CY}px`,
            transform: `rotate(${activeItem.clock}deg)`,
            transition: 'transform .4s cubic-bezier(.4,0,.2,1)',
          }}>
            <line
              x1={CX} y1={CY}
              x2={CX} y2={CY - (R_KNOB - 12)}
              stroke={accent} strokeWidth={3} strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 4px ${accent})` }}
            />
          </g>

          {/* centre dot */}
          <circle cx={CX} cy={CY} r={5} fill={accent}
            style={{ filter: `drop-shadow(0 0 5px ${accent})` }}
          />
        </svg>

        {/* icon buttons */}
        {ITEMS.map(item => {
          const { x, y } = pt(item.clock, R_ICON);
          const isActive = item.id === active;
          const Icon     = item.icon;

          return (
            <button
              key={item.id}
              title={item.label}
              onClick={() => onChange(item.id)}
              style={{
                position: 'absolute',
                left: Math.round(x) - 16,
                top:  Math.round(y) - 16,
                width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent',
                border: 'none', outline: 'none',
                borderRadius: '50%',
                cursor: 'pointer', padding: 0,
                zIndex: 3,
                color: isActive ? accent : (isDark ? '#454545' : '#b8b8c0'),
                filter: isActive
                  ? `drop-shadow(0 0 5px ${accent}) drop-shadow(0 0 10px ${accent}77)`
                  : 'none',
                transition: 'color .25s, filter .25s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = isDark ? '#888' : '#666'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = isDark ? '#454545' : '#b8b8c0'; }}
            >
              <Icon size={isActive ? 20 : 17} strokeWidth={isActive ? 2.5 : 1.8} />
            </button>
          );
        })}
      </div>

      {/* active label */}
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '.14em',
        textTransform: 'uppercase',
        color: accent,
        filter: `drop-shadow(0 0 5px ${accent}88)`,
        transition: 'color .4s',
        height: 12,
      }}>
        {activeItem.label}
      </div>
    </div>
  );
}
