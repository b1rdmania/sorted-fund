# Sorted.fund Dashboard V2 - Wireframe/Skeleton

Simplified Shinami-inspired dashboard structure with production-ready layout and navigation.

## 📁 Structure

```
dashboard-v2/
├── index.html              # Landing page (hero, features, CTA)
├── gas-station.html        # Main hub (balance, metrics, activity)
├── access-keys.html        # API key management with tabs
├── allowlist.html          # Contract/function allowlist
├── add-funds.html          # Wallet connect + deposit
├── transactions.html       # History + insights tabs
├── live-demo.html          # Interactive gasless transaction demo
│
├── assets/
│   └── css/
│       └── layout.css      # Core layout (header + sidebar + content)
│
├── WIREFRAME.md            # Detailed wireframe documentation
└── README.md               # This file
```

## 🎨 Design System

### Layout
- **Header**: Fixed at top, always visible with gas tank balance
- **Sidebar**: Fixed navigation (250px wide)
- **Content**: Main scrollable area with page content

### Color Scheme (Terminal Aesthetic)
- Primary BG: `#0a0a0a`
- Secondary BG: `#000`
- Text Primary: `#00ff00` (neon green)
- Text Secondary: `#00aa00`
- Accent Cyan: `#00aaff`
- Accent Orange: `#ffaa00`

### Typography
- Font: Courier New (monospace)
- Sizes: 12px (xs) → 32px (2xl)

## 📄 Pages Overview

### 1. Landing Page (`index.html`)
- Hero section with logo and tagline
- CTA buttons (Get Started, View Demo)
- Features grid (4 cards)
- Tech stack footer

### 2. Gas Station (`gas-station.html`)
**Main dashboard hub showing:**
- Large balance panel with "Add Funds" CTA
- 3 metric cards (Total Ops, Gas Saved, Success Rate)
- Top contracts table
- Recent activity log (terminal-style)

### 3. Access Keys (`access-keys.html`)
**API key management with expandable configuration:**
- Keys table (name, status, created date)
- Expandable row with tabs:
  - Gas Station tab (QPS limit, allotment)
  - Access Control tab (domains, IPs allowlist)
- API documentation section with code examples

### 4. Allowlist (`allowlist.html`)
**Contract/function sponsorship control:**
- Info banner explaining allowlists
- Allowlist entries table
- "How to Find Function Selectors" guide with:
  - Method 1: From ABI
  - Method 2: Manual calculation
  - Common selectors table

### 5. Add Funds (`add-funds.html`)
**Wallet integration and deposits:**
- Deposit address display with copy/QR buttons
- Divider ("OR")
- MetaMask connect section with amount input
- Deposit history table
- Info note about automatic forwarding

### 6. Transactions (`transactions.html`)
**Transaction history and analytics with tabs:**
- **History tab:**
  - Filters (status, period, contract)
  - Transactions table
- **Insights tab:**
  - 4 metric cards (total, success, errors)
  - Chart placeholder (ASCII chart coming)
  - Top methods table

### 7. Live Demo (`live-demo.html`)
**Interactive demo showing gasless transaction:**
- Hero section
- "Before" state panel (user balance: 0 S, counter: 42)
- Big execute button
- Terminal log with animated output
- "After" state panel (balance still 0, counter: 43)
- Explorer link
- Explanation info box

## 🔧 What's Included

✅ **Complete HTML structure** for all 7 pages
✅ **Responsive layout CSS** (header + sidebar + content)
✅ **Terminal aesthetic styling** (colors, fonts, effects)
✅ **Navigation structure** (sidebar with active states)
✅ **Component styles** (tables, cards, buttons, forms, modals)
✅ **Placeholder content** showing the intended UX
✅ **Basic JavaScript** for tab switching and interactions

## ❌ What's NOT Included (Phase 3+)

❌ Backend API integration (no real data fetching yet)
❌ MetaMask wallet connection (placeholder only)
❌ Real-time balance updates
❌ Modal overlays (generate key, add entry, etc.)
❌ Form validation
❌ ASCII charts rendering
❌ Authentication/user management

## 🚀 How to View

1. Open any HTML file directly in browser, OR
2. Serve with a local server:

```bash
cd frontend/dashboard-v2
python3 -m http.server 8080
# Open: http://localhost:8080
```

## 📊 Key Improvements vs V1

| Aspect | V1 (Original) | V2 (Simplified) |
|--------|---------------|-----------------|
| Navigation | Scattered demos + dashboard | Unified sidebar nav |
| Project Selector | Dropdown in header | Removed (single project) |
| Balance Display | Only on overview page | Always visible in header |
| API Keys | Basic list | Expandable config with tabs |
| Demo | 3 separate demo pages | 1 integrated live demo |
| Complexity | High (8+ pages) | Streamlined (7 pages) |
| UX Inspiration | Custom | Shinami Gas Station |

## 🎯 Next Steps

### Phase 3A: Wire Up Backend APIs
- [ ] Connect to existing `/analytics` endpoints
- [ ] Connect to `/projects/:id` endpoint
- [ ] Connect to `/api-keys` endpoints
- [ ] Connect to `/allowlist` endpoints
- [ ] Implement auto-refresh (30s polling)

### Phase 3B: MetaMask Integration
- [ ] Implement wallet connection
- [ ] Generate HD wallet deposit addresses
- [ ] Send transaction to deposit address
- [ ] Display pending/confirmed states

### Phase 3C: Modals & Forms
- [ ] Create key modal with validation
- [ ] Add allowlist entry modal
- [ ] Delete confirmation modals
- [ ] Form error handling

### Phase 3D: Live Demo Backend
- [ ] Connect to real `/sponsor` endpoint
- [ ] Fetch real counter value
- [ ] Execute real gasless transaction
- [ ] Update state from on-chain data

## 💡 Design Decisions

### Why Sidebar Instead of Top Nav?
- Easier to implement (no hamburger menu logic)
- More space for navigation items
- Clearer hierarchy (sections with dividers)
- Desktop-first approach (mobile can come later)

### Why No Project Selector?
- Demo mode = single project experience
- Simplifies UX dramatically
- Can add multi-project later via account switcher
- Matches Shinami's single-project-per-page model

### Why Tabs in Pages?
- Reduces number of top-level pages
- Groups related functionality (Keys → Gas Station + Access Control)
- Matches Shinami UX pattern
- Cleaner navigation

### Why Terminal Aesthetic?
- On-brand for developer tool
- Stands out from typical SaaS dashboards
- Nostalgic/hacker vibe
- Easy to implement (no complex graphics)

## 🔗 Related Files

- `WIREFRAME.md` - Detailed ASCII wireframes of each page
- `../../backend/src/routes/analytics.ts` - Backend analytics API
- `../../backend/src/routes/sponsor.ts` - Sponsorship endpoint
- `../dashboard/` - Original V1 dashboard (for reference)

## 📝 Notes

- All placeholder data is hardcoded for wireframe purposes
- Button actions show alerts (placeholder for actual implementation)
- Terminal logs are simulated with setTimeout
- No error handling yet (Phase 3)
- No loading states yet (Phase 3)

---

**Status**: Wireframe complete ✅
**Next**: Wire up backend APIs & implement MetaMask integration
**Estimated effort**: ~40% of original plan (simplified scope)
