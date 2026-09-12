'use client';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Truck,
  Route,
  Wallet,
  Users,
  Settings,
  UserRound,
  ChevronRight,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Download,
  Upload,
  MapPin,
  CalendarDays,
  Bell,
  TrendingUp,
  Check,
  Search,
  SlidersHorizontal,
  Copy,
  LogOut,
  ShieldCheck,
  Bookmark,
  FileText,
  CheckCircle2,
  RefreshCw,
  Link as LinkIcon,
  Info,
  RotateCcw,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster, toast as toastManager } from '@/components/ui/toast';
const toast = {
  success: (title: string) => toastManager.add({ title, type: 'success' }),
  error: (title: string) => toastManager.add({ title, type: 'error' }),
};
import {
  defaults,
  seedLoads,
  costs,
  money,
  optimize,
  cities,
  distance,
  type Load,
  type Preferences,
  type Plan,
} from '@/lib/model';
import mapData from '@/lib/map-data.json';
import { validateLoad } from '@/lib/validation';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
const nav = [
  ['Overview', LayoutDashboard],
  ['Load board', Truck],
  ['Profit planner', Route],
  ['Saved plans', Bookmark],
  ['Expenses & reports', Wallet],
  ['Team', Users],
] as const;
type Member = { userId: string; name: string; email: string; role: string };
type Space = { id: string; name: string; role: string };
type WorkspaceState = {
  error?: string;
  user: Member;
  workspace: Space;
  workspaces: Space[];
  loads: Load[];
  preferences: Preferences;
  members: Member[];
  plans: Saved[];
};
const signInUrl = '/signin-with-chatgpt?return_to=/';
type Saved = { id: string; name: string; plan: Plan; created: string };
function Button({
  children,
  onClick,
  primary = false,
  disabled = false,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn ${primary ? 'primary' : ''}`}
    >
      {children}
    </button>
  );
}
function Choice({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (s: string) => void;
  options: string[];
  label?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger aria-label={label || 'Select option'}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Field({
  label,
  children,
  full = false,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`field ${full ? 'full' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
function Badge({
  children,
  amber = false,
  gray = false,
}: {
  children: ReactNode;
  amber?: boolean;
  gray?: boolean;
}) {
  return (
    <span className={`pill ${amber ? 'amber' : ''} ${gray ? 'gray' : ''}`}>
      <i className="dot" />
      {children}
    </span>
  );
}
function RouteMap({
  loads,
  selected,
  onSelect,
}: {
  loads: Load[];
  selected?: string;
  onSelect?: (id: string) => void;
}) {
  const project = (lat: number, lng: number) => [
    (lng + 103) * 20,
    (46 - lat) * 24,
  ];
  const used = loads;
  const labels = Array.from(
    new Set(used.flatMap((l) => [l.origin, l.destination])),
  );
  return (
    <div className="map-wrap">
      <svg
        viewBox="0 0 680 390"
        className="route-map"
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Inline geographic SVG needs its image semantics.
        role="img"
        aria-label="Geographic overview of selected load origins and destinations. Connecting lines are schematic."
      >
        <defs>
          <radialGradient id="mapglow">
            <stop stopColor="#c2dfc4" stopOpacity=".5" />
            <stop offset="1" stopColor="#e6eef4" stopOpacity="0" />
          </radialGradient>
          <filter id="routeglow">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <pattern
            id="grid"
            width="35"
            height="35"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 35 0 L 0 0 0 35"
              fill="none"
              stroke="#cbd9e4"
              strokeWidth=".35"
            />
          </pattern>
        </defs>
        <rect width="680" height="390" fill="url(#grid)" />
        <ellipse cx="365" cy="260" rx="260" ry="190" fill="url(#mapglow)" />
        {mapData.map((s) => (
          <path
            key={s.name}
            d={s.path}
            fill="#f5f8fa"
            stroke="#c5d3dd"
            strokeWidth=".85"
          />
        ))}
        {[
          ['TEXAS', 150, 341],
          ['ARKANSAS', 222, 267],
          ['MISSOURI', 225, 177],
          ['ILLINOIS', 301, 141],
          ['KENTUCKY', 369, 200],
          ['TENNESSEE', 337, 249],
          ['GEORGIA', 407, 324],
          ['N. CAROLINA', 494, 275],
          ['S. CAROLINA', 462, 315],
          ['OHIO', 405, 152],
          ['INDIANA', 347, 164],
          ['ALABAMA', 343, 332],
          ['MISSISSIPPI', 278, 323],
        ].map(([t, x, y]) => (
          <text
            key={t}
            x={x}
            y={y}
            fill="#647c8d"
            fontSize="8"
            letterSpacing="1.7"
            textAnchor="middle"
          >
            {t}
          </text>
        ))}
        {used.map((l, i) => {
          const [x, y] = project(l.originLat, l.originLng),
            [a, b] = project(l.destLat, l.destLng);
          const d = `M${x} ${y} Q${(x + a) / 2 + 12} ${(y + b) / 2 - 18} ${a} ${b}`;
          return (
            <g key={l.id} opacity={selected && selected !== l.id ? 0.4 : 1}>
              <path
                d={d}
                stroke="#337443"
                fill="none"
                strokeWidth="5"
                opacity=".2"
                filter="url(#routeglow)"
              />
              <path
                d={d}
                stroke={i % 3 === 2 ? '#327d87' : '#337443'}
                fill="none"
                strokeWidth="2"
                strokeDasharray={i > 3 ? '4 5' : undefined}
              />
              <g
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- SVG route marker, with keyboard activation.
                role="button"
                tabIndex={0}
                aria-label={`View ${l.origin} to ${l.destination}`}
                onClick={() => onSelect?.(l.id)}
                onKeyDown={(e) => e.key === 'Enter' && onSelect?.(l.id)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={(x + a) / 2 - 13}
                  y={(y + b) / 2 - 23}
                  width="27"
                  height="20"
                  rx="5"
                  fill="#337443"
                />
                <Truck
                  x={(x + a) / 2 - 8}
                  y={(y + b) / 2 - 21}
                  width="17"
                  height="16"
                  color="#ffffff"
                />
              </g>
            </g>
          );
        })}
        {labels.map((city) => {
          const load = used.find(
            (l) => l.origin === city || l.destination === city,
          )!;
          const [x, y] = project(
            load.origin === city ? load.originLat : load.destLat,
            load.origin === city ? load.originLng : load.destLng,
          );
          return (
            <g key={city}>
              <circle cx={x} cy={y} r="9" fill="#337443" opacity=".12" />
              <circle
                cx={x}
                cy={y}
                r="3.5"
                fill="#337443"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <text
                x={x + 9}
                y={y - 8}
                fill="#29485c"
                fontSize="10"
                style={{
                  paintOrder: 'stroke',
                  stroke: '#f5f8fa',
                  strokeWidth: 3,
                }}
              >
                {city.split(',')[0]}
              </text>
            </g>
          );
        })}
        <g transform="translate(640 28)">
          <path d="M0 -10 L-4 2 L0 0 L4 2 Z" fill="#415f73" />
          <text y="14" textAnchor="middle" fill="#526b7d" fontSize="9">
            N
          </text>
        </g>
      </svg>
      <div className="map-legend">
        <span className="green">● Planned loads</span>
        <span>○ Pickup / drop-off</span>
        <span>Route overview · no live GPS</span>
      </div>
    </div>
  );
}
export default function Workspace() {
  const [view, setView] = useState('Overview'),
    [loads, setLoads] = useState<Load[]>(seedLoads),
    [prefs, setPrefs] = useState<Preferences>(defaults),
    [draftPrefs, setDraftPrefs] = useState<Preferences>(defaults),
    [saved, setSaved] = useState<Saved[]>([]),
    [members, setMembers] = useState<Member[]>([]),
    [user, setUser] = useState<Member | null>(null),
    [workspace, setWorkspace] = useState<{
      id: string;
      name: string;
      role: string;
    } | null>(null),
    [sync, setSync] = useState('Connecting'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [modal, setModal] = useState(''),
    [selected, setSelected] = useState<Load | null>(null),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('All loads'),
    [strategy, setStrategy] = useState('Maximum net'),
    [days, setDays] = useState(4),
    [invite, setInvite] = useState(''),
    [inviteRole, setInviteRole] = useState('Dispatcher'),
    [importText, setImportText] = useState(''),
    [importResult, setImportResult] = useState<Load[]>([]),
    [spaces, setSpaces] = useState<
      { id: string; name: string; role: string }[]
    >([]),
    [joinToken, setJoinToken] = useState(''),
    [newSpaceName, setNewSpaceName] = useState(''),
    [newSpaceSeed, setNewSpaceSeed] = useState(true);
  const canEdit = workspace?.role !== 'viewer';
  const sample = loads.some((l) => l.sample);
  const ranked = useMemo(
    () =>
      loads
        .map((l) => ({ ...l, calc: costs(l, prefs) }))
        .sort((a, b) => b.calc.score - a.calc.score),
    [loads, prefs],
  );
  const plan = useMemo(
    () => optimize(loads, prefs, days, strategy),
    [loads, prefs, days, strategy],
  );
  const scenarios = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        optimize(loads, prefs, i + 1, strategy),
      ),
    [loads, prefs, strategy],
  );
  async function api(action: string, data: Record<string, unknown> = {}) {
    const r = await fetch('/api/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, workspaceId: workspace?.id, ...data }),
    });
    const j = (await r.json()) as {
      error?: string;
      token: string;
      ok?: boolean;
    };
    if (!r.ok) throw new Error(j.error || 'Unable to save. Please try again.');
    return j;
  }
  async function refresh(preserve = false) {
    try {
      const r = await fetch('/api/workspace');
      const j = (await r.json()) as WorkspaceState;
      if (r.status === 401) {
        setSync('Demo preview');
        setUser(null);
        setWorkspace(null);
        setLoads(seedLoads());
        setMembers([]);
        setSaved([]);
        setPrefs(defaults);
        setDraftPrefs(defaults);
        return;
      }
      if (!r.ok) throw new Error(j.error || 'Could not load your workspace');
      setUser(j.user);
      setWorkspace(j.workspace);
      setSpaces(j.workspaces || []);
      setLoads(j.loads);
      if (!preserve) {
        setPrefs(j.preferences);
        setDraftPrefs(j.preferences);
        setDays(j.preferences.days);
      }
      setMembers(j.members);
      setSaved(j.plans);
      setSync('Synced');
      setError('');
    } catch (e) {
      setSync('Offline preview');
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    const init = setTimeout(() => {
      void refresh();
      const url = new URL(window.location.href);
      if (url.searchParams.get('join')) {
        setJoinToken(url.searchParams.get('join') || '');
        setModal('join');
      }
      const h = decodeURIComponent(url.hash.slice(1));
      if (
        [...nav.map((n) => n[0]), 'Profile', 'Settings', 'Alerts'].includes(h)
      )
        setView(h);
      const onHash = () => {
        const h = decodeURIComponent(window.location.hash.slice(1));
        if (
          [...nav.map((n) => n[0]), 'Profile', 'Settings', 'Alerts'].includes(h)
        )
          setView(h);
      };
      onHash();
    }, 0);
    return () => clearTimeout(init);
  }, []);
  useEffect(() => {
    if (!workspace?.id || modal || busy) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh(true);
    }, 30000);
    return () => clearInterval(t);
  }, [workspace?.id, modal, busy]);
  function go(v: string) {
    setView(v);
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}#${encodeURIComponent(v)}`,
    );
  }
  async function mutate(
    action: string,
    data: Record<string, unknown>,
    message: string,
  ) {
    if (!user) {
      toast.error('Sign in to save changes to your own workspace.');
      return false;
    }
    setBusy(true);
    try {
      await api(action, data);
      await refresh();
      toast.success(message);
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveLoad(l: Load) {
    if (await mutate('saveLoad', { load: l }, 'Load saved')) {
      setModal('');
      setSelected(null);
    }
  }
  async function savePrefs() {
    if (
      await mutate(
        'savePreferences',
        { preferences: draftPrefs },
        'Profile and preferences saved',
      )
    )
      setModal('');
  }
  function exportCSV() {
    const header = [
      'Order',
      'Origin',
      'Destination',
      'Origin lat',
      'Origin lng',
      'Dest lat',
      'Dest lng',
      'Miles',
      'Pay',
      'Date',
      'Days',
      'Deadhead',
      'MPG',
      'Fuel type',
      'Hotel nights',
      'Tolls',
      'Return cost',
      'Other',
      'CDL',
      'Towable',
      'Status',
      'Driver',
      'Estimated expenses',
      'Estimated net',
    ];
    const rows = loads.map((l) => [
      l.order,
      l.origin,
      l.destination,
      l.originLat,
      l.originLng,
      l.destLat,
      l.destLng,
      l.miles,
      l.pay,
      l.date,
      l.days,
      l.deadhead,
      l.mpg,
      l.fuelType,
      l.hotelNights,
      l.tolls,
      l.returnCost,
      l.other,
      l.cdl,
      l.towable,
      l.status,
      l.driver,
      costs(l, prefs).expenses.toFixed(2),
      costs(l, prefs).net.toFixed(2),
    ]);
    const quote = (v: unknown) =>
      '"' +
      (typeof v === 'number'
        ? String(v)
        : String(v).replace(/^[=+@-]/, "'$&")
      ).replaceAll('"', '""') +
      '"';
    download(
      'sectional-loads.csv',
      [header, ...rows].map((r) => r.map(quote).join(',')).join('\r\n'),
      'text/csv',
    );
  }
  function download(name: string, body: string, type: string) {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function showLoad(l: Load) {
    setSelected(l);
    setModal('detail');
  }
  const startNew = () => {
    setSelected(null);
    setModal('load');
  };
  const pageDescriptions: Record<string, string> = {
    Overview: 'A clearer view of your next profitable move.',
    'Load board': 'Compare opportunities by what you take home.',
    'Profit planner': 'Find a connected route that fits your goals.',
    'Saved plans': 'Your shortlisted routes, ready for the road.',
    'Expenses & reports': 'See where your revenue goes.',
    Team: 'One workspace. A coordinated team.',
    Profile: 'Your preferences shape every recommendation.',
    Settings: 'Manage your workspace and planning defaults.',
    Alerts: 'Opportunities that match your driver preferences.',
  };
  const filtered = ranked.filter(
    (l) =>
      `${l.origin} ${l.destination} ${l.order} ${l.driver}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === 'All loads' ||
        (filter === 'Top picks' && l.calc.reason === 'Top pick') ||
        filter === l.status),
  );
  function loadTable(rows: typeof ranked, compact = false) {
    return rows.length ? (
      <div className="table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>LOAD / ROUTE</TableHead>
              <TableHead>MILES</TableHead>
              <TableHead>LOAD PAY</TableHead>
              <TableHead>EST. NET</TableHead>
              <TableHead>{compact ? 'PROFIT MATCH' : 'STATUS'}</TableHead>
              <TableHead>
                <span className="sr-only">View details</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <button
                    style={{
                      background: 'none',
                      border: 0,
                      textAlign: 'left',
                      padding: 0,
                      color: 'inherit',
                    }}
                    onClick={() => showLoad(l)}
                  >
                    <div className="lane">
                      {l.origin}
                      <ArrowRight />
                      {l.destination}
                    </div>
                    <div className="table-meta">
                      {l.order} <span> · </span> {l.cdl ? 'CDL' : 'Non-CDL'}{' '}
                      <span> · </span> {l.fuelType}
                      {l.sample ? ' · Sample' : ''}
                    </div>
                  </button>
                </TableCell>
                <TableCell>
                  {l.miles.toLocaleString()}
                  <div className="table-meta">{l.deadhead} mi deadhead</div>
                </TableCell>
                <TableCell>
                  {money(l.pay)}
                  <div className="table-meta">
                    {money(l.pay / l.miles, 2)} / mi
                  </div>
                </TableCell>
                <TableCell>
                  <strong className="green" style={{ fontWeight: 500 }}>
                    {money(l.calc.net)}
                  </strong>
                  <div className="table-meta">{money(l.calc.netDay)} / day</div>
                </TableCell>
                <TableCell>
                  {compact ? (
                    <span className="match">
                      <span className="score-meter">
                        <i style={{ width: l.calc.score + '%' }} />
                      </span>
                      {l.calc.score}%
                    </span>
                  ) : (
                    <Badge
                      gray={l.status === 'Delivered'}
                      amber={l.status === 'Cancelled'}
                    >
                      {l.status}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <button
                    className="icon-button"
                    aria-label={`View load ${l.order}`}
                    onClick={() => showLoad(l)}
                  >
                    <ArrowUpRight size={16} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    ) : (
      <div className="empty-state">
        <Truck size={30} style={{ margin: '0 auto 15px' }} />
        <h3>No matching loads</h3>
        <p>Add a load or change your filters to get started.</p>
        <Button onClick={startNew}>
          <Plus />
          Add load
        </Button>
      </div>
    );
  }
  function stat(
    label: string,
    value: string,
    sub: ReactNode,
    Icon: typeof Truck,
  ) {
    return (
      <div className="stat">
        <div className="stat-top">
          {label}
          <span className="stat-icon">
            <Icon />
          </span>
        </div>
        <div className="stat-value">{value}</div>
        <div className="stat-sub">{sub}</div>
      </div>
    );
  }
  function goalCard() {
    return (
      <div className="panel">
        <div className="panel-head">
          <h2>Your weekly goal</h2>
          <button
            className="subtle-link"
            onClick={() => {
              setDraftPrefs(prefs);
              setModal('goal');
            }}
          >
            Edit goal <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="goal-body">
          <small>Projected take-home</small>
          <div className="goal-amount">
            {money(plan.net)} <span>/ {money(prefs.goal)}</span>
          </div>
          <Progress
            className="goal-progress"
            value={Math.min(100, Math.max(0, (plan.net / prefs.goal) * 100))}
            aria-label="Projected weekly goal progress"
          />
          <div className="goal-note">
            <span>
              {Math.round((plan.net / prefs.goal) * 100)}% of weekly goal
            </span>
            <span className="green">
              {plan.goalMet ? 'Goal within reach' : 'Keep planning'}
            </span>
          </div>
          <div className="goal-divider" />
          <div className="goal-numbers">
            <div>
              <small>Days available</small>
              <strong>{days} days</strong>
            </div>
            <div>
              <small>Required net / day</small>
              <strong>{money(prefs.goal / days)}</strong>
            </div>
            <div>
              <small>Projected expenses</small>
              <strong>{money(plan.expenses)}</strong>
            </div>
            <div>
              <small>Expense budget</small>
              <strong>{money(prefs.weeklyBudget)}</strong>
            </div>
          </div>
          <div className="callout">
            <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              {plan.goalMet
                ? `Your ${plan.loads.length}-load plan clears your goal by ${money(plan.net - prefs.goal)}.`
                : `${money(Math.max(0, prefs.goal - plan.net))} left to reach your target.`}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <SidebarProvider
      style={{ '--sidebar-width': '224px' } as React.CSSProperties}
    >
      <Sidebar>
        <SidebarContent>
          <div className="brand">
            <span className="brandmark">
              <Route size={22} />
            </span>
            sectional
            <span className="green" style={{ marginLeft: -9 }}>
              .
            </span>
          </div>
          <div className="nav-label">WORKSPACE</div>
          <nav className="navlist">
            {nav.map(([v, Icon]) => (
              <button
                key={v}
                className={`navitem ${view === v ? 'active' : ''}`}
                onClick={() => go(v)}
              >
                <Icon />
                {v}
                {v === 'Load board' && (
                  <span className="count">{loads.length}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="nav-label">PERSONAL</div>
          <nav className="navlist">
            {[
              ['Profile', UserRound],
              ['Settings', Settings],
            ].map(([v, Icon]) => {
              const I = Icon as typeof Settings;
              return (
                <button
                  key={String(v)}
                  className={`navitem ${view === v ? 'active' : ''}`}
                  onClick={() => go(String(v))}
                >
                  <I />
                  {String(v)}
                </button>
              );
            })}
          </nav>
        </SidebarContent>
        <SidebarFooter>
          <div className="side-bottom">
            <div className="workspace-box">
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <ShieldCheck size={16} className="green" />
                {spaces.length > 1 ? (
                  <Select
                    value={workspace?.id}
                    onValueChange={(id) =>
                      id &&
                      mutate('switchWorkspace', { id }, 'Workspace switched')
                    }
                  >
                    <SelectTrigger aria-label="Switch workspace">
                      <span>{workspace?.name}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {spaces.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  workspace?.name || 'Driveaway workspace'
                )}
              </span>
              <p>
                {user
                  ? `${members.length} team member${members.length === 1 ? '' : 's'} · ${sync}`
                  : 'Explore with sample data'}
              </p>
            </div>
            {user && (
              <button
                className="navitem"
                style={{ padding: '17px 0 0' }}
                onClick={() => {
                  setNewSpaceName('');
                  setNewSpaceSeed(true);
                  setModal('new-workspace');
                }}
              >
                <Plus />
                New workspace
              </button>
            )}
            <button
              className="navitem"
              style={{ padding: '17px 0 0' }}
              onClick={() => {
                setModal('share');
                setInvite('');
              }}
            >
              <Users />
              Share workspace
              <ArrowUpRight size={14} />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger className="mobile-trigger" />
            <span>Workspace</span>
            <ChevronRight size={13} />
            <span>{view}</span>
          </div>
          <div className="top-actions">
            <span className="pill gray">
              <i
                className="dot"
                style={{ color: sync === 'Synced' ? '#337443' : '#a66a11' }}
              />
              {sync}
            </span>
            <button
              className="icon-button"
              aria-label="View alerts"
              onClick={() => go('Alerts')}
            >
              <Bell size={17} />
            </button>
            <button
              className="avatar"
              aria-label="Open profile"
              onClick={() => go('Profile')}
            >
              {(prefs.name || 'Driver')
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </button>
          </div>
        </header>
        <main className="content">
          {error && (
            <div className="notice-banner">
              <span>
                {error}. Showing a sample preview; changes are not saved.
              </span>
              <Button onClick={() => refresh()}>
                <RefreshCw />
                Retry
              </Button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1>{view === 'Overview' ? 'Operations overview' : view}</h1>
                {sample && view === 'Overview' && (
                  <span className="demo-tag">SAMPLE DATA</span>
                )}
              </div>
              <p>{pageDescriptions[view]}</p>
            </div>
            <div className="actions">
              {view === 'Overview' ? (
                <>
                  <Button onClick={() => go('Profit planner')}>
                    <CalendarDays /> {days}-day plan
                  </Button>
                  <Button primary onClick={startNew}>
                    <Plus />
                    Add load
                  </Button>
                </>
              ) : view === 'Load board' ? (
                <>
                  <Button
                    onClick={() => {
                      setModal('import');
                      setImportResult([]);
                    }}
                  >
                    <Upload />
                    Import CSV
                  </Button>
                  <Button primary onClick={startNew}>
                    <Plus />
                    Add load
                  </Button>
                </>
              ) : view === 'Team' ? (
                <Button
                  primary
                  onClick={() => {
                    setModal('share');
                    setInvite('');
                  }}
                >
                  <Plus />
                  Invite teammate
                </Button>
              ) : view === 'Expenses & reports' ? (
                <Button onClick={exportCSV}>
                  <Download />
                  Export CSV
                </Button>
              ) : view === 'Profit planner' ? (
                <Button
                  primary
                  disabled={!plan.loads.length || busy}
                  onClick={() =>
                    mutate(
                      'savePlan',
                      {
                        name: `${plan.loads[0]?.origin.split(',')[0]} · ${days}-day plan`,
                        preferences: prefs,
                        days,
                        strategy,
                      },
                      'Plan saved',
                    )
                  }
                >
                  <Bookmark />
                  Save plan
                </Button>
              ) : null}
            </div>
          </div>
          {!user && sync === 'Demo preview' && (
            <div className="notice-banner">
              <span>
                Explore the demo, then sign in to save loads and collaborate
                with your team.
              </span>
              <a className="btn" href={signInUrl}>
                Sign in with ChatGPT <ArrowUpRight size={15} />
              </a>
            </div>
          )}
          {view === 'Overview' && (
            <>
              <div className="stats">
                {stat(
                  'Projected net profit',
                  money(plan.net),
                  <>
                    <span className="green">
                      {plan.goalMet
                        ? `+${money(plan.net - prefs.goal)}`
                        : money(plan.net - prefs.goal)}
                    </span>{' '}
                    vs. weekly goal
                  </>,
                  TrendingUp,
                )}
                {stat(
                  'Available loads',
                  String(loads.filter((l) => l.status === 'Available').length),
                  <>
                    <span className="green">
                      {
                        ranked.filter((l) => l.calc.reason === 'Top pick')
                          .length
                      }{' '}
                      top picks
                    </span>{' '}
                    matched to your profile
                  </>,
                  Truck,
                )}
                {stat(
                  'Average net / day',
                  money(plan.net / Math.max(1, plan.days)),
                  <>
                    Across your {plan.days.toFixed(1).replace('.0', '')}-day
                    recommended plan
                  </>,
                  Wallet,
                )}
                {stat(
                  'Planned miles',
                  plan.miles.toLocaleString(),
                  <>
                    <span className="green">{plan.deadhead} mi</span> estimated
                    deadhead
                  </>,
                  Route,
                )}
              </div>
              <div className="main-grid">
                <div className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>Your profit route</h2>
                      <small>
                        {prefs.home} <span style={{ padding: '0 6px' }}>·</span>{' '}
                        {plan.loads.length} connected loads
                      </small>
                    </div>
                    <Badge>Recommended plan</Badge>
                  </div>
                  <RouteMap
                    loads={plan.loads}
                    onSelect={(id) => {
                      const l = loads.find((x) => x.id === id);
                      if (l) showLoad(l);
                    }}
                  />
                  <div className="map-footer">
                    <span>
                      <MapPin
                        size={13}
                        style={{ display: 'inline', marginRight: 6 }}
                      />
                      <strong>Start in {prefs.home}</strong>
                    </span>
                    <button
                      className="subtle-link"
                      onClick={() => go('Profit planner')}
                    >
                      Open route planner <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
                {goalCard()}
              </div>
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <h2>Recommended loads</h2>
                    <small>
                      Ranked by estimated profit and your driver preferences
                    </small>
                  </div>
                  <button
                    className="subtle-link"
                    onClick={() => go('Load board')}
                  >
                    View all loads <ArrowRight size={14} />
                  </button>
                </div>
                {loadTable(
                  ranked.filter((l) => l.status === 'Available').slice(0, 5),
                  true,
                )}
                <div className="table-bottom">
                  <span>
                    {sample
                      ? 'Illustrative loads · Add your own to plan actual work'
                      : 'Manual entries and imports · No live load-board connection'}
                  </span>
                  <span>{loads.length} loads in workspace</span>
                </div>
              </div>
            </>
          )}
          {view === 'Load board' && (
            <div className="panel">
              <div className="panel-head">
                <Tabs
                  value={filter}
                  onValueChange={(v) => setFilter(String(v))}
                >
                  <TabsList>
                    {[
                      'All loads',
                      'Top picks',
                      'Available',
                      'In transit',
                      'Delivered',
                    ].map((v) => (
                      <TabsTrigger key={v} value={v}>
                        {v}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <Button onClick={exportCSV}>
                  <Download />
                  Export
                </Button>
              </div>
              <div className="toolbar">
                <div className="search-wrap">
                  <Search />
                  <input
                    aria-label="Search loads"
                    placeholder="Search city, order number, or driver..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button className="btn" onClick={() => go('Profile')}>
                  <SlidersHorizontal size={15} />
                  Driver preferences
                </button>
              </div>
              {loadTable(filtered)}
              <div className="table-bottom">
                {filtered.length} matching loads{' '}
                <span>Click any route to view costs or update status</span>
              </div>
            </div>
          )}
          {view === 'Profit planner' && (
            <div className="planner-grid">
              <div className="panel planner-controls">
                <h2>Build your week</h2>
                <small>Uses your saved driver preferences</small>
                <Field label="Starting market">
                  <Choice
                    value={prefs.home}
                    options={Object.keys(cities)}
                    onChange={(home) => {
                      const [homeLat, homeLng] = cities[home];
                      setPrefs({ ...prefs, home, homeLat, homeLng });
                    }}
                  />
                </Field>
                <Field label="Planning strategy">
                  <Choice
                    value={strategy}
                    options={['Maximum net', 'Lowest cost', 'Best balance']}
                    onChange={setStrategy}
                  />
                </Field>
                <div className="field" style={{ marginTop: 20 }}>
                  Days available
                </div>
                <div className="day-pills">
                  {scenarios.map((_, i) => (
                    <button
                      key={i}
                      aria-label={`${i + 1} days`}
                      aria-pressed={days === i + 1}
                      className={days === i + 1 ? 'selected' : ''}
                      onClick={() => setDays(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <div className="expense-line">
                  <span>Weekly target</span>
                  <strong>{money(prefs.goal)}</strong>
                </div>
                <div className="expense-line">
                  <span>Expense limit</span>
                  <strong>{money(prefs.weeklyBudget)}</strong>
                </div>
                <div className="expense-line">
                  <span>Connection radius</span>
                  <strong>{prefs.radius} mi</strong>
                </div>
                <div className="expense-line">
                  <span>Maximum deadhead</span>
                  <strong>{prefs.maxDeadhead}%</strong>
                </div>
                <button
                  className="subtle-link"
                  style={{ marginTop: 18 }}
                  onClick={() => {
                    setDraftPrefs(prefs);
                    setModal('goal');
                  }}
                >
                  Adjust goals and budget <ArrowUpRight size={14} />
                </button>
                <div
                  className="import-info"
                  style={{ marginTop: 24, fontSize: 12 }}
                >
                  Planning estimates use entered miles and availability dates.
                  Connections use geographic distance × 1.2; confirm road
                  mileage, pickup windows, driving limits, and return travel
                  before booking.
                </div>
              </div>
              <div className="scroll-content">
                <div className="panel">
                  <div className="panel-head">
                    <h2>{strategy} plan</h2>
                    <Badge amber={!plan.goalMet}>
                      {plan.goalMet ? 'Goal met' : 'Below target'}
                    </Badge>
                  </div>
                  <div className="plan-summary">
                    <small>Estimated take-home</small>
                    <div className="stat-value">{money(plan.net)}</div>
                    <div className="mini-kpis">
                      <div>
                        <small>Gross pay</small>
                        <strong>{money(plan.gross)}</strong>
                      </div>
                      <div>
                        <small>Total expenses</small>
                        <strong>{money(plan.expenses)}</strong>
                      </div>
                      <div>
                        <small>Net / day</small>
                        <strong>
                          {money(plan.net / Math.max(1, plan.days))}
                        </strong>
                      </div>
                    </div>
                    {plan.loads.length ? (
                      plan.loads.map((l, i) => (
                        <div className="route-stop" key={l.id}>
                          <span className="stop-number">{i + 1}</span>
                          <div style={{ flex: 1 }}>
                            <strong>
                              {l.origin} <span className="muted">→</span>{' '}
                              {l.destination}
                            </strong>
                            <p>
                              {l.order} · {l.miles} loaded miles · {l.days} day
                              {l.days === 1 ? '' : 's'} · {money(l.pay)} gross
                            </p>
                          </div>
                          <button
                            className="icon-button"
                            aria-label={`View ${l.order}`}
                            onClick={() => showLoad(l)}
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <h3>No connected route fits yet</h3>
                        <p>
                          Add loads near {prefs.home}, or adjust your days,
                          budget, and driver preferences.
                        </p>
                      </div>
                    )}
                    <div className="callout">
                      <Info size={18} />
                      <span>
                        Includes {money(plan.overnight)} lodging,{' '}
                        {money(plan.reposition)} repositioning fuel, and{' '}
                        {money(plan.returnCost)} final return travel.
                        Intermediate return trips are removed.
                      </span>
                    </div>
                  </div>
                </div>
                <div className="panel" style={{ marginTop: 22 }}>
                  <div className="panel-head">
                    <h2>Compare 1–7 days</h2>
                    <small>Click a day to explore</small>
                  </div>
                  <div style={{ padding: '0 22px 20px' }}>
                    <div className="daily-chart">
                      {scenarios.map((s, i) => (
                        <button
                          key={i}
                          className={`day-bar ${days === i + 1 ? 'selected' : ''}`}
                          onClick={() => setDays(i + 1)}
                          style={{ background: 'none', border: 0, padding: 0 }}
                          aria-label={`${i + 1} day projected net ${money(s.net)}`}
                        >
                          <i
                            style={{
                              height: Math.max(
                                3,
                                (110 * s.net) /
                                  Math.max(1, ...scenarios.map((x) => x.net)),
                              ),
                            }}
                          />
                          <span>{i + 1}d</span>
                        </button>
                      ))}
                    </div>
                    <div className="expense-line">
                      <span>{days}-day required net / day</span>
                      <strong>{money(prefs.goal / days)}</strong>
                    </div>
                    <div className="expense-line">
                      <span>Projected net</span>
                      <strong className="green">{money(plan.net)}</strong>
                    </div>
                    <p className="table-meta">
                      Search considers up to 20,000 connected combinations.
                      Results are estimates, not a guarantee of the global
                      optimum.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {view === 'Saved plans' && (
            <div className="panel">
              <div className="panel-head">
                <h2>Saved route plans</h2>
                <span className="pill gray">{saved.length} saved</span>
              </div>
              {saved.length ? (
                saved.map((s) => (
                  <div key={s.id} className="notification">
                    <Bookmark />
                    <div style={{ flex: 1 }}>
                      <h3>{s.name}</h3>
                      <p>
                        {s.plan.loads.length} loads · {money(s.plan.net)}{' '}
                        estimated net · Saved{' '}
                        {new Date(s.created).toLocaleDateString()}
                      </p>
                      <div className="actions" style={{ marginTop: 12 }}>
                        <Button
                          onClick={() => {
                            setSelected(null);
                            setInvite(JSON.stringify(s));
                            setModal('saved');
                          }}
                        >
                          View plan
                        </Button>
                        <Button
                          onClick={() => {
                            download(
                              'sectional-plan.json',
                              JSON.stringify(s, null, 2),
                              'application/json',
                            );
                          }}
                        >
                          <Download />
                          Download
                        </Button>
                        <button
                          className="subtle-link danger"
                          onClick={() => {
                            setInvite(s.id);
                            setModal('delete-plan');
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <Bookmark size={30} style={{ margin: '0 auto 16px' }} />
                  <h3>Your next profitable week starts here</h3>
                  <p>
                    Build a route and save it to keep the full cost breakdown.
                  </p>
                  <Button primary onClick={() => go('Profit planner')}>
                    Build a plan <ArrowRight />
                  </Button>
                </div>
              )}
            </div>
          )}
          {view === 'Expenses & reports' && (
            <>
              <div className="stats">
                {stat(
                  'Total entered load pay',
                  money(loads.reduce((s, l) => s + l.pay, 0)),
                  'All loads · not recognized revenue',
                  Wallet,
                )}
                {stat(
                  'Estimated load expenses',
                  money(
                    loads.reduce((s, l) => s + costs(l, prefs).expenses, 0),
                  ),
                  'Standalone trips including return travel',
                  FileText,
                )}
                {stat(
                  'Estimated load net',
                  money(loads.reduce((s, l) => s + costs(l, prefs).net, 0)),
                  'Before taxes · all entered loads',
                  TrendingUp,
                )}
                {stat(
                  'Delivered loads',
                  String(loads.filter((l) => l.status === 'Delivered').length),
                  'Update delivery status from the load board',
                  CheckCircle2,
                )}
              </div>
              <div className="main-grid">
                <div className="panel form-panel">
                  <h2>Recommended plan costs</h2>
                  <p>
                    {plan.loads.length} loads · {plan.days.toFixed(1)} days ·{' '}
                    {plan.miles} paid miles
                  </p>
                  {[
                    [
                      'Loaded fuel',
                      plan.loads.reduce(
                        (s, l) =>
                          s +
                          (l.miles / l.mpg) *
                            (l.fuelType === 'Diesel'
                              ? prefs.diesel
                              : prefs.unleaded),
                        0,
                      ),
                    ],
                    ['Repositioning fuel', plan.reposition],
                    ['Hotels', plan.overnight],
                    ['Meals', plan.meals],
                    ['Tolls', plan.loads.reduce((s, l) => s + l.tolls, 0)],
                    ['Final return transportation', plan.returnCost],
                    [
                      'Permits, parking & other',
                      plan.loads.reduce((s, l) => s + l.other, 0),
                    ],
                  ].map(([k, v]) => (
                    <div className="expense-line" key={k}>
                      <span>{k}</span>
                      <strong>{money(Number(v), 2)}</strong>
                    </div>
                  ))}
                  <div className="expense-line total">
                    <span>Total expenses</span>
                    <strong>{money(plan.expenses, 2)}</strong>
                  </div>
                  <div className="revenue-split">
                    <i
                      style={{
                        width: `${(Math.max(0, plan.net) / Math.max(1, plan.gross)) * 100}%`,
                      }}
                    />
                    <i style={{ flex: 1 }} />
                  </div>
                  <div className="goal-note" style={{ marginTop: 9 }}>
                    <span className="green">Net {money(plan.net)}</span>
                    <span>Expenses {money(plan.expenses)}</span>
                  </div>
                </div>
                {goalCard()}
              </div>
            </>
          )}
          {view === 'Team' && (
            <>
              <div
                className="notice-banner"
                style={{
                  background: '#edf6eb',
                  borderColor: '#c9ddc5',
                  color: '#365e33',
                }}
              >
                <span>
                  Members share loads and saved plans. Driver profiles stay
                  personal. Owners manage access.
                </span>
                <button className="subtle-link" onClick={() => refresh()}>
                  <RefreshCw size={14} />
                  Refresh
                </button>
              </div>
              <div className="team-grid">
                {(members.length
                  ? members
                  : [
                      {
                        userId: 'demo',
                        name: 'Your driver profile',
                        email: 'Sign in to create your team',
                        role: 'owner',
                      },
                    ]
                ).map((m) => (
                  <div className="panel member" key={m.userId}>
                    <div className="avatar">
                      {m.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <h3>
                      {m.name}
                      {m.userId === user?.userId ? ' (you)' : ''}
                    </h3>
                    <p>{m.email}</p>
                    <Badge gray={m.role === 'viewer'}>{m.role}</Badge>
                    {workspace?.role === 'owner' && m.role !== 'owner' && (
                      <div className="actions" style={{ marginTop: 15 }}>
                        <Choice
                          value={m.role}
                          options={['dispatcher', 'viewer']}
                          label={`Role for ${m.name}`}
                          onChange={(role) =>
                            mutate(
                              'memberRole',
                              { userId: m.userId, role },
                              'Member role updated',
                            )
                          }
                        />
                        <button
                          className="subtle-link danger"
                          onClick={() => {
                            setInvite(m.userId);
                            setModal('remove-member');
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          {(view === 'Profile' || view === 'Settings') && (
            <form
              className="panel form-panel"
              onSubmit={(e) => {
                e.preventDefault();
                void savePrefs();
              }}
            >
              {view === 'Profile' ? (
                <>
                  <h2>Driver profile</h2>
                  <p>
                    Your profile and preferences are personal to your account.
                  </p>
                  <div className="form-grid">
                    <Field label="Display name">
                      <input
                        required
                        maxLength={80}
                        value={draftPrefs.name}
                        onChange={(e) =>
                          setDraftPrefs({ ...draftPrefs, name: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Starting market">
                      <Choice
                        value={draftPrefs.home}
                        options={Object.keys(cities)}
                        onChange={(home) => {
                          const [homeLat, homeLng] = cities[home];
                          setDraftPrefs({
                            ...draftPrefs,
                            home,
                            homeLat,
                            homeLng,
                          });
                        }}
                      />
                    </Field>
                  </div>
                  <div className="preferences-toggle">
                    <div>
                      <h3>CDL qualified</h3>
                      <p>
                        Include loads requiring a commercial driver’s license.
                      </p>
                    </div>
                    <Switch
                      checked={draftPrefs.cdl}
                      onCheckedChange={(cdl) =>
                        setDraftPrefs({ ...draftPrefs, cdl })
                      }
                      aria-label="CDL qualified"
                    />
                  </div>
                  <div className="preferences-toggle">
                    <div>
                      <h3>Tow-behind capable</h3>
                      <p>Include loads marked as towable.</p>
                    </div>
                    <Switch
                      checked={draftPrefs.towable}
                      onCheckedChange={(towable) =>
                        setDraftPrefs({ ...draftPrefs, towable })
                      }
                      aria-label="Tow-behind capable"
                    />
                  </div>
                  <div className="form-section">
                    <h3>Profit & driving preferences</h3>
                    <div className="form-grid">
                      {prefInput('goal', 'Weekly net goal ($)', 1, 1000000)}
                      {prefInput('days', 'Maximum days out', 1, 7, 1)}
                      {prefInput(
                        'minNetDay',
                        'Minimum net / day ($)',
                        0,
                        100000,
                      )}
                      {prefInput(
                        'minNetMile',
                        'Minimum net / mile ($)',
                        0,
                        100,
                      )}
                      {prefInput('minMiles', 'Minimum loaded miles', 1, 10000)}
                      {prefInput('maxMiles', 'Maximum loaded miles', 1, 10000)}
                      {prefInput('maxDeadhead', 'Maximum deadhead (%)', 0, 100)}
                      {prefInput('radius', 'Connection radius (mi)', 0, 500)}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2>Workspace & cost settings</h2>
                  <p>Keep your estimates aligned with your operating costs.</p>
                  {workspace?.role === 'owner' && (
                    <div className="field full" style={{ marginBottom: 22 }}>
                      <span>Workspace name</span>
                      <div className="actions">
                        <input
                          id="workspace-name"
                          defaultValue={workspace?.name}
                          maxLength={80}
                          style={{ flex: 1 }}
                        />
                        <Button
                          onClick={() => {
                            const name = (
                              document.getElementById(
                                'workspace-name',
                              ) as HTMLInputElement
                            ).value;
                            void mutate(
                              'renameWorkspace',
                              { name },
                              'Workspace renamed',
                            );
                          }}
                        >
                          Update name
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="form-grid">
                    {prefInput('diesel', 'Diesel price / gallon ($)', 0.1, 30)}
                    {prefInput(
                      'unleaded',
                      'Unleaded price / gallon ($)',
                      0.1,
                      30,
                    )}
                    {prefInput('mpg', 'Default vehicle MPG', 1, 100)}
                    {prefInput('hotel', 'Hotel / night ($)', 0, 5000)}
                    {prefInput('food', 'Meals / day ($)', 0, 1000)}
                    {prefInput(
                      'weeklyBudget',
                      'Weekly expense budget ($)',
                      0,
                      1000000,
                    )}
                    {prefInput(
                      'maxExpense',
                      'Maximum expense / load ($)',
                      0,
                      100000,
                    )}
                  </div>
                  <div className="preferences-toggle" style={{ marginTop: 15 }}>
                    <div>
                      <h3>Profit opportunity alerts</h3>
                      <p>
                        Show matching opportunities in the in-app Alerts view.
                      </p>
                    </div>
                    <Switch
                      checked={draftPrefs.alerts}
                      onCheckedChange={(alerts) =>
                        setDraftPrefs({ ...draftPrefs, alerts })
                      }
                      aria-label="Profit alerts"
                    />
                  </div>
                  <div className="form-section">
                    <h3>Workspace data</h3>
                    <p
                      className="muted"
                      style={{ fontSize: 14, marginBottom: 15 }}
                    >
                      Download your load data or remove illustrative sample
                      loads before using the workspace for real dispatching.
                    </p>
                    <div className="actions">
                      <Button onClick={exportCSV}>
                        <Download />
                        Export loads
                      </Button>
                      {canEdit && sample && (
                        <button
                          className="btn"
                          type="button"
                          onClick={() => setModal('clear-samples')}
                        >
                          Remove sample loads
                        </button>
                      )}
                      {workspace?.role === 'owner' && (
                        <button
                          className="btn"
                          type="button"
                          onClick={() => setModal('reset-demo')}
                        >
                          <RotateCcw size={16} />
                          Reset demo data
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="form-section">
                    <h3>Account</h3>
                    <p className="muted" style={{ fontSize: 14 }}>
                      {user?.email || 'You are viewing the demo.'}
                    </p>
                    <div className="actions" style={{ marginTop: 14 }}>
                      <a
                        className="btn"
                        href={
                          user
                            ? '/signout-with-chatgpt'
                            : '/signin-with-chatgpt?return_to=/'
                        }
                      >
                        <LogOut size={16} />
                        {user ? 'Sign out' : 'Sign in with ChatGPT'}
                      </a>
                    </div>
                  </div>
                </>
              )}
              <div className="form-actions">
                <Button type="submit" primary disabled={busy}>
                  <Check />
                  Save changes
                </Button>
              </div>
            </form>
          )}
          {view === 'Alerts' && (
            <div className="panel">
              <div className="panel-head">
                <h2>Profit opportunities</h2>
                <button className="subtle-link" onClick={() => go('Settings')}>
                  Alert settings <Settings size={14} />
                </button>
              </div>
              {!prefs.alerts ? (
                <div className="empty-state">
                  <h3>Opportunity alerts are paused</h3>
                  <p>Turn them on in settings to see matching loads.</p>
                </div>
              ) : ranked.filter(
                  (l) =>
                    l.status === 'Available' && l.calc.reason === 'Top pick',
                ).length ? (
                ranked
                  .filter(
                    (l) =>
                      l.status === 'Available' && l.calc.reason === 'Top pick',
                  )
                  .map((l) => (
                    <div className="notification" key={l.id}>
                      <TrendingUp />
                      <div style={{ flex: 1 }}>
                        <h3>
                          {l.origin} → {l.destination}
                        </h3>
                        <p>
                          {money(l.calc.netDay)} estimated net / day ·{' '}
                          {l.calc.score}% match ·{' '}
                          {l.sample ? 'Sample opportunity' : l.order}
                        </p>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`View ${l.order}`}
                        onClick={() => showLoad(l)}
                      >
                        <ArrowUpRight size={16} />
                      </button>
                    </div>
                  ))
              ) : (
                <div className="empty-state">
                  <h3>No top matches yet</h3>
                  <p>
                    New manual entries and imports are checked against your
                    current preferences.
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="footer-note">
            <ShieldCheck size={13} />
            <span>
              Estimates, not guaranteed earnings.{' '}
              {sample
                ? 'Sample rates and loads are illustrative.'
                : 'Confirm rates and availability with your provider.'}
            </span>
            <span style={{ marginLeft: 'auto' }}>SECTIONAL</span>
          </div>
        </main>
      </div>
      <Dialog
        open={
          !!modal &&
          ![
            'delete-plan',
            'remove-member',
            'clear-samples',
            'reset-demo',
          ].includes(modal)
        }
        onOpenChange={(open) => {
          if (!open) setModal('');
        }}
      >
        <DialogContent className="modal">
          <DialogHeader>
            <DialogTitle>
              {(
                {
                  load: selected ? 'Edit load' : 'Add a load',
                  detail: 'Load analysis',
                  goal: 'Goals & budget',
                  share: 'Share your workspace',
                  import: 'Import your load board',
                  join: 'Join a workspace',
                  saved: 'Saved plan',
                  'delete-plan': 'Delete saved plan?',
                  'remove-member': 'Remove team member?',
                  'clear-samples': 'Remove sample loads?',
                  'reset-demo': 'Reset demo data?',
                  'new-workspace': 'Create a workspace',
                } as Record<string, string>
              )[modal] || 'Workspace'}
            </DialogTitle>
            <DialogDescription>
              {modal === 'load'
                ? 'Enter the rate and costs to see the true value of this trip.'
                : modal === 'share'
                  ? 'Create an invitation link for a teammate.'
                  : modal === 'import'
                    ? 'Preview your CSV before adding loads to the workspace.'
                    : modal === 'detail'
                      ? 'Estimated take-home based on this load and your saved preferences.'
                      : modal === 'goal'
                        ? 'Set a target that fits your time on the road.'
                        : 'Review the details before continuing.'}
            </DialogDescription>
          </DialogHeader>
          {modal === 'load' && (
            <LoadForm
              load={selected}
              prefs={prefs}
              members={members}
              onSave={saveLoad}
              busy={busy}
              canEdit={canEdit}
            />
          )}
          {modal === 'detail' && selected && (
            <>
              <div
                className="lane"
                style={{ fontSize: 19, whiteSpace: 'normal' }}
              >
                {selected.origin}
                <ArrowRight />
                {selected.destination}
              </div>
              <small>
                {selected.order} · {selected.miles} miles · {selected.date} ·{' '}
                {selected.sample ? 'Sample load' : 'Manually entered'}
              </small>
              <div className="mini-kpis">
                <div>
                  <small>Gross pay</small>
                  <strong>{money(selected.pay)}</strong>
                </div>
                <div>
                  <small>Estimated net</small>
                  <strong className="green">
                    {money(costs(selected, prefs).net)}
                  </strong>
                </div>
                <div>
                  <small>Profit match</small>
                  <strong>{costs(selected, prefs).score}%</strong>
                </div>
              </div>
              <Badge
                amber={
                  !['Top pick', 'Good fit'].includes(
                    costs(selected, prefs).reason,
                  )
                }
              >
                {costs(selected, prefs).reason}
              </Badge>
              {[
                ['Fuel (loaded + deadhead)', costs(selected, prefs).fuel],
                ['Hotel', costs(selected, prefs).hotel],
                ['Meals', costs(selected, prefs).food],
                ['Tolls', selected.tolls],
                ['Return transportation', selected.returnCost],
                ['Permits, parking & other', selected.other],
              ].map(([k, v]) => (
                <div className="expense-line" key={k}>
                  <span>{k}</span>
                  <strong>{money(Number(v), 2)}</strong>
                </div>
              ))}
              <div className="expense-line total">
                <span>Total expenses</span>
                <strong>{money(costs(selected, prefs).expenses, 2)}</strong>
              </div>
              <p className="muted" style={{ fontSize: 14 }}>
                {selected.notes}
              </p>
              <h3 style={{ marginTop: 8 }}>Possible next pickups</h3>
              {loads
                .filter(
                  (l) =>
                    l.id !== selected.id &&
                    l.status === 'Available' &&
                    distance(
                      selected.destLat,
                      selected.destLng,
                      l.originLat,
                      l.originLng,
                    ) <= prefs.radius,
                )
                .slice(0, 3)
                .map((l) => (
                  <button
                    className="btn"
                    key={l.id}
                    onClick={() => setSelected(l)}
                    style={{ justifyContent: 'space-between' }}
                  >
                    {l.origin} → {l.destination}
                    <span className="green">
                      {money(costs(l, prefs).net)} net
                    </span>
                  </button>
                ))}
              <p className="table-meta">
                Connections are proximity suggestions; confirm dates,
                eligibility, and pickup windows.
              </p>
              <div className="actions" style={{ marginTop: 10 }}>
                <Button
                  primary
                  disabled={!canEdit}
                  onClick={() => setModal('load')}
                >
                  Edit load & status
                </Button>
                <Button
                  onClick={() => {
                    setModal('');
                    go('Profit planner');
                  }}
                >
                  <Route />
                  Plan a route
                </Button>
              </div>
            </>
          )}
          {modal === 'goal' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void savePrefs();
              }}
            >
              <div className="form-grid">
                {prefInput('goal', 'Weekly net goal ($)', 1, 1000000)}
                {prefInput('days', 'Days available', 1, 7, 1)}
                {prefInput(
                  'weeklyBudget',
                  'Weekly expense limit ($)',
                  0,
                  1000000,
                )}
                {prefInput(
                  'maxExpense',
                  'Maximum expense / load ($)',
                  0,
                  100000,
                )}
                {prefInput('radius', 'Connection radius (mi)', 0, 500)}
                {prefInput('maxDeadhead', 'Maximum deadhead (%)', 0, 100)}
              </div>
              <div className="form-actions">
                <Button primary type="submit" disabled={busy}>
                  Save goals
                </Button>
              </div>
            </form>
          )}
          {modal === 'share' && (
            <>
              {workspace?.role === 'owner' ? (
                <>
                  <Field label="Teammate role">
                    <Choice
                      value={inviteRole}
                      onChange={setInviteRole}
                      options={['Dispatcher', 'Viewer']}
                    />
                  </Field>
                  <p className="muted" style={{ fontSize: 14 }}>
                    {inviteRole === 'Dispatcher'
                      ? 'Dispatchers can add and edit shared loads and save route plans.'
                      : 'Viewers can read shared loads and plans and update their personal preferences.'}
                  </p>
                  <Button
                    primary
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const j = await api('createInvite', {
                          role: inviteRole.toLowerCase(),
                        });
                        setInvite(window.location.origin + '/?join=' + j.token);
                        toast.success('Single-use invitation created');
                      } catch (e) {
                        toast.error((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <LinkIcon />
                    Create invitation link
                  </Button>
                  {invite && (
                    <>
                      <div className="invite-url">{invite}</div>
                      <Button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(invite);
                            toast.success('Invitation copied');
                          } catch {
                            toast.error(
                              'Select and copy the invitation link above',
                            );
                          }
                        }}
                      >
                        <Copy />
                        Copy invitation
                      </Button>
                      <small>
                        Expires after 7 days. Each link can be used once.
                      </small>
                    </>
                  )}
                </>
              ) : (
                <p className="import-info">
                  {user
                    ? 'Ask the workspace owner to create an invitation.'
                    : 'Sign in to create a workspace and invite teammates.'}
                </p>
              )}
              <div className="import-info">
                The app is published privately. Before a teammate opens an
                invitation, the site owner must also grant them access through
                the site’s sharing controls. An invitation does not change the
                site’s visibility.
              </div>
            </>
          )}
          {modal === 'new-workspace' && (
            <>
              <p className="import-info">
                Workspaces keep loads, plans, and team members separate. Keep
                one for demos and another for your own dispatching, then switch
                between them from the sidebar.
              </p>
              <div className="field full">
                <span>Workspace name</span>
                <input
                  value={newSpaceName}
                  maxLength={80}
                  placeholder="Demo workspace"
                  onChange={(e) => setNewSpaceName(e.target.value)}
                />
              </div>
              <div className="preferences-toggle" style={{ marginTop: 15 }}>
                <div>
                  <h3>Start with sample loads</h3>
                  <p>Fill the new workspace with illustrative demo loads.</p>
                </div>
                <Switch
                  checked={newSpaceSeed}
                  onCheckedChange={setNewSpaceSeed}
                  aria-label="Start with sample loads"
                />
              </div>
              <div className="actions" style={{ marginTop: 15 }}>
                <Button onClick={() => setModal('')}>Cancel</Button>
                <Button
                  primary
                  disabled={busy}
                  onClick={async () => {
                    if (
                      await mutate(
                        'createWorkspace',
                        {
                          name: newSpaceName.trim() || 'Demo workspace',
                          seed: newSpaceSeed,
                        },
                        'Workspace created',
                      )
                    )
                      setModal('');
                  }}
                >
                  Create workspace
                </Button>
              </div>
            </>
          )}
          {modal === 'join' && (
            <>
              <p className="import-info">
                Joining gives your signed-in account access to this team’s
                shared loads and plans. Your driver preferences stay personal.
              </p>
              {user ? (
                <Button
                  primary
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await api('acceptInvite', { token: joinToken });
                      window.history.replaceState(null, '', '/');
                      await refresh();
                      setModal('');
                      toast.success('Joined workspace');
                    } catch (e) {
                      toast.error((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Accept invitation
                </Button>
              ) : (
                <a
                  className="btn primary"
                  href={
                    '/signin-with-chatgpt?return_to=' +
                    encodeURIComponent('/?join=' + joinToken)
                  }
                >
                  Sign in to join
                </a>
              )}
            </>
          )}
          {modal === 'import' && (
            <>
              <div className="import-info">
                Required columns:{' '}
                <strong>origin, destination, miles, pay, date</strong>. Dates
                use YYYY-MM-DD. Use the template for optional costs,
                coordinates, and driver details. Unknown cities require
                coordinates.
              </div>
              <Button
                onClick={() =>
                  download(
                    'sectional-import-template.csv',
                    'origin,destination,miles,pay,date,days,deadhead,mpg,fuel type,hotel nights,tolls,return cost,other,cdl,towable\n"Atlanta, GA","Nashville, TN",250,1175,2026-09-07,1,12,14,Diesel,0,15,85,0,true,false\n',
                    'text/csv',
                  )
                }
              >
                <Download />
                Download template
              </Button>
              <Field label="Choose a CSV file">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 500000) {
                      toast.error('Please use a CSV smaller than 500 KB');
                      return;
                    }
                    setImportText(await f.text());
                    setImportResult([]);
                  }}
                />
              </Field>
              <Field label="Or paste CSV">
                <textarea
                  rows={5}
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    setImportResult([]);
                  }}
                  placeholder={
                    'origin,destination,miles,pay,date\n"Atlanta, GA","Nashville, TN",250,1175,2026-09-07'
                  }
                />
              </Field>
              <Button
                onClick={() => {
                  try {
                    const rows = parseImport(importText, prefs);
                    setImportResult(rows);
                    toast.success(`${rows.length} valid loads ready to import`);
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                Preview import
              </Button>
              {importResult.length > 0 && (
                <>
                  <div className="import-info">
                    {importResult.length} loads ·{' '}
                    {money(importResult.reduce((s, l) => s + l.pay, 0))} total
                    gross pay
                    <br />
                    {importResult.slice(0, 3).map((l) => (
                      <div key={l.id}>
                        {l.origin} → {l.destination} · {l.miles} mi
                      </div>
                    ))}
                  </div>
                  <Button
                    primary
                    disabled={busy || !canEdit}
                    onClick={async () => {
                      if (
                        await mutate(
                          'importLoads',
                          { loads: importResult },
                          'Loads imported',
                        )
                      ) {
                        setModal('');
                        setImportText('');
                        setImportResult([]);
                      }
                    }}
                  >
                    Import {importResult.length} loads
                  </Button>
                </>
              )}
            </>
          )}
          {modal === 'saved' &&
            (() => {
              const s = JSON.parse(invite) as Saved;
              return (
                <>
                  <h3>{s.name}</h3>
                  <div className="mini-kpis">
                    <div>
                      <small>Estimated net</small>
                      <strong className="green">{money(s.plan.net)}</strong>
                    </div>
                    <div>
                      <small>Expenses</small>
                      <strong>{money(s.plan.expenses)}</strong>
                    </div>
                    <div>
                      <small>Days</small>
                      <strong>{s.plan.days.toFixed(1)}</strong>
                    </div>
                  </div>
                  {s.plan.loads.map((l, i) => (
                    <div className="route-stop" key={l.id}>
                      <span className="stop-number">{i + 1}</span>
                      <div>
                        <strong>
                          {l.origin} → {l.destination}
                        </strong>
                        <p>
                          {l.order} · {l.miles} miles · {money(l.pay)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <p className="import-info">
                    This is a snapshot from{' '}
                    {new Date(s.created).toLocaleDateString()}. Recheck
                    availability and rates before dispatching.
                  </p>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={[
          'delete-plan',
          'remove-member',
          'clear-samples',
          'reset-demo',
        ].includes(modal)}
        onOpenChange={(open) => {
          if (!open) setModal('');
        }}
      >
        <AlertDialogContent className="modal">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm workspace change</AlertDialogTitle>
            <AlertDialogDescription>
              Review this change before continuing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {[
            'delete-plan',
            'remove-member',
            'clear-samples',
            'reset-demo',
          ].includes(modal) && (
            <>
              <p className="import-info">
                {modal === 'reset-demo'
                  ? `Every load and saved plan in "${workspace?.name}" will be deleted and replaced with the illustrative sample loads. Team members and your preferences will remain. Use this after showing the demo to start clean.`
                  : modal === 'clear-samples'
                    ? 'Only illustrative sample loads will be removed. Your own loads and saved plans will remain.'
                    : modal === 'remove-member'
                      ? 'This person will lose access to this workspace. Their shared work will remain.'
                      : 'This saved snapshot will be deleted. Loads in the workspace will remain.'}
              </p>
              <div className="actions">
                <Button onClick={() => setModal('')}>Cancel</Button>
                <Button
                  primary
                  disabled={busy}
                  onClick={async () => {
                    const action =
                      modal === 'delete-plan'
                        ? 'deletePlan'
                        : modal === 'remove-member'
                          ? 'removeMember'
                          : modal === 'reset-demo'
                            ? 'resetDemo'
                            : 'clearSamples';
                    if (
                      await mutate(
                        action,
                        { id: invite, userId: invite },
                        'Workspace updated',
                      )
                    )
                      setModal('');
                  }}
                >
                  Confirm
                </Button>
              </div>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
      <Toaster />
    </SidebarProvider>
  );
  function prefInput(
    key: keyof Preferences,
    label: string,
    min: number,
    max: number,
    step: number | string = 'any',
  ) {
    return (
      <Field label={label}>
        <input
          type="number"
          required
          min={min}
          max={max}
          step={step}
          value={Number(draftPrefs[key])}
          onChange={(e) =>
            setDraftPrefs({
              ...draftPrefs,
              [key]: e.target.value === '' ? '' : Number(e.target.value),
            })
          }
        />
      </Field>
    );
  }
}
function LoadForm({
  load,
  prefs,
  members,
  onSave,
  busy,
  canEdit,
}: {
  load: Load | null;
  prefs: Preferences;
  members: Member[];
  onSave: (l: Load) => void;
  busy: boolean;
  canEdit: boolean;
}) {
  const [l, set] = useState<Load>(
    load || {
      id: crypto.randomUUID(),
      order: '',
      origin: prefs.home,
      destination: 'Nashville, TN',
      originLat: prefs.homeLat,
      originLng: prefs.homeLng,
      destLat: 36.163,
      destLng: -86.782,
      miles: 250,
      pay: 0,
      date: new Date().toISOString().slice(0, 10),
      days: 1,
      deadhead: 0,
      fuelType: 'Diesel',
      mpg: prefs.mpg,
      hotelNights: 0,
      tolls: 0,
      returnCost: 0,
      other: 0,
      cdl: false,
      towable: false,
      status: 'Available',
      driver: '',
      notes: '',
    },
  );
  const c = costs(l, prefs);
  function num(
    k: keyof Load,
    label: string,
    min = 0,
    max = 100000,
    step: number | string = 'any',
  ) {
    return (
      <Field label={label}>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          required
          value={Number(l[k])}
          onChange={(e) =>
            set({
              ...l,
              [k]: e.target.value === '' ? '' : Number(e.target.value),
            })
          }
        />
      </Field>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (
          (!cities[l.origin] && l.originLat === 0 && l.originLng === 0) ||
          (!cities[l.destination] && l.destLat === 0 && l.destLng === 0)
        ) {
          toast.error(
            'Enter coordinates for cities outside the suggested list.',
          );
          return;
        }
        onSave({
          ...l,
          order: l.order.trim() || 'SEC-' + Date.now().toString().slice(-6),
        });
      }}
    >
      <div className="form-grid">
        <Field label="Order number">
          <input
            value={l.order}
            maxLength={80}
            onChange={(e) => set({ ...l, order: e.target.value })}
            placeholder="e.g. SEC-2613"
          />
        </Field>
        <Field label="Available from">
          <input
            type="date"
            required
            value={l.date}
            onChange={(e) => set({ ...l, date: e.target.value })}
          />
        </Field>
        <Field label="Origin city, state">
          <input
            list="cities"
            required
            value={l.origin}
            maxLength={100}
            onChange={(e) => {
              const val = e.target.value;
              const co = cities[val];
              set({
                ...l,
                origin: val,
                ...(co
                  ? { originLat: co[0], originLng: co[1] }
                  : { originLat: 0, originLng: 0 }),
              });
            }}
          />
        </Field>
        <Field label="Destination city, state">
          <input
            list="cities"
            required
            value={l.destination}
            maxLength={100}
            onChange={(e) => {
              const val = e.target.value;
              const co = cities[val];
              set({
                ...l,
                destination: val,
                ...(co
                  ? { destLat: co[0], destLng: co[1] }
                  : { destLat: 0, destLng: 0 }),
              });
            }}
          />
        </Field>
        <datalist id="cities">
          {Object.keys(cities).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </datalist>
        {!cities[l.origin] && (
          <>
            {num('originLat', 'Origin latitude', -90, 90)}
            {num('originLng', 'Origin longitude', -180, 180)}
          </>
        )}
        {!cities[l.destination] && (
          <>
            {num('destLat', 'Destination latitude', -90, 90)}
            {num('destLng', 'Destination longitude', -180, 180)}
          </>
        )}
        {num('miles', 'Loaded miles', 1, 10000)}
        {num('pay', 'Load pay ($)', 0.01, 1000000)}
        {num('days', 'Trip days', 1, 7, 1)}
        {num('deadhead', 'Deadhead miles', 0, 10000)}
        <Field label="Fuel type">
          <Choice
            value={l.fuelType}
            options={['Diesel', 'Unleaded']}
            onChange={(fuelType) => set({ ...l, fuelType })}
          />
        </Field>
        {num('mpg', 'Vehicle MPG', 1, 100)}
        {num('hotelNights', 'Hotel nights', 0, 30, 1)}
        {num('tolls', 'Tolls ($)')}
        {num('returnCost', 'Return transportation ($)')}
        {num('other', 'Permits, parking & other ($)')}
        <Field label="Status">
          <Choice
            value={l.status}
            options={[
              'Available',
              'Assigned',
              'In transit',
              'Delivered',
              'Cancelled',
            ]}
            onChange={(status) => set({ ...l, status })}
          />
        </Field>
        <Field label="Assigned driver">
          <Choice
            value={l.driver || 'Unassigned'}
            options={['Unassigned', ...members.map((m) => m.email)]}
            onChange={(driver) =>
              set({ ...l, driver: driver === 'Unassigned' ? '' : driver })
            }
          />
        </Field>
        <div className="preferences-toggle">
          <span>CDL required</span>
          <Switch
            checked={l.cdl}
            aria-label="CDL required"
            onCheckedChange={(cdl) => set({ ...l, cdl })}
          />
        </div>
        <div className="preferences-toggle">
          <span>Towable</span>
          <Switch
            checked={l.towable}
            aria-label="Towable"
            onCheckedChange={(towable) => set({ ...l, towable })}
          />
        </div>
        <Field label="Notes" full>
          <textarea
            rows={2}
            maxLength={2000}
            value={l.notes}
            onChange={(e) => set({ ...l, notes: e.target.value })}
          />
        </Field>
      </div>
      <div className="callout" style={{ justifyContent: 'space-between' }}>
        <span>Estimated expenses: {money(c.expenses)}</span>
        <strong>Net: {money(c.net)}</strong>
      </div>
      <div className="form-actions">
        <Button primary type="submit" disabled={busy || !canEdit}>
          <Check />
          {busy ? 'Saving...' : 'Save load'}
        </Button>
      </div>
    </form>
  );
}
function parseImport(text: string, p: Preferences): Load[] {
  const records: string[][] = [];
  let row: string[] = [],
    v = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        v += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(v);
      v = '';
    } else if (ch === '\n' && !quoted) {
      row.push(v.replace(/\r$/, ''));
      records.push(row);
      row = [];
      v = '';
    } else v += ch;
  }
  if (quoted) throw new Error('CSV contains an unclosed quote');
  if (v || row.length) {
    row.push(v.replace(/\r$/, ''));
    records.push(row);
  }
  if (records.length < 2)
    throw new Error('Add a header and at least one data row');
  const headers = records.shift()!.map((x) =>
    x
      .replace(/^\uFEFF/, '')
      .trim()
      .toLowerCase()
      .replaceAll('_', ' '),
  );
  for (const h of ['origin', 'destination', 'miles', 'pay', 'date'])
    if (!headers.includes(h)) throw new Error(`Missing required column: ${h}`);
  const rows = records.filter((r) => r.some((v) => v.trim()));
  if (rows.length > 200) throw new Error('Import up to 200 loads at a time');
  return rows.map((r, i) => {
    const x = Object.fromEntries(
      headers.map((h, n) => [h, r[n]?.trim() || '']),
    );
    const n = (key: string, f: number) =>
      x[key] === '' || x[key] === undefined ? f : Number(x[key]);
    const orig = cities[x.origin],
      dest = cities[x.destination];
    if (
      (!orig && (!x['origin lat'] || !x['origin lng'])) ||
      (!dest && (!x['dest lat'] || !x['dest lng']))
    )
      throw new Error(
        `Row ${i + 2}: unknown city; provide origin lat/lng and dest lat/lng`,
      );
    const l: Load = {
      id: crypto.randomUUID(),
      order: x.order || 'IMP-' + Date.now().toString().slice(-5) + '-' + i,
      origin: x.origin,
      destination: x.destination,
      originLat: n('origin lat', orig?.[0] ?? 0),
      originLng: n('origin lng', orig?.[1] ?? 0),
      destLat: n('dest lat', dest?.[0] ?? 0),
      destLng: n('dest lng', dest?.[1] ?? 0),
      miles: n('miles', 0),
      pay: n('pay', 0),
      date: x.date,
      days: n('days', 1),
      deadhead: n('deadhead', 0),
      fuelType: x['fuel type'] || 'Diesel',
      mpg: n('mpg', p.mpg),
      hotelNights: n('hotel nights', 0),
      tolls: n('tolls', 0),
      returnCost: n('return cost', 0),
      other: n('other', 0),
      cdl: /^(true|yes|y|1)$/i.test(x.cdl),
      towable: /^(true|yes|y|1)$/i.test(x.towable),
      status: x.status || 'Available',
      driver: x.driver || '',
      notes: x.notes || '',
    };
    if (
      !Number.isFinite(l.miles) ||
      l.miles <= 0 ||
      !Number.isFinite(l.pay) ||
      l.pay <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(l.date) ||
      !Number.isFinite(Date.parse(l.date))
    )
      throw new Error(`Row ${i + 2}: check miles, pay, and date`);
    try {
      return validateLoad(l);
    } catch (e) {
      throw new Error(`Row ${i + 2}: ${(e as Error).message}`);
    }
  });
}
