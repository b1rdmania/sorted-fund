# Phase 6: Frontend Integration - Production Dashboard

## Current Status

✅ **Backend Complete:**
- Developer login/registration working
- Session-based authentication (7-day sessions)
- Per-project gas tanks (isolated balances)
- Gas authorization and reconciliation
- Deployed to production: https://sorted-backend.onrender.com

✅ **What We Have:**
- Original dashboard at `frontend/dashboard/` (8 HTML pages)
- API client already configured for production (`assets/js/api.js`)
- Dashboard-v2 at `frontend/dashboard-v2/` (has login page we can copy)

❌ **What's Missing:**
- Login page in original dashboard
- Session management in frontend
- Project selector/switcher
- Gas tank balance display
- Project creation flow

---

## Goal

Make the **original dashboard** (`frontend/dashboard/`) work with developer accounts and per-project gas tanks.

**User Flow:**
1. Visit dashboard → redirected to login if not authenticated
2. Login with email/password → session stored
3. Dashboard shows project selector + current project's gas tank balance
4. Can switch between projects or create new ones
5. Generate API keys for each project
6. Use API key in game/app to send gasless transactions

---

## Architecture Decision

**Use Original Dashboard** (`frontend/dashboard/`) because:
- ✅ Already has all the pages we need (overview, API keys, gas station, etc.)
- ✅ Better design and UX than dashboard-v2
- ✅ API client already configured
- ✅ Just needs authentication layer added

**What to Copy from Dashboard-v2:**
- Login page HTML/CSS/JS
- Auth utilities (session management)
- Project switcher component

---

## Implementation Plan (3-4 hours)

### Step 1: Add Authentication Layer (1 hour)

#### 1.1 Create Login Page
**File:** `frontend/dashboard/login.html`

Copy from `frontend/dashboard-v2/login.html` and adapt styling to match original dashboard.

**Features:**
- Email/password login form
- "Register" tab for new accounts
- Remember me checkbox (optional)
- Error messages for invalid credentials
- Redirect to dashboard on success

**API Calls:**
- `POST /auth/login` - Returns session token
- `POST /auth/register` - Creates account + returns session token

#### 1.2 Create Auth Utility
**File:** `frontend/dashboard/assets/js/auth.js`

```javascript
class Auth {
  // Store/retrieve session token from localStorage
  static getToken() { ... }
  static setToken(token) { ... }
  static clearToken() { ... }

  // Check if user is authenticated
  static async isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    // Verify token with backend
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Redirect to login if not authenticated
  static async requireAuth() {
    if (!(await this.isAuthenticated())) {
      window.location.href = '/login.html';
    }
  }

  // Login
  static async login(email, password) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) throw new Error('Invalid credentials');

    const data = await response.json();
    this.setToken(data.sessionToken);
    return data;
  }

  // Logout
  static async logout() {
    this.clearToken();
    window.location.href = '/login.html';
  }
}
```

#### 1.3 Update API Client
**File:** `frontend/dashboard/assets/js/api.js`

Add session token to all requests:

```javascript
async _request(endpoint, options = {}) {
  const url = `${this.baseUrl}${endpoint}`;

  // Get session token
  const token = localStorage.getItem('sorted_session_token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    },
    credentials: 'include', // Include cookies
    ...options
  };

  const response = await fetch(url, config);

  // Handle 401 Unauthorized
  if (response.status === 401) {
    localStorage.removeItem('sorted_session_token');
    window.location.href = '/login.html';
    throw new Error('Session expired');
  }

  // ... rest of existing code
}
```

#### 1.4 Add Auth Check to All Pages
**Files:** All existing dashboard pages

Add this to the top of each page's `<script>` section:

```javascript
// Require authentication
(async () => {
  await Auth.requireAuth();
  await loadDashboard();
})();
```

---

### Step 2: Add Project Management (1.5 hours)

#### 2.1 Create Project Switcher Component
**File:** `frontend/dashboard/assets/js/projectSwitcher.js`

```javascript
class ProjectSwitcher {
  static currentProject = null;

  // Load user's projects
  static async loadProjects() {
    try {
      const projects = await api.getAllProjects();
      return projects;
    } catch (error) {
      console.error('Failed to load projects:', error);
      return [];
    }
  }

  // Get current project from localStorage or first project
  static async getCurrentProject() {
    if (this.currentProject) return this.currentProject;

    const savedProjectId = localStorage.getItem('sorted_current_project');
    const projects = await this.loadProjects();

    if (projects.length === 0) {
      // No projects - show "create project" flow
      return null;
    }

    // Use saved project or first one
    this.currentProject = savedProjectId
      ? projects.find(p => p.id === savedProjectId) || projects[0]
      : projects[0];

    return this.currentProject;
  }

  // Switch to different project
  static switchProject(projectId) {
    localStorage.setItem('sorted_current_project', projectId);
    window.location.reload(); // Reload dashboard with new project
  }

  // Render project selector dropdown
  static async renderSelector(containerId) {
    const container = document.getElementById(containerId);
    const projects = await this.loadProjects();
    const current = await this.getCurrentProject();

    if (!current) {
      // Show "Create First Project" message
      container.innerHTML = `
        <div class="no-projects">
          <p>No projects yet</p>
          <button onclick="ProjectSwitcher.showCreateModal()">Create Project</button>
        </div>
      `;
      return;
    }

    // Render dropdown
    container.innerHTML = `
      <select id="project-selector" onchange="ProjectSwitcher.switchProject(this.value)">
        ${projects.map(p => `
          <option value="${p.id}" ${p.id === current.id ? 'selected' : ''}>
            ${p.name}
          </option>
        `).join('')}
      </select>
      <button onclick="ProjectSwitcher.showCreateModal()">+ New Project</button>
    `;
  }

  // Show create project modal
  static showCreateModal() {
    // TODO: Implement modal for project creation
    const name = prompt('Project name:');
    if (name) {
      this.createProject(name);
    }
  }

  // Create new project
  static async createProject(name) {
    try {
      const project = await api.createProject({ name });
      this.switchProject(project.id);
    } catch (error) {
      alert('Failed to create project: ' + error.message);
    }
  }
}
```

#### 2.2 Add Project Selector to Dashboard Header
**File:** `frontend/dashboard/index.html` (and all other pages)

Add this to the header/navigation area:

```html
<!-- Add after logo/title -->
<div id="project-switcher-container"></div>

<script>
  // Load project switcher
  (async () => {
    await Auth.requireAuth();
    await ProjectSwitcher.renderSelector('project-switcher-container');
    await loadDashboard();
  })();
</script>
```

#### 2.3 Update Overview Page to Show Gas Tank Balance
**File:** `frontend/dashboard/index.html`

Replace the demo balance display with real gas tank balance:

```javascript
async function loadDashboard() {
  const project = await ProjectSwitcher.getCurrentProject();
  if (!project) return; // No projects yet

  // Get gas tank balance
  const balance = await api.getGasTankBalance(project.id);

  // Display in big number at top
  document.getElementById('gas-balance').innerHTML = `
    <div class="balance-card">
      <h2>Gas Tank Balance</h2>
      <div class="balance-amount">
        ${formatBalance(balance.balance)} S
      </div>
      <p class="balance-usd">≈ $${formatUSD(balance.balanceUSD)}</p>
      <button onclick="showAddFundsModal()">Add Funds</button>
    </div>
  `;

  // Load recent transactions
  loadRecentTransactions(project.id);
}

function formatBalance(wei) {
  return (BigInt(wei) / BigInt(10**18)).toString();
}
```

---

### Step 3: Update Existing Pages (1 hour)

#### 3.1 Access Keys Page
**File:** `frontend/dashboard/access-keys.html`

**Changes needed:**
- Load API keys for current project (already implemented in api.js)
- Add "Generate API Key" button
- Show/hide full key on first generation (security warning)

```javascript
async function loadApiKeys() {
  const project = await ProjectSwitcher.getCurrentProject();
  const keys = await api.getApiKeys(project.id);

  // Render keys table (existing code works)
  renderKeysTable(keys);
}

async function generateNewKey() {
  const project = await ProjectSwitcher.getCurrentProject();
  const rateLimit = 1000; // Default rate limit

  const newKey = await api.generateApiKey(project.id, { rateLimit });

  // Show full key ONCE (it won't be shown again)
  alert(`API Key (copy now!):\n\n${newKey.key}\n\nThis will only be shown once!`);

  // Reload keys
  loadApiKeys();
}
```

#### 3.2 Gas Station Page
**File:** `frontend/dashboard/gas-station.html`

**Changes needed:**
- Show current gas tank balance
- Show refuel history (backend already has endpoint)
- Add "Add Funds" flow (for testnet: show deposit address)

```javascript
async function loadGasStation() {
  const project = await ProjectSwitcher.getCurrentProject();

  // Get balance
  const balance = await api.getGasTankBalance(project.id);
  displayBalance(balance);

  // Get refuel history
  const history = await api.getRefuelHistory(project.id);
  displayRefuelHistory(history);
}

function showDepositAddress() {
  const project = await ProjectSwitcher.getCurrentProject();

  // For testnet: Show project's deposit address
  // TODO: Backend needs to generate/store deposit address per project
  // For now, show instructions
  alert(`
    To fund your gas tank:

    1. Get testnet S tokens from Sonic faucet
    2. Send to project deposit address: [ADDRESS]
    3. Balance will update automatically

    (Deposit address feature coming soon)
  `);
}
```

#### 3.3 Allowlist Page
**File:** `frontend/dashboard/allowlist.html`

**Changes needed:**
- Load allowlist for current project (already works)
- Add/remove entries (already works)
- Just need to add project switcher

```javascript
async function loadAllowlist() {
  const project = await ProjectSwitcher.getCurrentProject();
  const entries = await api.getAllowlist(project.id);

  // Existing code works
  renderAllowlistTable(entries);
}
```

#### 3.4 Transactions Page
**File:** `frontend/dashboard/transactions.html`

**Changes needed:**
- Load transactions for current project
- Show gas estimation accuracy
- Link to Sonic explorer

```javascript
async function loadTransactions() {
  const project = await ProjectSwitcher.getCurrentProject();
  const events = await api.getAnalyticsEvents(project.id, { limit: 50 });

  // Render table with Sonic explorer links
  renderTransactionsTable(events.events);
}

function renderTransactionsTable(events) {
  const tbody = document.getElementById('transactions-tbody');
  tbody.innerHTML = events.map(event => `
    <tr>
      <td>${new Date(event.created_at).toLocaleString()}</td>
      <td>${event.sender.substring(0, 8)}...</td>
      <td>${event.target.substring(0, 8)}...</td>
      <td>${event.status}</td>
      <td>${event.estimated_gas}</td>
      <td>${event.actual_gas || 'Pending'}</td>
      <td>
        ${event.user_op_hash ? `
          <a href="https://testnet.sonicscan.org/tx/${event.user_op_hash}" target="_blank">
            View
          </a>
        ` : 'N/A'}
      </td>
    </tr>
  `).join('');
}
```

---

### Step 4: Test End-to-End (30 minutes)

#### 4.1 Local Testing Checklist

**Start backend:**
```bash
cd backend && npm run dev
```

**Serve frontend:**
```bash
cd frontend/dashboard && python3 -m http.server 8081
```

**Test flow:**
1. ✅ Visit http://localhost:8081 → Redirected to login
2. ✅ Login with demo@sorted.fund / demo123
3. ✅ Dashboard loads with project selector
4. ✅ Can see gas tank balance (if test-game has balance)
5. ✅ Can generate API key
6. ✅ Can view allowlist
7. ✅ Can view transactions
8. ✅ Logout works

#### 4.2 Production Testing Checklist

**Deploy frontend to Vercel:**
```bash
cd frontend/dashboard
vercel --prod
```

**Test flow:**
1. ✅ Visit Vercel URL → Redirected to login
2. ✅ Login with demo@sorted.fund / demo123
3. ✅ No CORS errors (check browser console)
4. ✅ API calls work (check Network tab)
5. ✅ Session persists across page refreshes
6. ✅ Session expires after 7 days

---

### Step 5: Deploy Frontend (15 minutes)

#### 5.1 Configure Vercel

**File:** `frontend/dashboard/vercel.json`

```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "redirects": [
    {
      "source": "/",
      "destination": "/index.html",
      "permanent": false
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

#### 5.2 Deploy
```bash
cd frontend/dashboard
vercel --prod
```

**Update Render CORS:**
Add new Vercel URL to `ALLOWED_ORIGINS` in Render dashboard:
```
https://*.vercel.app,http://localhost:8081
```

---

## File Checklist

### New Files to Create (7 files)

1. ✅ `frontend/dashboard/login.html` - Login/register page
2. ✅ `frontend/dashboard/assets/js/auth.js` - Authentication utilities
3. ✅ `frontend/dashboard/assets/js/projectSwitcher.js` - Project management
4. ✅ `frontend/dashboard/vercel.json` - Vercel config
5. ✅ `PHASE-6-FRONTEND-INTEGRATION.md` - This plan

### Files to Modify (9 files)

1. ✅ `frontend/dashboard/assets/js/api.js` - Add session token injection
2. ✅ `frontend/dashboard/index.html` - Add auth check, project switcher, gas balance
3. ✅ `frontend/dashboard/access-keys.html` - Add auth check, project switcher
4. ✅ `frontend/dashboard/gas-station.html` - Add auth check, project switcher, real balance
5. ✅ `frontend/dashboard/allowlist.html` - Add auth check, project switcher
6. ✅ `frontend/dashboard/transactions.html` - Add auth check, project switcher, Sonic links
7. ✅ `frontend/dashboard/live-demo.html` - Add auth check (optional - or keep public)
8. ✅ `frontend/dashboard/add-funds.html` - Add auth check, deposit address instructions
9. ✅ `frontend/dashboard/simple-test.html` - Add auth check (optional - or keep public)

---

## Backend Changes Needed (Optional)

### Add Deposit Address Generation

**File:** `backend/src/routes/projects.ts`

```typescript
// GET /projects/:id/deposit-address
router.get('/:id/deposit-address', authenticateApiKey, async (req, res) => {
  const { id } = req.params;

  // For MVP: Generate deterministic address from project ID
  // For production: Use proper wallet derivation

  const depositAddress = ethers.Wallet.createRandom().address; // Placeholder

  res.json({
    projectId: id,
    depositAddress,
    network: 'Sonic Testnet',
    chainId: 14601,
    warning: 'Only send testnet S tokens to this address'
  });
});
```

**OR** simpler approach: Use a single shared deposit address and manual refuel endpoint:

```typescript
// POST /projects/:id/refuel (already exists!)
// Just call this endpoint manually when developer sends funds
```

---

## Timeline

**Total: 3-4 hours**

1. **Authentication Layer** (1 hour)
   - Create login page
   - Create auth.js utility
   - Update API client
   - Add auth checks to pages

2. **Project Management** (1.5 hours)
   - Create project switcher component
   - Add to all pages
   - Update overview with real gas balance

3. **Update Existing Pages** (1 hour)
   - Access Keys page
   - Gas Station page
   - Allowlist page
   - Transactions page

4. **Testing & Deploy** (30-45 minutes)
   - Local testing
   - Deploy to Vercel
   - Production testing

---

## Success Criteria

✅ Developer can login with demo@sorted.fund
✅ Dashboard shows real gas tank balance (not demo data)
✅ Can switch between projects (if multiple exist)
✅ Can create new projects
✅ Can generate API keys
✅ Can view transactions on Sonic explorer
✅ Session persists across page reloads
✅ CORS works with production backend
✅ No console errors in browser

---

## Next Steps After Phase 6

1. **Create test project with funds** - Manually add gas to test-game project
2. **Test gasless transaction** - Use SDK with new API key
3. **Add Stripe integration** - Allow developers to buy credits with fiat (future)
4. **Add more chains** - Base, Arbitrum, Polygon support (future)
5. **Improve onboarding** - Better UX for first-time users (future)

---

## Notes

- **Keep it simple**: No fancy UI frameworks, just vanilla JS
- **Copy from dashboard-v2**: Reuse login page design
- **Focus on MVP**: Don't add features not in the plan
- **Test locally first**: Make sure everything works before deploying
- **Session security**: Use httpOnly cookies in production (future improvement)
