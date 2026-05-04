// Supabase API helper
window.DB = (() => {
  const url = () => window.SUPABASE_URL;
  const key = () => window.SUPABASE_KEY;
  const headers = () => ({
    'Content-Type': 'application/json',
    'apikey': key(),
    'Authorization': `Bearer ${key()}`,
    'Prefer': 'return=representation',
  });

  async function get(table, params = '') {
    const r = await fetch(`${url()}/rest/v1/${table}?${params}`, { headers: headers() });
    return r.json();
  }

  async function post(table, body) {
    const r = await fetch(`${url()}/rest/v1/${table}`, {
      method: 'POST', headers: headers(), body: JSON.stringify(body)
    });
    return r.json();
  }

  async function patch(table, filter, body) {
    const r = await fetch(`${url()}/rest/v1/${table}?${filter}`, {
      method: 'PATCH', headers: headers(), body: JSON.stringify(body)
    });
    return r.json();
  }

  async function del(table, filter) {
    const r = await fetch(`${url()}/rest/v1/${table}?${filter}`, {
      method: 'DELETE', headers: { ...headers(), 'Prefer': 'return=minimal' }
    });
    return r.ok;
  }

  // ── Presenters ──────────────────────────────────────────
  async function getPresenters() {
    return get('presenters', 'order=name');
  }

  async function addPresenter(name, pin, brands) {
    return post('presenters', { name, pin, brands, updated_at: new Date().toISOString() });
  }

  async function updatePresenter(id, data) {
    return patch('presenters', `id=eq.${id}`, { ...data, updated_at: new Date().toISOString() });
  }

  async function deletePresenter(id) {
    return del('presenters', `id=eq.${id}`);
  }

  // ── Availability ────────────────────────────────────────
  async function getAvailability(presenterId) {
    return get('availability', `presenter_id=eq.${presenterId}&order=date`);
  }

  async function getAllAvailability() {
    return get('availability', 'order=date');
  }

  async function upsertAvailability(presenterId, presenterName, date, slots, note) {
    // Always delete first, then insert if slots non-empty
    await del('availability', `presenter_id=eq.${presenterId}&date=eq.${date}`);
    if (slots.length === 0) return { success: true };
    return post('availability', {
      presenter_id: presenterId,
      presenter_name: presenterName,
      date,
      slots: JSON.stringify(slots),
      note: note || '',
      updated_at: new Date().toISOString()
    });
  }

  // ── Brands ───────────────────────────────────────────────
  async function getBrands() {
    const rows = await get('brands', 'order=name');
    return Array.isArray(rows) ? rows.map(r => r.name) : [];
  }

  async function addBrand(name) {
    return post('brands', { name });
  }

  async function deleteBrand(name) {
    return del('brands', `name=eq.${encodeURIComponent(name)}`);
  }

  return {
    getPresenters, addPresenter, updatePresenter, deletePresenter,
    getAvailability, getAllAvailability, upsertAvailability,
    getBrands, addBrand, deleteBrand
  };
})();
