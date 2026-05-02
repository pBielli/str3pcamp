// ── SHARED TOOLBAR MODULE ─────────────────────────────────────
// Usage: import { initToolbar } from '../js/toolbar.js';
// const auth = await initToolbar({ title: 'Page Title', firebaseConfig: cfg.firebase, currentPage: 'transfer' });

export async function initToolbar({ title = '', firebaseConfig = null, currentPage = '' }) {
  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    #tool-navbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
      background: linear-gradient(180deg, #060d06 0%, #0a1409 100%);
      border-bottom: 1px solid #182c1b;
      display: flex; align-items: center; justify-content: space-between;
      padding: max(12px, env(safe-area-inset-top, 0px)) 14px 12px;
      gap: 10px; min-height: 52px;
      font-family: 'Space Mono', monospace;
    }
    .tnav-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .tnav-back {
      text-decoration: none; color: #3d8a4e;
      font-size: 10px; letter-spacing: .5px; white-space: nowrap;
      padding: 5px 9px; border: 1px solid #1e3d22; border-radius: 6px;
      transition: all .2s; flex-shrink: 0;
    }
    .tnav-back:hover { background: #0f1e12; border-color: #3d8a4e; color: #7ab880; }
    .tnav-sep { color: #182c1b; font-size: 14px; }
    .tnav-title { font-size: 10px; color: #7ab880; letter-spacing: 1px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tnav-right { display: flex; align-items: center; gap: 7px; flex-shrink: 0; }
    .tnav-tools { display: flex; gap: 4px; }
    .tnav-link {
      text-decoration: none; color: #4a7a4e; font-size: 9px; letter-spacing: .3px;
      padding: 4px 7px; border: 1px solid #182c1b; border-radius: 5px;
      transition: all .2s; white-space: nowrap;
    }
    .tnav-link:hover, .tnav-link.active { background: #0f1e12; border-color: #2a5a2e; color: #7ab880; }
    .tnav-user {
      font-size: 9px; color: #7ab880; letter-spacing: .3px;
      max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      display: none;
    }
    .tnav-btn {
      background: #0f1e12; border: 1px solid #1e3d22; color: #4a7a4e;
      padding: 5px 9px; border-radius: 6px; font-family: 'Space Mono', monospace;
      font-size: 9px; letter-spacing: .3px; cursor: pointer; transition: all .2s;
      white-space: nowrap;
    }
    .tnav-btn:hover { background: #1a3a1e; border-color: #3d8a4e; color: #a8e4a8; }
    body.tool-page { padding-top: 56px !important; }
  `;
  document.head.appendChild(style);

  // Build navbar
  const tools = [
    { href: './transfer.html',   id: 'transfer',   label: '🔄 DB'   },
    { href: './categories.html', id: 'categories', label: '🏷️ CAT'  },
    { href: './seed-config.html',id: 'seed',       label: '🌱 SEED' },
  ];

  const nav = document.createElement('div');
  nav.id = 'tool-navbar';
  nav.innerHTML = `
    <div class="tnav-left">
      <a href="../index.html" class="tnav-back">← APP</a>
      <span class="tnav-sep">·</span>
      <span class="tnav-title">${title}</span>
    </div>
    <div class="tnav-right">
      <div class="tnav-tools">
        ${tools.map(t => `<a href="${t.href}" class="tnav-link${currentPage === t.id ? ' active' : ''}">${t.label}</a>`).join('')}
      </div>
      <span class="tnav-user" id="tnav-user"></span>
      <button id="tnav-login" class="tnav-btn">🔑 LOGIN</button>
      <button id="tnav-logout" class="tnav-btn" style="display:none">✕ ESCI</button>
    </div>
  `;
  document.body.insertBefore(nav, document.body.firstChild);
  document.body.classList.add('tool-page');

  if (!firebaseConfig) return null;

  // Init Firebase auth
  try {
    const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getAuth, onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } =
      await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();

    onAuthStateChanged(auth, user => {
      const userEl    = document.getElementById('tnav-user');
      const loginBtn  = document.getElementById('tnav-login');
      const logoutBtn = document.getElementById('tnav-logout');
      if (user) {
        userEl.textContent = (user.displayName || user.email || '').split(' ')[0];
        userEl.style.display = 'block';
        loginBtn.style.display  = 'none';
        logoutBtn.style.display = 'block';
      } else {
        userEl.style.display    = 'none';
        loginBtn.style.display  = 'block';
        logoutBtn.style.display = 'none';
      }
    });

    document.getElementById('tnav-login').onclick  = () => signInWithPopup(auth, provider).catch(e => console.error(e));
    document.getElementById('tnav-logout').onclick = () => signOut(auth);

    return { app, auth };
  } catch(e) {
    console.warn('Toolbar auth init failed', e);
    return null;
  }
}
