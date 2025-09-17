// Mobile nav toggle
const navToggle = document.querySelector('.nav-toggle');
const navList = document.querySelector('#nav-list');
if (navToggle && navList) {
  navToggle.addEventListener('click', () => {
    const isOpen = navList.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

// Smooth scroll and active link highlighting
const headerHeight = 72; // match CSS
const navLinks = document.querySelectorAll('.nav-list a, .footer-nav a');
navLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - headerHeight + 2;
    window.scrollTo({ top, behavior: 'smooth' });
    if (navList.classList.contains('open')) {
      navList.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
});

// Intersection observer for active link state
const sections = document.querySelectorAll('main section[id]');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const id = entry.target.getAttribute('id');
    if (!id) return;
    const matched = document.querySelectorAll(`a[href="#${id}"]`);
    matched.forEach((a) => a.classList.toggle('active', entry.isIntersecting));
  });
}, { rootMargin: '-50% 0px -40% 0px', threshold: 0.01 });
sections.forEach((sec) => observer.observe(sec));

// Footer year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// -----------------------------
// Simple client-side auth + CRUD
// Storage keys
const STORAGE_KEYS = {
  users: 'eventme_users',
  session: 'eventme_session',
  events: 'eventme_events'
};

function readStore(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
}
function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getSessionUser() {
  return readStore(STORAGE_KEYS.session, null);
}
function setSessionUser(user) {
  writeStore(STORAGE_KEYS.session, user);
}

function ensureSeedData() {
  const users = readStore(STORAGE_KEYS.users, []);
  if (!users.find(u => u.email === 'admin@demo.com')) {
    users.push({ email: 'admin@demo.com', password: 'admin123', role: 'admin' });
  }
  if (!users.find(u => u.email === 'user@demo.com')) {
    users.push({ email: 'user@demo.com', password: 'user12345', role: 'user' });
  }
  writeStore(STORAGE_KEYS.users, users);

  const events = readStore(STORAGE_KEYS.events, []);
  if (events.length === 0) {
    const demo = [
      { id: cryptoRandomId(), title: 'Tech Summit', date: '2025-10-12', city: 'San Francisco, CA', image: 'assets/images/event-1.png', desc: 'A day of future tech talks.' },
      { id: cryptoRandomId(), title: 'Design Meetup', date: '2025-11-03', city: 'Berlin, DE', image: 'assets/images/event-2.png', desc: 'Pixels, prototypes, and people.' },
      { id: cryptoRandomId(), title: 'Hack Night', date: '2025-12-01', city: 'Remote', image: 'assets/images/event-3.png', desc: 'Pair up and build something great.' }
    ];
    writeStore(STORAGE_KEYS.events, demo);
  }
}

function cryptoRandomId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function signup(email, password, isAdmin) {
  const users = readStore(STORAGE_KEYS.users, []);
  if (users.find(u => u.email === email)) throw new Error('Account already exists');
  const user = { email, password, role: isAdmin ? 'admin' : 'user' };
  users.push(user);
  writeStore(STORAGE_KEYS.users, users);
  setSessionUser({ email: user.email, role: user.role });
}

function login(email, password) {
  const users = readStore(STORAGE_KEYS.users, []);
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) throw new Error('Invalid credentials');
  setSessionUser({ email: user.email, role: user.role });
}

function logout() { setSessionUser(null); }

function isAdmin() { return getSessionUser()?.role === 'admin'; }

function authGuardAdmin() {
  if (!isAdmin()) {
    window.location.href = 'login.html';
  }
}

function hydrateAuthUI() {
  const session = getSessionUser();
  document.querySelectorAll('.auth-only').forEach((el) => {
    el.style.display = session?.role === 'admin' ? '' : 'none';
  });
  const loginLink = document.getElementById('login-link');
  if (loginLink) {
    if (session) {
      loginLink.textContent = 'Account (' + session.role + ')';
      loginLink.href = isAdmin() ? 'admin.html' : 'index.html#top';
    } else {
      loginLink.textContent = 'Signup / Login';
      loginLink.href = 'login.html';
    }
  }
}

function getEvents() { return readStore(STORAGE_KEYS.events, []); }
function saveEvents(list) { writeStore(STORAGE_KEYS.events, list); }

function renderPublicEvents() {
  const wrap = document.getElementById('event-list');
  if (!wrap) return;
  const events = getEvents();
  wrap.innerHTML = events.map((e) => `
    <article class="event-card">
      <img src="${e.image || 'assets/images/event-1.png'}" alt="${e.title}" />
      <div class="event-meta">
        <h3>${e.title}</h3>
        <p>${formatDate(e.date)} • ${e.city}</p>
        <p class="small">${e.desc || ''}</p>
      </div>
    </article>
  `).join('');
}

function renderAdminEvents() {
  const wrap = document.getElementById('admin-events');
  if (!wrap) return;
  const events = getEvents();
  wrap.innerHTML = events.map((e) => `
    <article class="event-card">
      <img src="${e.image || 'assets/images/event-1.png'}" alt="${e.title}" />
      <div class="event-meta">
        <h3>${e.title}</h3>
        <p>${formatDate(e.date)} • ${e.city}</p>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-small" data-edit="${e.id}">Edit</button>
          <button class="btn btn-ghost btn-small" data-delete="${e.id}">Delete</button>
        </div>
      </div>
    </article>
  `).join('');

  wrap.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => startEdit(btn.getAttribute('data-edit'))));
  wrap.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', () => deleteEvent(btn.getAttribute('data-delete'))));
}

function formatDate(iso) {
  try { return new Date(iso).toLocaleDateString(); } catch (_) { return iso; }
}

function upsertEvent(data) {
  const events = getEvents();
  if (data.id) {
    const idx = events.findIndex(e => e.id === data.id);
    if (idx !== -1) { events[idx] = data; }
  } else {
    data.id = cryptoRandomId();
    events.push(data);
  }
  saveEvents(events);
}

function startEdit(id) {
  const e = getEvents().find(ev => ev.id === id);
  if (!e) return;
  const idEl = document.getElementById('ev-id');
  const t = document.getElementById('ev-title');
  const d = document.getElementById('ev-date');
  const c = document.getElementById('ev-city');
  const i = document.getElementById('ev-image');
  const ds = document.getElementById('ev-desc');
  if (idEl && t && d && c && i && ds) {
    idEl.value = e.id;
    t.value = e.title;
    d.value = e.date;
    c.value = e.city;
    i.value = e.image || '';
    ds.value = e.desc || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function deleteEvent(id) {
  const events = getEvents().filter(e => e.id !== id);
  saveEvents(events);
  renderAdminEvents();
  renderPublicEvents();
}

function bindLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return;
  ensureSeedData();
  const email = document.getElementById('login-email');
  const pwd = document.getElementById('login-password');
  const demoAdmin = document.getElementById('demo-admin');
  const demoUser = document.getElementById('demo-user');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      login(email.value.trim(), pwd.value);
      window.location.href = isAdmin() ? 'admin.html' : 'events.html';
    } catch (err) { alert(err.message || String(err)); }
  });
  demoAdmin?.addEventListener('click', () => {
    email.value = 'admin@demo.com';
    pwd.value = 'admin123';
  });
  demoUser?.addEventListener('click', () => {
    email.value = 'user@demo.com';
    pwd.value = 'user12345';
  });
}

function bindSignupPage() {
  const form = document.getElementById('signup-form');
  if (!form) return;
  ensureSeedData();
  const email = document.getElementById('signup-email');
  const pwd = document.getElementById('signup-password');
  const admin = document.getElementById('signup-admin');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      signup(email.value.trim(), pwd.value, admin.checked);
      window.location.href = isAdmin() ? 'admin.html' : 'events.html';
    } catch (err) { alert(err.message || String(err)); }
  });
}

function bindAdminPage() {
  const form = document.getElementById('event-form');
  const logoutBtn = document.getElementById('logout-btn');
  if (!form) return;
  authGuardAdmin();
  ensureSeedData();
  renderAdminEvents();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('ev-id').value || undefined;
    const data = {
      id,
      title: document.getElementById('ev-title').value.trim(),
      date: document.getElementById('ev-date').value,
      city: document.getElementById('ev-city').value.trim(),
      image: document.getElementById('ev-image').value.trim(),
      desc: document.getElementById('ev-desc').value.trim()
    };
    if (!data.title || !data.date || !data.city) { alert('Please fill required fields'); return; }
    upsertEvent(data);
    form.reset();
    document.getElementById('ev-id').value = '';
    renderAdminEvents();
    renderPublicEvents();
    alert('Saved');
  });

  logoutBtn?.addEventListener('click', () => { logout(); window.location.href = 'index.html#top'; });
}

function bindEventsPage() {
  const list = document.getElementById('event-list');
  if (!list) return;
  ensureSeedData();
  renderPublicEvents();
}

// Init per page
document.addEventListener('DOMContentLoaded', () => {
  ensureSeedData();
  hydrateAuthUI();
  bindLoginPage();
  bindSignupPage();
  bindAdminPage();
  bindEventsPage();
});

