import { env } from 'cloudflare:workers';
import { getChatGPTUser, type ChatGPTUser } from '@/app/chatgpt-auth';
import { defaults, seedLoads, optimize, stampDelivery } from '@/lib/model';
import {
  InputError,
  string,
  validateLoad,
  validatePreferences,
} from '@/lib/validation';
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const hash = async (s: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
function db() {
  if (!env.DB) throw new Error('Database is unavailable');
  return env.DB;
}
async function initialize(u: ChatGPTUser) {
  const d = db();
  const ws = 'ws_' + (await hash(u.userId)).slice(0, 32);
  const now = new Date().toISOString();
  const name = (u.fullName || u.email.split('@')[0]).slice(0, 80);
  const prefs = { ...defaults, name };
  const profile = await d
    .prepare('SELECT user_id FROM profiles WHERE user_id=?')
    .bind(u.userId)
    .first();
  if (!profile) {
    const batch = [
      d
        .prepare(
          'INSERT OR IGNORE INTO workspaces (id,name,owner_id,created) VALUES (?,?,?,?)',
        )
        .bind(ws, 'My driveaway team', u.userId, now),
      d
        .prepare(
          "INSERT OR IGNORE INTO members (workspace_id,user_id,role,joined) VALUES (?,?,'owner',?)",
        )
        .bind(ws, u.userId, now),
      ...seedLoads().map((l) =>
        d
          .prepare(
            'INSERT OR IGNORE INTO loads (id,workspace_id,data,version,updated) SELECT ?,?,?,1,? WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE user_id=?)',
          )
          .bind(l.id, ws, JSON.stringify(l), now, u.userId),
      ),
      d
        .prepare(
          'INSERT OR IGNORE INTO profiles (user_id,name,email,preferences,active_workspace) VALUES (?,?,?,?,?)',
        )
        .bind(u.userId, name, u.email, JSON.stringify(prefs), ws),
    ];
    await d.batch(batch);
  }
  return ws;
}
async function membership(userId: string, workspaceId: string) {
  const m = await db()
    .prepare('SELECT role FROM members WHERE user_id=? AND workspace_id=?')
    .bind(userId, workspaceId)
    .first<{ role: string }>();
  if (!m)
    throw new InputError('You do not have access to this workspace.', 403);
  return m;
}
function editor(role: string) {
  if (!['owner', 'dispatcher'].includes(role))
    throw new InputError(
      'Your viewer role cannot change shared workspace data.',
      403,
    );
}
function owner(role: string) {
  if (role !== 'owner')
    throw new InputError(
      'Only the workspace owner can manage team access.',
      403,
    );
}
async function state(u: ChatGPTUser) {
  const personal = await initialize(u);
  const d = db();
  const profile = await d
    .prepare('SELECT * FROM profiles WHERE user_id=?')
    .bind(u.userId)
    .first<{ name: string; preferences: string; active_workspace: string }>();
  let ws = profile!.active_workspace;
  let m = await d
    .prepare('SELECT role FROM members WHERE user_id=? AND workspace_id=?')
    .bind(u.userId, ws)
    .first<{ role: string }>();
  if (!m) {
    ws = personal;
    await d
      .prepare('UPDATE profiles SET active_workspace=? WHERE user_id=?')
      .bind(ws, u.userId)
      .run();
    m = await membership(u.userId, ws);
  }
  const [space, loadRows, memberRows, planRows, spaces] = await Promise.all([
    d.prepare('SELECT id,name FROM workspaces WHERE id=?').bind(ws).first(),
    d
      .prepare(
        'SELECT data,version FROM loads WHERE workspace_id=? ORDER BY updated DESC,id',
      )
      .bind(ws)
      .all<{ data: string; version: number }>(),
    d
      .prepare(
        'SELECT m.user_id AS userId,p.name,p.email,m.role FROM members m JOIN profiles p ON m.user_id=p.user_id WHERE m.workspace_id=? ORDER BY m.joined',
      )
      .bind(ws)
      .all(),
    d
      .prepare(
        'SELECT id,name,data,created FROM plans WHERE workspace_id=? ORDER BY created DESC',
      )
      .bind(ws)
      .all<{ id: string; name: string; data: string; created: string }>(),
    d
      .prepare(
        'SELECT w.id,w.name,m.role FROM members m JOIN workspaces w ON m.workspace_id=w.id WHERE m.user_id=?',
      )
      .bind(u.userId)
      .all(),
  ]);
  return {
    user: {
      userId: u.userId,
      name: profile!.name,
      email: u.email,
      role: m.role,
    },
    workspace: { ...space, role: m.role },
    workspaces: spaces.results,
    preferences: JSON.parse(profile!.preferences),
    loads: loadRows.results.map((r) => ({
      ...JSON.parse(r.data),
      version: r.version,
    })),
    members: memberRows.results,
    plans: planRows.results.map((r) => ({
      id: r.id,
      name: r.name,
      plan: JSON.parse(r.data),
      created: r.created,
    })),
  };
}
function failure(e: unknown) {
  if (e instanceof InputError) return json({ error: e.message }, e.status);
  console.error(
    'Workspace request failed',
    e instanceof Error ? e.message : 'Unknown error',
  );
  return json(
    { error: 'We could not reach your workspace. Please try again.' },
    500,
  );
}
export async function GET() {
  try {
    const u = await getChatGPTUser();
    if (!u) return json({ error: 'Sign in to open your workspace.' }, 401);
    return json(await state(u));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    const u = await getChatGPTUser();
    if (!u) return json({ error: 'Sign in to save changes.' }, 401);
    const origin = req.headers.get('origin');
    if (origin && new URL(origin).host !== new URL(req.url).host)
      throw new InputError('Cross-site requests are not permitted.', 403);
    if (!req.headers.get('content-type')?.includes('application/json'))
      throw new InputError('Send JSON data.', 415);
    const raw = await req.text();
    if (raw.length > 1000000)
      throw new InputError('This request is too large.', 413);
    let b: Record<string, unknown>;
    try {
      b = JSON.parse(raw);
    } catch {
      throw new InputError('Invalid JSON request.');
    }
    if (!b || typeof b !== 'object') throw new InputError('Invalid request.');
    await initialize(u);
    const d = db(),
      action = string(b.action, 'Action'),
      now = new Date().toISOString();
    if (action === 'acceptInvite') {
      const token = string(b.token, 'Invitation', 128);
      const h = await hash(token);
      const inv = await d
        .prepare(
          'SELECT * FROM invites WHERE hash=? AND used_by IS NULL AND expires>?',
        )
        .bind(h, now)
        .first<{ workspace_id: string; role: string; created_by: string }>();
      if (!inv)
        throw new InputError(
          'This invitation has expired or was already used.',
          410,
        );
      const createdBy = await membership(inv.created_by, inv.workspace_id);
      owner(createdBy.role);
      const existing = await d
        .prepare('SELECT role FROM members WHERE workspace_id=? AND user_id=?')
        .bind(inv.workspace_id, u.userId)
        .first();
      if (existing) {
        await d
          .prepare('UPDATE profiles SET active_workspace=? WHERE user_id=?')
          .bind(inv.workspace_id, u.userId)
          .run();
        return json({ ok: true });
      }
      const result = await d.batch([
        d
          .prepare(
            'UPDATE invites SET used_by=? WHERE hash=? AND used_by IS NULL AND expires>?',
          )
          .bind(u.userId, h, now),
        d
          .prepare(
            'INSERT OR IGNORE INTO members (workspace_id,user_id,role,joined) SELECT workspace_id,?,role,? FROM invites WHERE hash=? AND used_by=? AND expires>?',
          )
          .bind(u.userId, now, h, u.userId, now),
        d
          .prepare(
            'UPDATE profiles SET active_workspace=? WHERE user_id=? AND EXISTS (SELECT 1 FROM members WHERE workspace_id=? AND user_id=?)',
          )
          .bind(inv.workspace_id, u.userId, inv.workspace_id, u.userId),
      ]);
      if (!result[0].meta.changes)
        throw new InputError('This invitation has already been used.', 410);
      return json({ ok: true });
    }
    const ws = string(b.workspaceId, 'Workspace ID');
    const { role } = await membership(u.userId, ws);
    if (action === 'switchWorkspace') {
      const target = string(b.id, 'Workspace ID');
      await membership(u.userId, target);
      await d
        .prepare('UPDATE profiles SET active_workspace=? WHERE user_id=?')
        .bind(target, u.userId)
        .run();
    } else if (action === 'savePreferences') {
      const prefs = validatePreferences(b.preferences);
      await d
        .prepare('UPDATE profiles SET name=?,preferences=? WHERE user_id=?')
        .bind(prefs.name, JSON.stringify(prefs), u.userId)
        .run();
    } else if (action === 'saveLoad') {
      editor(role);
      const l = stampDelivery(validateLoad(b.load), now.slice(0, 10));
      if (
        l.driver &&
        !(await d
          .prepare(
            'SELECT 1 FROM members m JOIN profiles p ON m.user_id=p.user_id WHERE m.workspace_id=? AND p.email=?',
          )
          .bind(ws, l.driver)
          .first())
      )
        throw new InputError('Assign a current workspace member.');
      if (l.version) {
        const r = await d
          .prepare(
            'UPDATE loads SET data=?,version=version+1,updated=? WHERE workspace_id=? AND id=? AND version=?',
          )
          .bind(JSON.stringify(l), now, ws, l.id, l.version)
          .run();
        if (!r.meta.changes)
          throw new InputError(
            'This load changed since you opened it. Refresh and reopen it before saving.',
            409,
          );
      } else {
        const r = await d
          .prepare(
            'INSERT OR IGNORE INTO loads (id,workspace_id,data,version,updated) VALUES (?,?,?,1,?)',
          )
          .bind(l.id, ws, JSON.stringify({ ...l, sample: false }), now)
          .run();
        if (!r.meta.changes)
          throw new InputError('A load with this ID already exists.', 409);
      }
    } else if (action === 'importLoads') {
      editor(role);
      if (!Array.isArray(b.loads) || b.loads.length < 1 || b.loads.length > 200)
        throw new InputError('Import between 1 and 200 loads.');
      const ls = b.loads.map((x: unknown) =>
        stampDelivery(validateLoad(x), now.slice(0, 10)),
      );
      const existing = await d
        .prepare('SELECT data FROM loads WHERE workspace_id=?')
        .bind(ws)
        .all<{ data: string }>();
      const orders = new Set(
        existing.results.map((r) => JSON.parse(r.data).order.toLowerCase()),
      );
      for (const l of ls) {
        if (orders.has(l.order.toLowerCase()))
          throw new InputError(
            `Order ${l.order} already exists. Use a unique order number.`,
          );
        orders.add(l.order.toLowerCase());
      }
      await d.batch(
        ls.map((l) =>
          d
            .prepare(
              'INSERT INTO loads (id,workspace_id,data,version,updated) VALUES (?,?,?,1,?)',
            )
            .bind(
              l.id,
              ws,
              JSON.stringify({ ...l, sample: false, version: 1 }),
              now,
            ),
        ),
      );
    } else if (action === 'clearSamples') {
      editor(role);
      await d
        .prepare(
          "DELETE FROM loads WHERE workspace_id=? AND json_extract(data,'$.sample')=1",
        )
        .bind(ws)
        .run();
    } else if (action === 'createWorkspace') {
      const count = await d
        .prepare('SELECT COUNT(*) AS n FROM workspaces WHERE owner_id=?')
        .bind(u.userId)
        .first<{ n: number }>();
      if ((count?.n ?? 0) >= 10)
        throw new InputError('You can own up to 10 workspaces.');
      const name = string(b.name, 'Workspace name', 80);
      const id = 'ws_' + crypto.randomUUID().replace(/-/g, '');
      const seed = b.seed === true ? seedLoads() : [];
      await d.batch([
        d
          .prepare(
            'INSERT INTO workspaces (id,name,owner_id,created) VALUES (?,?,?,?)',
          )
          .bind(id, name, u.userId, now),
        d
          .prepare(
            "INSERT INTO members (workspace_id,user_id,role,joined) VALUES (?,?,'owner',?)",
          )
          .bind(id, u.userId, now),
        ...seed.map((l) =>
          d
            .prepare(
              'INSERT INTO loads (id,workspace_id,data,version,updated) VALUES (?,?,?,1,?)',
            )
            .bind(l.id, id, JSON.stringify(l), now),
        ),
        d
          .prepare('UPDATE profiles SET active_workspace=? WHERE user_id=?')
          .bind(id, u.userId),
      ]);
    } else if (action === 'resetDemo') {
      owner(role);
      await d.batch([
        d.prepare('DELETE FROM loads WHERE workspace_id=?').bind(ws),
        d.prepare('DELETE FROM plans WHERE workspace_id=?').bind(ws),
        ...seedLoads().map((l) =>
          d
            .prepare(
              'INSERT INTO loads (id,workspace_id,data,version,updated) VALUES (?,?,?,1,?)',
            )
            .bind(l.id, ws, JSON.stringify(l), now),
        ),
      ]);
    } else if (action === 'savePlan') {
      editor(role);
      const name = string(b.name, 'Plan name', 120);
      const prefs = validatePreferences(b.preferences);
      const days = Number(b.days);
      if (!Number.isInteger(days) || days < 1 || days > 7)
        throw new InputError('Choose 1–7 days.');
      const strategy = string(b.strategy, 'Strategy');
      if (!['Maximum net', 'Lowest cost', 'Best balance'].includes(strategy))
        throw new InputError('Invalid strategy.');
      const rows = await d
        .prepare('SELECT data,version FROM loads WHERE workspace_id=?')
        .bind(ws)
        .all<{ data: string; version: number }>();
      const plan = optimize(
        rows.results.map((r) => ({
          ...JSON.parse(r.data),
          version: r.version,
        })),
        prefs,
        days,
        strategy,
      );
      if (!plan.loads.length)
        throw new InputError('There is no feasible plan to save.');
      await d
        .prepare(
          'INSERT INTO plans (id,workspace_id,name,data,created_by,created) VALUES (?,?,?,?,?,?)',
        )
        .bind(
          crypto.randomUUID(),
          ws,
          name,
          JSON.stringify(plan),
          u.userId,
          now,
        )
        .run();
    } else if (action === 'deletePlan') {
      editor(role);
      const r = await d
        .prepare('DELETE FROM plans WHERE workspace_id=? AND id=?')
        .bind(ws, string(b.id, 'Plan ID'))
        .run();
      if (!r.meta.changes) throw new InputError('Plan not found.', 404);
    } else if (action === 'renameWorkspace') {
      owner(role);
      await d
        .prepare('UPDATE workspaces SET name=? WHERE id=?')
        .bind(string(b.name, 'Workspace name', 80), ws)
        .run();
    } else if (action === 'createInvite') {
      owner(role);
      if (
        typeof b.role !== 'string' ||
        !['dispatcher', 'viewer'].includes(b.role)
      )
        throw new InputError('Choose a dispatcher or viewer role.');
      const token = crypto.randomUUID() + crypto.randomUUID();
      await d
        .prepare(
          'INSERT INTO invites (hash,workspace_id,role,expires,created_by) VALUES (?,?,?,?,?)',
        )
        .bind(
          await hash(token),
          ws,
          b.role,
          new Date(Date.now() + 7 * 86400000).toISOString(),
          u.userId,
        )
        .run();
      return json({ token });
    } else if (action === 'memberRole' || action === 'removeMember') {
      owner(role);
      const uid = string(b.userId, 'Member ID');
      const member = await membership(uid, ws);
      if (member.role === 'owner')
        throw new InputError('The owner cannot be removed or demoted.');
      if (action === 'memberRole') {
        if (
          typeof b.role !== 'string' ||
          !['dispatcher', 'viewer'].includes(b.role)
        )
          throw new InputError('Invalid team role.');
        await d
          .prepare(
            'UPDATE members SET role=? WHERE workspace_id=? AND user_id=?',
          )
          .bind(b.role, ws, uid)
          .run();
      } else
        await d
          .prepare('DELETE FROM members WHERE workspace_id=? AND user_id=?')
          .bind(ws, uid)
          .run();
    } else throw new InputError('Unknown action.');
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
