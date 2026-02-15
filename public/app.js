const API = '/api';
const HEALTH = '/health';

function el(id) {
  return document.getElementById(id);
}

async function fetchHealth() {
  const res = await fetch(HEALTH);
  const data = await res.json();
  const node = el('health');
  node.textContent = `Status: ${data.status} · DB: ${data.db}`;
  node.className = 'health ' + data.status;
}

async function fetchApplications(filterType = '') {
  const url = filterType ? `${API}/applications?type=${encodeURIComponent(filterType)}` : `${API}/applications`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

function renderList(apps) {
  const list = el('list');
  if (!apps.length) {
    list.innerHTML = '<p class="empty">No applications yet. Add one above.</p>';
    return;
  }
  list.innerHTML = `
    <ul>
      ${apps.map((a) => `
        <li>
          <span class="name">${escapeHtml(a.name)}</span>
          <span class="type">${escapeHtml(a.type)}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function showMessage(text, type = '') {
  const node = el('form-message');
  node.textContent = text;
  node.className = 'message ' + type;
}

async function loadApplications() {
  const filterType = el('filter-type').value;
  try {
    el('list').innerHTML = '<p class="muted">Loading…</p>';
    const apps = await fetchApplications(filterType);
    renderList(apps);
  } catch (e) {
    el('list').innerHTML = '<p class="muted">Failed to load: ' + escapeHtml(e.message) + '</p>';
  }
}

async function submitAddForm(e) {
  e.preventDefault();
  const form = e.target;
  const name = form.name.value.trim();
  const description = form.description.value.trim() || null;
  const type = form.type.value;

  showMessage('', '');
  try {
    const res = await fetch(API + '/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, type }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showMessage(data.error || 'Failed to add application', 'error');
      return;
    }
    showMessage('Application added.', 'success');
    form.name.value = '';
    form.description.value = '';
    loadApplications();
  } catch (e) {
    showMessage('Request failed: ' + e.message, 'error');
  }
}

el('add-form').addEventListener('submit', submitAddForm);
el('refresh').addEventListener('click', loadApplications);
el('filter-type').addEventListener('change', loadApplications);

fetchHealth();
loadApplications();
