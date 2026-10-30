// Neon database client for the admin bot.
// Minimal Supabase-compatible query builder (from/select/eq/gte/in/order/limit,
// insert/update, count) over Neon's serverless driver (HTTPS, no port 5432 needed).
// Uses the owner connection string: full admin access, keep DATABASE_URL secret.
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Variable d'environnement manquante : DATABASE_URL (chaîne de connexion Neon) est requise.");
}

const sql = neon(databaseUrl, { fullResults: true });
const ident = (name) => '"' + String(name).replace(/"/g, '""') + '"';
const cols = (s) => (!s || s.trim() === '*' ? '*' : s.split(',').map((c) => ident(c.trim())).join(', '));

class Query {
  constructor(table) {
    this.table = table;
    this.op = 'select';
    this.columns = '*';
    this.opts = {};
    this.where = [];
    this.params = [];
    this.orders = [];
    this.limitN = null;
    this.payload = null;
  }
  _p(v) { this.params.push(v); return '$' + this.params.length; }
  select(columns = '*', opts = {}) { this.columns = columns; this.opts = opts; return this; }
  insert(rows) { this.op = 'insert'; this.payload = Array.isArray(rows) ? rows : [rows]; return this; }
  update(values) { this.op = 'update'; this.payload = values; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(c, v) { this.where.push(`${ident(c)} = ${this._p(v)}`); return this; }
  neq(c, v) { this.where.push(`${ident(c)} <> ${this._p(v)}`); return this; }
  gt(c, v) { this.where.push(`${ident(c)} > ${this._p(v)}`); return this; }
  gte(c, v) { this.where.push(`${ident(c)} >= ${this._p(v)}`); return this; }
  lt(c, v) { this.where.push(`${ident(c)} < ${this._p(v)}`); return this; }
  lte(c, v) { this.where.push(`${ident(c)} <= ${this._p(v)}`); return this; }
  in(c, list) { this.where.push(`${ident(c)} = ANY(${this._p(list)})`); return this; }
  order(c, { ascending = true } = {}) { this.orders.push(`${ident(c)} ${ascending ? 'ASC' : 'DESC'}`); return this; }
  limit(n) { this.limitN = Number(n); return this; }
  single() { this.singleRow = true; return this; }
  maybeSingle() { this.maybe = true; return this; }

  async _run() {
    const t = ident(this.table);
    const w = this.where.length ? ' WHERE ' + this.where.join(' AND ') : '';
    try {
      if (this.op === 'insert') {
        const keys = Object.keys(this.payload[0]);
        const values = this.payload.map((r) => '(' + keys.map((k) => this._p(r[k])).join(', ') + ')').join(', ');
        const res = await sql.query(`INSERT INTO ${t} (${keys.map(ident).join(', ')}) VALUES ${values} RETURNING *`, this.params);
        return { data: res.rows, error: null };
      }
      if (this.op === 'update') {
        const sets = Object.entries(this.payload).map(([k, v]) => `${ident(k)} = ${this._p(v)}`).join(', ');
        const res = await sql.query(`UPDATE ${t} SET ${sets}${w} RETURNING *`, this.params);
        return { data: res.rows, error: null };
      }
      if (this.op === 'delete') {
        const res = await sql.query(`DELETE FROM ${t}${w} RETURNING *`, this.params);
        return { data: res.rows, error: null };
      }
      let count = null;
      if (this.opts.count) {
        const c = await sql.query(`SELECT count(*)::int AS n FROM ${t}${w}`, this.params);
        count = c.rows[0].n;
        if (this.opts.head) return { data: null, count, error: null };
      }
      const o = this.orders.length ? ' ORDER BY ' + this.orders.join(', ') : '';
      const l = this.limitN != null ? ` LIMIT ${this.limitN}` : '';
      const res = await sql.query(`SELECT ${cols(this.columns)} FROM ${t}${w}${o}${l}`, this.params);
      let data = res.rows;
      if (this.singleRow || this.maybe) {
        if (this.singleRow && data.length !== 1) return { data: null, count, error: { message: 'Expected a single row' } };
        data = data[0] ?? null;
      }
      return { data, count, error: null };
    } catch (e) {
      return { data: null, count: null, error: { message: e.message } };
    }
  }
  then(resolve, reject) { return this._run().then(resolve, reject); }
}

// Users live in Neon Auth (neon_auth.user). Shape mapped to Supabase Auth users.
async function listUsers({ page = 1, perPage = 1000 } = {}) {
  try {
    const res = await sql.query(
      `SELECT u.id, u.email, u.name, u.image, u."emailVerified", u."createdAt", u."updatedAt",
              (SELECT max(s."createdAt") FROM neon_auth.session s WHERE s."userId" = u.id) AS last_sign_in
         FROM neon_auth."user" u ORDER BY u."createdAt" LIMIT $1 OFFSET $2`,
      [perPage, (page - 1) * perPage]
    );
    const users = res.rows.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.createdAt ? new Date(u.createdAt).toISOString() : null,
      updated_at: u.updatedAt ? new Date(u.updatedAt).toISOString() : null,
      last_sign_in_at: u.last_sign_in ? new Date(u.last_sign_in).toISOString() : null,
      email_confirmed_at: u.emailVerified ? new Date(u.createdAt).toISOString() : null,
      user_metadata: { full_name: u.name || '', avatar_url: u.image || '' },
    }));
    return { data: { users }, error: null };
  } catch (e) {
    return { data: { users: [] }, error: { message: e.message } };
  }
}

export const supabase = {
  from: (table) => new Query(table),
  auth: { admin: { listUsers } },
};
export default supabase;
