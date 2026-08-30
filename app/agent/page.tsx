"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowClockwise,
  ArrowRight,
  Bell,
  BracketsCurly,
  CaretDown,
  ChartLineUp,
  Check,
  CheckCircle,
  Copy,
  ClockCounterClockwise,
  Code,
  Database,
  DiscordLogo,
  Folder,
  Gear,
  GitBranch,
  House,
  Key,
  EnvelopeSimple,
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  LinkSimple,
  List,
  MagnifyingGlass,
  Play,
  Pulse,
  SignOut,
  SlidersHorizontal,
  Sparkle,
  TiktokLogo,
  UsersThree,
  WarningCircle,
  X,
  XLogo,
} from "@phosphor-icons/react";
import { GitHubWorkspace } from "@/app/components/github-workspace";
import { GitHubScanHistory } from "@/app/components/github-scan-history";
import { SecuritySettings } from "@/app/components/security-settings";
import { SecurityAssessmentPanel } from "@/app/components/security-assessment-panel";
import type { SecurityAssessment } from "@/lib/security-assessment";

type View = "overview" | "monitor" | "findings" | "projects" | "runs" | "connections" | "insights" | "activity" | "settings" | "contact";
type SettingsTab = "general" | "appearance" | "account" | "connectors" | "security";
type Appearance = { theme: "light" | "dim"; accent: "indigo" | "cyan" | "emerald"; density: "comfortable" | "compact"; reducedMotion: boolean };
type Account = { id: string; email: string; displayName: string };

const viewRoutes: Record<View, string> = { overview: "home", monitor: "monitor", findings: "findings", projects: "projects", runs: "agent-runs", connections: "connections", insights: "insights", activity: "activity", settings: "settings", contact: "contact" };
const routeViews: Record<string, View> = Object.fromEntries(Object.entries(viewRoutes).map(([view, route]) => [route, view])) as Record<string, View>;

const findings = [
  { severity: "Critical", title: "Service key exposed to the browser", short: "Private Supabase credential found in client code", file: "src/lib/supabase-client.ts", line: "Line 8", confidence: 99, category: "Secrets", impact: "Anyone who receives the browser bundle could recover a privileged database key and bypass the access rules meant for normal users.", evidence: "SUPABASE_SERVICE_ROLE_KEY is referenced inside a module imported by a client component.", fix: "Move the key into server-only environment storage, keep the browser on the public anon key, and verify Row Level Security before the next deploy." },
  { severity: "High", title: "Private action runs in a client component", short: "Sensitive account operation crosses the server boundary", file: "components/payment-settings.tsx", line: "Line 41", confidence: 96, category: "Boundaries", impact: "Private logic and configuration can become visible or callable from the browser when a component is marked for client execution.", evidence: "A billing configuration value is read directly inside a use client component.", fix: "Move the sensitive operation behind an authenticated server route and return only the safe fields required by the interface." },
  { severity: "Review", title: "Admin route lacks role enforcement", short: "Signed-in users may reach an admin-only response", file: "app/api/admin/users/route.ts", line: "Line 17", confidence: 88, category: "Access", impact: "Authentication proves who the user is. It does not prove that the user is allowed to list or change other accounts.", evidence: "The route checks for a session but no admin role, workspace role, or permission is required.", fix: "Require an admin role on the server before returning data, deny by default, and log failed privileged access attempts." },
  { severity: "Review", title: "Broad select policy needs confirmation", short: "Database rule may expose rows across workspaces", file: "supabase/migrations/014_profiles.sql", line: "Line 26", confidence: 81, category: "Database", impact: "A broad read rule can reveal records from another customer or workspace even when the interface only displays the current user.", evidence: "The policy allows SELECT when authenticated but does not visibly scope rows to user_id or workspace_id.", fix: "Confirm the intended audience, scope the policy to the owning user or workspace, then test with a second account." },
  { severity: "Low", title: "Unbounded AI call has no usage cap", short: "A public action can trigger variable model spend", file: "app/api/generate/route.ts", line: "Line 32", confidence: 74, category: "Costs", impact: "Repeated calls may create unexpected model charges if the route is public or lacks per-user limits.", evidence: "The generation route has no visible rate limit, token cap, or authenticated usage allowance.", fix: "Add authentication, a bounded token limit, and a per-user or per-workspace allowance before opening the route publicly." },
];

const projects = [
  { name: "Unsafe Store Demo", stack: "Next.js · Supabase · Stripe", status: "Needs review", score: 72, findings: 5, last: "Just now" },
  { name: "Client Portal Demo", stack: "Next.js · Clerk · Postgres", status: "Ready", score: 94, findings: 1, last: "Yesterday" },
  { name: "AI Notes Demo", stack: "React · OpenAI · Firebase", status: "Not scanned", score: null, findings: 0, last: "Never" },
];

const navGroups: { label: string; items: { id: View; label: string; icon: typeof House }[] }[] = [
  { label: "Review", items: [{ id: "overview", label: "Home", icon: House }, { id: "monitor", label: "API monitor", icon: BracketsCurly }, { id: "findings", label: "Findings", icon: WarningCircle }, { id: "projects", label: "Projects", icon: Folder }, { id: "runs", label: "Agent runs", icon: Pulse }] },
  { label: "Control", items: [{ id: "connections", label: "Connections", icon: LinkSimple }, { id: "insights", label: "Insights", icon: ChartLineUp }] },
  { label: "Manage", items: [{ id: "activity", label: "Activity", icon: ClockCounterClockwise }, { id: "settings", label: "Settings", icon: Gear }, { id: "contact", label: "Contact", icon: EnvelopeSimple }] },
];

const viewMeta: Record<View, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "OPERATOR HOME", title: "Welcome back, Demo.", description: "Pallos is watching the parts of your AI-built app that deserve a second look." },
  monitor: { eyebrow: "API MONITOR", title: "Know when a response contract breaks.", description: "Capture a healthy baseline, run a manual check, and see exactly what changed." },
  findings: { eyebrow: "REVIEW QUEUE", title: "Findings with evidence.", description: "See what Pallos found, why it matters, and the next step to verify." },
  projects: { eyebrow: "PROJECTS", title: "Apps under review.", description: "Keep each build, scan history, and launch state in one place." },
  runs: { eyebrow: "AGENT RUNS", title: "Every scan, accounted for.", description: "Track what was checked, what changed, and which findings remain open." },
  connections: { eyebrow: "CONNECTIONS", title: "Bring the right context together.", description: "Connect only the services Pallos needs for the review you choose." },
  insights: { eyebrow: "INSIGHTS", title: "Patterns across your builds.", description: "Understand where risk repeats and which fixes are improving launch readiness." },
  activity: { eyebrow: "ACTIVITY", title: "A clear record of decisions.", description: "See scans, reviews, status changes, and sandbox actions in order." },
  settings: { eyebrow: "SETTINGS", title: "Workspace controls.", description: "Choose how the sandbox behaves and what the future live product should protect." },
  contact: { eyebrow: "CONTACT", title: "Talk to the Pallos team.", description: "Questions, feedback, and social accounts in one clear place." },
};

export default function Agent() {
  const router = useRouter();
  const [view, setView] = useState<View>("overview");
  const [selectedFinding, setSelectedFinding] = useState(0);
  const [selectedProject, setSelectedProject] = useState(projects[0].name);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState("Today, 11:42 AM");
  const [query, setQuery] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [connected, setConnected] = useState<Record<string, boolean>>({ GitHub: false, Supabase: true, Vercel: false, Stripe: false });
  const [toast, setToast] = useState("Sandbox ready. All workspace data is illustrative.");
  const [workspaceMenu, setWorkspaceMenu] = useState(false);
  const [profileMenu, setProfileMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
  const [appearance, setAppearance] = useState<Appearance>({ theme: "light", accent: "indigo", density: "comfortable", reducedMotion: false });
  const [account, setAccount] = useState<Account | null>(null);

  const filteredFindings = useMemo(() => findings.filter((finding) => `${finding.title} ${finding.file} ${finding.category}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const currentFinding = findings[selectedFinding];
  const meta = viewMeta[view];

  useEffect(() => {
    const syncRoute = () => {
      const route = window.location.pathname.split("/").filter(Boolean)[0] || "home";
      setView(routeViews[route] || "overview");
    };
    syncRoute();
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" }).then(async (response) => ({ response, data: await response.json() })).then(({ response, data }) => {
      if (!active) return;
      if (response.status === 401) { router.replace("/login"); return; }
      if (!response.ok) throw new Error(data.error || "Could not load your account.");
      setAccount(data.user as Account);
    }).catch((caught) => { if (active) setToast(caught instanceof Error ? caught.message : "Could not load your account."); });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    const saved = window.localStorage.getItem("pallos-appearance");
    if (!saved) return;
    const restore = window.setTimeout(() => {
      try { setAppearance(JSON.parse(saved) as Appearance); } catch { /* Ignore an invalid local preference. */ }
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  function updateAppearance(next: Appearance) {
    setAppearance(next);
    window.localStorage.setItem("pallos-appearance", JSON.stringify(next));
    setToast("Appearance updated on this device.");
  }

  function openView(next: View) {
    setView(next);
    setMobileNav(false);
    setQuery("");
    setWorkspaceMenu(false);
    setProfileMenu(false);
    window.history.pushState({}, "", `/${viewRoutes[next]}`);
    window.scrollTo(0, 0);
  }

  function openSettings(nextTab: SettingsTab) {
    setSettingsTab(nextTab);
    openView("settings");
  }

  async function copyFindingPrompt() {
    const prompt = `Review ${currentFinding.file} for: ${currentFinding.title}. ${currentFinding.fix} Keep the change minimal, explain the evidence, and include steps to verify the fix.`;
    await navigator.clipboard.writeText(prompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 1600);
  }

  function runScan() {
    if (running) return;
    setRunning(true);
    setToast("Pallos is reviewing the demo project…");
    setTimeout(() => {
      setRunning(false);
      setLastRun("Just now");
      openView("findings");
      setToast("Demo scan complete: 5 findings are ready for review.");
    }, 1100);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const accountInitial = (account?.displayName || account?.email || "P").charAt(0).toUpperCase();

  return (
    <main className={`agent-app theme-${appearance.theme} accent-${appearance.accent} density-${appearance.density} ${appearance.reducedMotion ? "reduce-motion" : ""}`}>
      <aside className={`agent-side ${mobileNav ? "mobile-open" : ""}`}>
        <div className="agent-side-head"><button className="agent-brand" onClick={() => openView("overview")}><span className="agent-brand-dot" />Pallos Agent</button><button className="close-mobile" aria-label="Close navigation" onClick={() => setMobileNav(false)}><X /></button></div>
        <div className="workspace-menu-wrap"><button className="workspace-switcher" aria-expanded={workspaceMenu} onClick={() => setWorkspaceMenu((open) => !open)}><span>PA</span><div><strong>Pallos Sandbox</strong><small>Development workspace</small></div><CaretDown className={workspaceMenu ? "rotated" : ""} /></button>{workspaceMenu && <div className="side-popover workspace-popover"><span>CURRENT WORKSPACE</span><button onClick={() => setWorkspaceMenu(false)}><b>PA</b><div><strong>Pallos Sandbox</strong><small>Active demo workspace</small></div><Check /></button><button onClick={() => openSettings("general")}><Gear /><div><strong>Workspace settings</strong><small>Review demo controls</small></div><ArrowRight /></button></div>}</div>
        <nav className="workspace-nav" aria-label="Workspace navigation">
          {navGroups.map((group) => <div className="nav-group" key={group.label}><p>{group.label}</p>{group.items.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "active" : ""} onClick={() => openView(id)}><Icon weight={view === id ? "fill" : "regular"} /><span>{label}</span>{id === "findings" && <em>5</em>}</button>)}</div>)}
        </nav>
        <div className="profile-menu-wrap"><button className="demo-profile" aria-expanded={profileMenu} onClick={() => setProfileMenu((open) => !open)}><span>{accountInitial}</span><div><strong>{account?.displayName || "Loading account"}</strong><small>{account?.email || "Secure session"}</small></div><CaretDown className={profileMenu ? "rotated" : ""} /></button>{profileMenu && <div className="side-popover profile-popover"><button onClick={() => openSettings("account")}><Gear />Account settings</button><button onClick={() => openView("contact")}><EnvelopeSimple />Contact Pallos</button><button onClick={logout}><SignOut />Log out</button></div>}</div>
      </aside>

      <section className="agent-main">
        <header className="agent-header">
          <button className="open-mobile" aria-label="Open navigation" onClick={() => setMobileNav(true)}><List /></button>
          <div className="agent-breadcrumb"><small>Pallos Sandbox</small><strong>{view === "overview" ? "Home" : viewMeta[view].eyebrow.replace("REVIEW QUEUE", "Findings")}</strong></div>
          <label className="agent-search"><MagnifyingGlass /><input value={query} onFocus={() => { if (view !== "findings") openView("findings"); }} onChange={(event) => setQuery(event.target.value)} placeholder="Search findings or files" /></label>
          <div className="notification-wrap"><button className="icon-button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}><Bell /></button>{notificationsOpen && <div className="notification-panel"><div><span>NOTIFICATIONS</span><button aria-label="Close notifications" onClick={() => setNotificationsOpen(false)}><X /></button></div><CheckCircle weight="fill" /><strong>You&apos;re all caught up.</strong><p>No new sandbox notifications. Completed demo runs will appear here.</p></div>}</div>
          <button className="run-button" onClick={runScan} disabled={running}>{running ? <ArrowClockwise className="spin" /> : <Play weight="fill" />}{running ? "Scanning…" : "Run agent"}</button>
          <button className="login-button" onClick={logout}><SignOut />Log out</button>
        </header>

        <div className="agent-content">
          <div className="view-heading"><div><span>{meta.eyebrow}</span><h1>{meta.title}</h1><p>{meta.description}</p></div>{(["findings", "projects"] as View[]).includes(view) && <button className="secondary-action" onClick={runScan}><ArrowClockwise />Run demo scan</button>}</div>
          <div className="demo-notice"><b>{view === "monitor" ? "LIVE MONITOR" : view === "runs" || view === "activity" ? "LIVE HISTORY" : "DEMO DATA"}</b><span>{view === "monitor" ? "Checks make real server-side requests. Monitor history requires the connected Supabase database." : view === "runs" || view === "activity" ? "These records come from real manual and automatic GitHub scans saved in Supabase." : "This sandbox is interactive, but no live repository or service is being scanned."}</span></div>

          {view === "overview" && <Overview runScan={runScan} running={running} lastRun={lastRun} openView={openView} selectFinding={(index) => { setSelectedFinding(index); openView("findings"); }} />}
          {view === "monitor" && <MonitorView notify={setToast} />}
          {view === "findings" && <><GitHubWorkspace mode="findings" notify={setToast} /><div className="demo-divider"><span>DEMO FINDINGS</span></div><FindingsView items={filteredFindings} selected={currentFinding} select={(finding) => setSelectedFinding(findings.indexOf(finding))} query={query} setQuery={setQuery} preparePrompt={() => setPromptOpen(true)} queueVerification={runScan} /></>}
          {view === "projects" && <><GitHubWorkspace mode="projects" notify={setToast} /><div className="demo-divider"><span>DEMO PROJECTS</span></div><ProjectsView selected={selectedProject} setSelected={setSelectedProject} runScan={runScan} /></>}
          {view === "runs" && <GitHubScanHistory mode="runs" notify={setToast} openConnections={() => openView("connections")} />}
          {view === "connections" && <><GitHubWorkspace notify={setToast} /><div className="demo-divider"><span>OTHER CONNECTORS</span></div><ConnectionsView connected={connected} toggle={(name) => { setConnected((state) => ({ ...state, [name]: !state[name] })); setToast(`${name} sandbox connection updated.`); }} /></>}
          {view === "insights" && <InsightsView />}
          {view === "activity" && <GitHubScanHistory mode="activity" notify={setToast} openConnections={() => openView("connections")} />}
          {view === "settings" && <SettingsView notify={setToast} tab={settingsTab} setTab={setSettingsTab} appearance={appearance} updateAppearance={updateAppearance} connected={connected} toggleConnector={(name) => { setConnected((state) => ({ ...state, [name]: !state[name] })); setToast(`${name} sandbox connection updated.`); }} account={account} setAccount={setAccount} logout={logout} />}
          {view === "contact" && <><TesterFeedback notify={setToast} /><ContactView /></>}
        </div>
        <div className="agent-toast" role="status"><span className="status-light" />{toast}</div>
      </section>
      {promptOpen && <div className="agent-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPromptOpen(false); }}><section className="agent-prompt-modal" role="dialog" aria-modal="true" aria-labelledby="agent-prompt-title"><button className="agent-modal-close" aria-label="Close prompt" onClick={() => setPromptOpen(false)}><X /></button><span>FIX PROMPT</span><h2 id="agent-prompt-title">Ready for your coding assistant.</h2><p>Review the proposed change before applying it, then run Pallos again to verify the finding.</p><pre>{`Review ${currentFinding.file} for: ${currentFinding.title}. ${currentFinding.fix} Keep the change minimal, explain the evidence, and include steps to verify the fix.`}</pre><div><button className="run-button" onClick={copyFindingPrompt}>{promptCopied ? <><Check />Copied</> : <><Copy />Copy prompt</>}</button><button className="outline-action" onClick={() => { setPromptOpen(false); runScan(); }}>Queue verification</button></div></section></div>}
    </main>
  );
}

function Overview({ runScan, running, lastRun, openView, selectFinding }: { runScan: () => void; running: boolean; lastRun: string; openView: (view: View) => void; selectFinding: (index: number) => void }) {
  return <>
    <section className="start-here-card"><div><span>START HERE</span><h2>See the full Pallos workflow in three minutes.</h2><p>This sandbox uses a deliberately vulnerable sample app so you can explore safely before connecting anything real.</p></div><ol><li><b>1</b><span><strong>Run the agent</strong>Scan the demo project.</span></li><li><b>2</b><span><strong>Review evidence</strong>Open a finding and its file.</span></li><li><b>3</b><span><strong>Prepare and verify</strong>Copy a fix prompt, then rescan.</span></li></ol><button className="run-button" onClick={runScan} disabled={running}>{running ? <ArrowClockwise className="spin" /> : <Play weight="fill" />}{running ? "Scanning demo…" : "Start demo scan"}</button></section>
    <section className="overview-status">
      <div><span><i className="status-light" />WORKSPACE READY</span><strong>API monitoring is active</strong></div>
      <div><span>LAST AGENT RUN</span><strong>{lastRun}</strong></div>
      <div><span>REVIEW POLICY</span><strong>Human approval required</strong></div>
      <button onClick={() => openView("runs")}>View runs <ArrowRight /></button>
    </section>
    <section className="metric-grid">
      <Metric icon={WarningCircle} label="Needs review" value="5" note="Open findings across one app" tone="blue" />
      <Metric icon={Key} label="Critical path" value="1" note="Fix before public launch" tone="red" />
      <Metric icon={ChartLineUp} label="Launch score" value="72" note="Demo readiness out of 100" tone="gold" />
      <Metric icon={Check} label="Verified fixes" value="3" note="Cleared by a later rescan" tone="green" />
    </section>
    <section className="home-grid">
      <div className="workspace-card queue-card">
        <div className="card-head"><div><span>PRIORITY QUEUE</span><h2>Needs attention</h2></div><button onClick={() => openView("findings")}>View all <ArrowRight /></button></div>
        <div className="queue-list">{findings.slice(0, 4).map((finding, index) => <button key={finding.title} onClick={() => selectFinding(index)}><div className={`finding-mark ${finding.severity.toLowerCase()}`}><WarningCircle weight="fill" /></div><div><strong>{finding.title}</strong><small>{finding.file}</small></div><span>{finding.confidence}% match</span><ArrowRight /></button>)}</div>
      </div>
      <div className="workspace-card health-card">
        <div className="card-head"><div><span>SYSTEM</span><h2>Agent health</h2></div><button onClick={() => openView("connections")}>Manage <ArrowRight /></button></div>
        <StatusRow icon={GitBranch} title="GitHub repository" status="Connect when ready" />
        <StatusRow icon={Database} title="Supabase project" status="Available" />
        <StatusRow icon={SlidersHorizontal} title="Review controls" status="Protected" />
        <StatusRow icon={Sparkle} title="AI allowance" status="0% used" />
      </div>
      <div className="workspace-card coverage-card">
        <div className="card-head"><div><span>COVERAGE</span><h2>Active checks</h2></div><button onClick={() => openView("settings")}>Configure <ArrowRight /></button></div>
        <div className="coverage-table"><div className="table-head"><span>Check</span><span>Status</span><span>Scope</span><span>Last run</span></div>{[["Secret exposure","Active","14 files",lastRun],["Database access","Active","4 policies",lastRun],["Admin routes","Active","7 routes",lastRun],["Client boundaries","Active","22 modules",lastRun],["Usage guardrails","Preview","3 services",lastRun]].map((row) => <div className="table-row" key={row[0]}><strong>{row[0]}</strong><span><i className="status-light" />{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span></div>)}</div>
      </div>
      <div className="workspace-card quick-scan"><span>READY WHEN YOU ARE</span><h2>Run another pass after your latest AI changes.</h2><p>The sandbox will refresh its sample findings and add a new entry to Agent runs.</p><button className="run-button large" onClick={runScan} disabled={running}>{running ? <ArrowClockwise className="spin" /> : <Play weight="fill" />}{running ? "Scanning demo…" : "Run agent now"}</button></div>
    </section>
  </>;
}

function Metric({ icon: Icon, label, value, note, tone }: { icon: typeof House; label: string; value: string; note: string; tone: string }) { return <article className={`metric-card ${tone}`}><div><Icon /><span>{label}</span></div><strong>{value}</strong><p>{note}</p></article>; }
function StatusRow({ icon: Icon, title, status }: { icon: typeof House; title: string; status: string }) { return <div className="status-row"><span><Icon /></span><strong>{title}</strong><em>{status}</em></div>; }

function FindingsView({ items, selected, select, query, setQuery, preparePrompt, queueVerification }: { items: typeof findings; selected: typeof findings[number]; select: (finding: typeof findings[number]) => void; query: string; setQuery: (value: string) => void; preparePrompt: () => void; queueVerification: () => void }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [severity, setSeverity] = useState("All");
  const visibleItems = severity === "All" ? items : items.filter((finding) => finding.severity === severity);
  return <div className="findings-layout">
    <div className="workspace-card finding-queue"><div className="queue-toolbar"><label><MagnifyingGlass /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter the queue" /></label><div className="filter-wrap"><button aria-expanded={filterOpen} onClick={() => setFilterOpen((open) => !open)}><SlidersHorizontal />{severity === "All" ? "Filter" : severity}<CaretDown /></button>{filterOpen && <div className="filter-menu">{["All", "Critical", "High", "Review", "Low"].map((option) => <button className={severity === option ? "active" : ""} key={option} onClick={() => { setSeverity(option); setFilterOpen(false); }}>{option}{severity === option && <Check />}</button>)}</div>}</div></div><div className="finding-count">{visibleItems.length} {visibleItems.length === 1 ? "finding" : "findings"} shown</div>{visibleItems.map((finding) => <button key={finding.title} className={selected.title === finding.title ? "selected" : ""} onClick={() => select(finding)}><span className={`severity-bar ${finding.severity.toLowerCase()}`} /><div><small>{finding.severity} · {finding.category}</small><strong>{finding.title}</strong><em>{finding.file}</em></div><b>{finding.confidence}%</b></button>)}{visibleItems.length === 0 && <div className="empty-search"><MagnifyingGlass /><h3>No matching findings</h3><p>Try another severity, title, file name, or category.</p></div>}</div>
    <div className="workspace-card finding-detail"><div className="detail-header"><span className={`detail-severity ${selected.severity.toLowerCase()}`}>{selected.severity}</span><span>{selected.confidence}% confidence</span></div><h2>{selected.title}</h2><p className="finding-short">{selected.short}</p><div className="file-ref"><Code /><div><strong>{selected.file}</strong><small>{selected.line}</small></div></div><Detail title="Why this matters" body={selected.impact} /><Detail title="Evidence from the scan" body={selected.evidence} /><Detail title="Suggested next step" body={selected.fix} /><div className="detail-actions"><button className="run-button" onClick={preparePrompt}>Prepare fix prompt</button><button className="outline-action" onClick={queueVerification}>Queue verification</button></div></div>
  </div>;
}
function Detail({ title, body }: { title: string; body: string }) { return <div className="detail-section"><span>{title}</span><p>{body}</p></div>; }

function ProjectsView({ selected, setSelected, runScan }: { selected: string; setSelected: (name: string) => void; runScan: () => void }) { return <div className="project-view"><div className="view-toolbar"><div><strong>3 demo projects</strong><span>One project is selected for the next agent run.</span></div><button className="run-button" onClick={runScan}><Play weight="fill" />Scan selected</button></div><div className="project-grid">{projects.map((project) => <button key={project.name} className={`project-card ${selected === project.name ? "selected" : ""}`} onClick={() => setSelected(project.name)}><div className="project-card-top"><span><BracketsCurly /></span><em>{project.status}</em></div><h2>{project.name}</h2><p>{project.stack}</p><div className="project-data"><div><small>Score</small><strong>{project.score ?? "—"}</strong></div><div><small>Findings</small><strong>{project.findings}</strong></div><div><small>Last scan</small><strong>{project.last}</strong></div></div>{selected === project.name && <span className="selected-label"><Check weight="bold" />Selected</span>}</button>)}</div></div>; }

type SavedChange = { kind: string; path: string; expected: string | null; actual: string | null; serious: boolean };
type SavedCheck = { id: string; requested_url: string; status_code: number | null; response_ms: number; outcome: "baseline" | "healthy" | "changed" | "error"; serious: boolean; changes: SavedChange[]; assessment: SecurityAssessment | null; error_message: string | null; checked_at: string };
type SavedIncident = { id: string; title: string; severity: "high" | "critical"; status: "open" | "resolved"; summary: string; created_at: string; resolved_at: string | null };
type SavedMonitor = { id: string; name: string; url: string; baseline_status: number; last_status_code: number | null; last_result: string; last_checked_at: string | null; created_at: string; is_demo: boolean; has_auth_headers?: boolean; schedule_frequency: "manual" | "hourly" | "six_hours" | "daily"; next_check_at: string | null; email_alerts: boolean; checks: SavedCheck[]; incidents: SavedIncident[] };

function MonitorView({ notify }: { notify: (value: string) => void }) {
  const router = useRouter();
  const healthyUrl = "https://pallosagent.com/api/training/profile";
  const brokenUrl = "https://pallosagent.com/api/training/profile?fault=1";
  const [monitors, setMonitors] = useState<SavedMonitor[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkUrls, setCheckUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [managingId, setManagingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [resultNotice, setResultNotice] = useState("");
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);

  async function runGuidedDemo() {
    setDemoRunning(true); setError(""); setResultNotice("");
    try {
      const response = await fetch("/api/tester/demo", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The guided demo could not run.");
      setResultNotice(`Guided test complete: Pallos caught ${data.changes.length} contract changes and opened an incident.`);
      await loadMonitors(); setSelectedId(data.monitorId);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The guided demo could not run."); }
    finally { setDemoRunning(false); }
  }

  async function loadMonitors(showLoading = false) {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch("/api/monitors", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 401) { router.replace("/login"); return; }
      if (!response.ok) throw Object.assign(new Error(data.error || "Could not load monitors."), { setupRequired: data.setupRequired });
      const next = data.monitors as SavedMonitor[];
      setMonitors(next);
      setEmailConfigured(Boolean(data.emailConfigured));
      setSetupRequired(false);
      setError("");
      setSelectedId((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id || null);
      setCheckUrls((current) => Object.fromEntries(next.map((item) => [item.id, current[item.id] || item.url])));
    } catch (caught) {
      const failure = caught as Error & { setupRequired?: boolean };
      setError(failure.message);
      setSetupRequired(Boolean(failure.setupRequired));
    } finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/monitors", { cache: "no-store" }).then(async (response) => ({ response, data: await response.json() })).then(({ response, data }) => {
      if (!active) return;
      if (response.status === 401) { router.replace("/login"); return; }
      if (!response.ok) throw Object.assign(new Error(data.error || "Could not load monitors."), { setupRequired: data.setupRequired });
      const next = data.monitors as SavedMonitor[];
      setMonitors(next);
      setEmailConfigured(Boolean(data.emailConfigured));
      setSelectedId(next[0]?.id || null);
      setCheckUrls(Object.fromEntries(next.map((item) => [item.id, item.url])));
    }).catch((caught: Error & { setupRequired?: boolean }) => {
      if (!active) return;
      setError(caught.message);
      setSetupRequired(Boolean(caught.setupRequired));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router]);

  async function createMonitor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setCreating(true);
    setError("");
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/monitors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), url: form.get("url") }) });
      const data = await response.json();
      if (!response.ok) throw Object.assign(new Error(data.error || "Could not create monitor."), { setupRequired: data.setupRequired });
      notify("Baseline captured and monitor created.");
      await loadMonitors();
      setSelectedId(data.monitor.id);
    } catch (caught) {
      const failure = caught as Error & { setupRequired?: boolean };
      setError(failure.message);
      setSetupRequired(Boolean(failure.setupRequired));
    } finally { setCreating(false); }
  }

  async function runCheck(monitor: SavedMonitor, requestedUrl?: string) {
    const checkUrl = requestedUrl || checkUrls[monitor.id] || monitor.url;
    if (requestedUrl) setCheckUrls((current) => ({ ...current, [monitor.id]: requestedUrl }));
    setCheckingId(monitor.id);
    setError("");
    setResultNotice("");
    try {
      const response = await fetch(`/api/monitors/${monitor.id}/check`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checkUrl }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The check failed.");
      const message = data.incidentCreated
        ? `Broken response confirmed: ${data.check.changes.length} contract changes detected and a ${data.incident.severity}-severity incident was opened.`
        : data.check.serious
          ? `Serious response change confirmed: ${data.check.changes.length} changes were saved to the existing open incident.`
        : data.check.outcome === "changed"
          ? `Response changed: ${data.check.changes.length} non-serious changes were saved.`
          : "Check complete: the response contract matches the baseline.";
      setResultNotice(message);
      notify(message);
      await loadMonitors();
      window.setTimeout(() => document.getElementById("monitor-check-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The check failed.";
      setError(message);
      setResultNotice("");
    }
    finally { setCheckingId(null); }
  }

  async function editMonitor(monitor: SavedMonitor) {
    const name = window.prompt("Monitor name", monitor.name);
    if (name === null) return;
    const url = window.prompt("API URL (changing it captures a new baseline)", monitor.url);
    if (url === null) return;
    setManagingId(monitor.id);
    try {
      const response = await fetch(`/api/monitors/${monitor.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, url }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update the monitor.");
      notify("Monitor updated.");
      await loadMonitors();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update the monitor."); }
    finally { setManagingId(null); }
  }

  function updateMonitorAuth(_monitor?: SavedMonitor) {
    void _monitor;
    notify("Private API authentication is disabled during the tester beta. Use a public or staging JSON endpoint.");
  }

  async function deleteMonitor(monitor: SavedMonitor) {
    if (!window.confirm(`Delete ${monitor.name} and all of its checks and incidents?`)) return;
    setManagingId(monitor.id);
    try {
      const response = await fetch(`/api/monitors/${monitor.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete the monitor.");
      notify("Monitor deleted.");
      await loadMonitors();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not delete the monitor."); }
    finally { setManagingId(null); }
  }

  async function setIncidentStatus(incident: SavedIncident) {
    try {
      const status = incident.status === "open" ? "resolved" : "open";
      const response = await fetch(`/api/incidents/${incident.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update the incident.");
      notify(status === "resolved" ? "Incident resolved." : "Incident reopened.");
      await loadMonitors();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update the incident."); }
  }

  async function updateSchedule(monitor: SavedMonitor, scheduleFrequency: SavedMonitor["schedule_frequency"], emailAlerts = monitor.email_alerts) {
    setManagingId(monitor.id);
    setError("");
    try {
      const response = await fetch(`/api/monitors/${monitor.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scheduleFrequency, emailAlerts }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update automatic monitoring.");
      notify(scheduleFrequency === "manual" ? "Automatic checks paused." : "Daily automatic checks enabled.");
      await loadMonitors();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update automatic monitoring."); }
    finally { setManagingId(null); }
  }

  const selected = monitors.find((monitor) => monitor.id === selectedId) || monitors[0];
  const openIncidents = monitors.reduce((total, monitor) => total + monitor.incidents.filter((incident) => incident.status === "open").length, 0);
  const totalChecks = monitors.reduce((total, monitor) => total + monitor.checks.length, 0);
  const formatTime = (value: string | null) => value ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "Never";
  const changeLabel = (kind: string) => ({ http_error: "HTTP error", invalid_json: "Invalid JSON", missing_field: "Missing field", new_field: "New field", type_changed: "Type changed" }[kind] || kind);

  return <div className="monitor-layout">
    <section className="monitor-summary">
      <article><span>ENDPOINTS</span><strong>{monitors.filter((monitor) => !monitor.is_demo).length}/3</strong><small>Tester-plan monitors</small></article>
      <article><span>CHECKS</span><strong>{totalChecks}</strong><small>Stored results</small></article>
      <article className={openIncidents ? "attention" : ""}><span>OPEN INCIDENTS</span><strong>{openIncidents}</strong><small>Serious changes</small></article>
    </section>

    <section className="workspace-card tester-onboarding"><div><span>GUIDED TEST</span><h2>See Pallos catch a breaking API change.</h2><p>No API needed. Pallos saves a healthy response shape, runs a broken version, and explains every detected change. Response values are never stored.</p></div><ol><li><b>1</b>Save healthy shape</li><li><b>2</b>Run broken response</li><li><b>3</b>Open an incident</li></ol><button className="run-button" onClick={runGuidedDemo} disabled={demoRunning}>{demoRunning ? <ArrowClockwise className="spin" /> : <Play weight="fill" />}{demoRunning ? "Running guided test…" : "Run guided test"}</button></section>

    <form className="workspace-card monitor-create" onSubmit={createMonitor}>
      <div><span>YOUR API</span><h2>Add a public or staging JSON endpoint</h2><p>Pallos stores field names and data types—not response values. Private authentication is disabled during the beta.</p></div>
      <label>Monitor name<input name="name" defaultValue="Training profile API" required /></label>
      <label className="monitor-url-field">Website API link<input name="url" type="url" defaultValue={healthyUrl} required /></label>
      <button className="run-button" type="submit" disabled={creating}>{creating ? <ArrowClockwise className="spin" /> : <BracketsCurly />}{creating ? "Capturing…" : "Capture baseline"}</button>
    </form>

    {setupRequired && <section className="workspace-card monitor-setup"><Database /><div><span>SUPABASE CONNECTION REQUIRED</span><h2>The monitor is built and waiting for its database.</h2><p>Add the two server-only environment variables, then run the included migration. No key is ever sent to the browser.</p><code>SUPABASE_URL</code><code>SUPABASE_SECRET_KEY</code></div></section>}
    {error && <p className="monitor-error" role="alert"><WarningCircle />{error}</p>}
    {resultNotice && <p className="monitor-result-notice" role="status"><CheckCircle weight="fill" />{resultNotice}</p>}

    {!setupRequired && loading && <div className="monitor-loading"><ArrowClockwise className="spin" />Loading monitors…</div>}
    {!setupRequired && !loading && monitors.length === 0 && <section className="workspace-card monitor-empty"><BracketsCurly /><h2>No monitors yet.</h2><p>Use the healthy training endpoint above to capture your first baseline.</p></section>}

    {selected && <div className="monitor-workspace">
      <aside className="workspace-card monitor-list"><div className="card-head"><div><span>MONITORS</span><h2>Saved endpoints</h2></div></div>{monitors.map((monitor) => <button key={monitor.id} className={selected.id === monitor.id ? "active" : ""} onClick={() => setSelectedId(monitor.id)}><i className={`status-light ${monitor.last_result === "error" || monitor.last_result === "changed" ? "stopped" : ""}`} /><div><strong>{monitor.name}</strong><small>{new URL(monitor.url).hostname}</small></div><span>{monitor.last_result}</span></button>)}</aside>
      <section className="monitor-detail" id="monitor-check-results">
        <article className="workspace-card monitor-schedule-card">
          <div><span>AUTOMATION</span><h2>Automatic checks</h2><p>Daily checks run from Vercel at approximately 12:00 PM UTC. Upgrade the Vercel plan before enabling shorter intervals.</p></div>
          <label>Check frequency<select value={selected.schedule_frequency} disabled={managingId === selected.id} onChange={(event) => updateSchedule(selected, event.target.value as SavedMonitor["schedule_frequency"])}><option value="manual">Manual only</option><option value="daily">Daily</option><option value="six_hours" disabled>Every 6 hours · requires Vercel Pro</option><option value="hourly" disabled>Every hour · requires Vercel Pro</option></select></label>
          <label className="schedule-alert-toggle"><input type="checkbox" checked={selected.email_alerts} disabled={managingId === selected.id} onChange={(event) => updateSchedule(selected, selected.schedule_frequency, event.target.checked)} /><span><strong>Email serious incidents</strong><small>{emailConfigured ? "Email provider connected" : "Ready after RESEND_API_KEY is added"}</small></span></label>
          <div className="next-check"><span>NEXT AUTOMATIC CHECK</span><strong>{selected.schedule_frequency === "manual" ? "Paused" : formatTime(selected.next_check_at)}</strong></div>
        </article>
        <article className="workspace-card monitor-run-card"><div className="card-head"><div><span>MANUAL CHECK</span><h2>{selected.name}</h2></div><div className="monitor-manage-actions"><em>{selected.has_auth_headers ? "Private header secured" : `Baseline HTTP ${selected.baseline_status}`}</em><button onClick={() => editMonitor(selected)} disabled={managingId === selected.id}>Edit</button><button onClick={() => updateMonitorAuth(selected)} disabled={managingId === selected.id}>{selected.has_auth_headers ? "Remove auth" : "Add auth"}</button><button className="danger-link" onClick={() => deleteMonitor(selected)} disabled={managingId === selected.id}>Delete</button></div></div><div className="baseline-meta"><div><span>BASELINE SOURCE</span><strong>{selected.url}</strong></div><div><span>LAST CHECK</span><strong>{formatTime(selected.last_checked_at)}</strong></div><div><span>LAST STATUS</span><strong>{selected.last_status_code ? `HTTP ${selected.last_status_code}` : "Request failed"}</strong></div></div><label>Request URL for this check<input value={checkUrls[selected.id] || selected.url} onChange={(event) => setCheckUrls((current) => ({ ...current, [selected.id]: event.target.value }))} /></label><div className="monitor-test-tools"><button type="button" onClick={() => setCheckUrls((current) => ({ ...current, [selected.id]: selected.url }))}>Use monitored URL</button><button type="button" className="broken-test-button" onClick={() => runCheck(selected, brokenUrl)} disabled={checkingId === selected.id}>{checkingId === selected.id ? "Running broken test…" : "Run broken test"}</button><button className="run-button" type="button" onClick={() => runCheck(selected)} disabled={checkingId === selected.id}>{checkingId === selected.id ? <ArrowClockwise className="spin" /> : <Play weight="fill" />}{checkingId === selected.id ? "Checking…" : "Run Check"}</button></div></article>

        {selected.checks[0] ? <article className="workspace-card latest-assessment"><div className="card-head"><div><span>LATEST ASSESSMENT</span><h2>Security posture at a glance</h2></div><em>{formatTime(selected.checks[0].checked_at)}</em></div><SecurityAssessmentPanel assessment={selected.checks[0].assessment} /></article> : null}
        <div className="monitor-results-grid"><article className="workspace-card check-history"><div className="card-head"><div><span>CHECK HISTORY</span><h2>Every saved result</h2></div></div>{selected.checks.length === 0 ? <p>No checks yet.</p> : selected.checks.map((check) => <div key={check.id} className="check-row"><span className={`check-outcome ${check.outcome}`}>{check.outcome}</span><div><strong>{check.status_code ? `HTTP ${check.status_code}` : check.error_message || "Request failed"}</strong><small>{formatTime(check.checked_at)} · {check.response_ms} ms · {check.assessment ? `${check.assessment.score}/100 ${check.assessment.grade}` : "assessment unavailable"}</small>{check.changes.length > 0 && <div className="change-list">{check.changes.map((change, index) => <span key={`${change.path}-${index}`} className={change.serious ? "serious" : ""}><b>{changeLabel(change.kind)}</b><code>{change.path}</code>{change.expected && change.actual && <em>{change.expected} → {change.actual}</em>}</span>)}</div>}</div></div>)}</article>
        <article className="workspace-card incident-list"><div className="card-head"><div><span>INCIDENTS</span><h2>Serious changes</h2></div><em>{selected.incidents.filter((incident) => incident.status === "open").length} open</em></div>{selected.incidents.length === 0 ? <div className="incident-empty"><CheckCircle weight="fill" /><strong>No incidents.</strong><p>HTTP failures, missing fields, and type changes will appear here.</p></div> : selected.incidents.map((incident) => <div className={`incident-row ${incident.status}`} key={incident.id}><span className={incident.severity}>{incident.severity}</span><div><strong>{incident.title}</strong><p>{incident.summary}</p><small>{formatTime(incident.created_at)} · {incident.status}</small><button onClick={() => setIncidentStatus(incident)}>{incident.status === "open" ? "Mark resolved" : "Reopen incident"}</button></div></div>)}</article></div>
      </section>
    </div>}
  </div>;
}

function ConnectionsView({ connected, toggle }: { connected: Record<string, boolean>; toggle: (name: string) => void }) { const services = [{name:"Supabase",icon:Database,body:"Database policies, public configuration, and schema context."},{name:"Vercel",icon:Code,body:"Deployment environment names and launch configuration checks."},{name:"Stripe",icon:LinkSimple,body:"Integration presence and exposed-key patterns. No payment data."}]; return <div className="connection-grid">{services.map(({name,icon:Icon,body}) => <article className="workspace-card connection-card" key={name}><div className="connection-icon"><Icon /></div><div><h2>{name}</h2><p>{body}</p></div><div className="connection-foot"><span><i className={`status-light ${connected[name] ? "" : "off"}`} />{connected[name] ? "Demo connected" : "Not connected"}</span><button onClick={() => toggle(name)}>{connected[name] ? "Disconnect" : "Connect demo"}</button></div></article>)}</div>; }

function InsightsView() { return <div className="insights-layout"><div className="metric-grid insights-metrics"><Metric icon={ChartLineUp} label="Score change" value="+11" note="Across the last four demo runs" tone="green"/><Metric icon={WarningCircle} label="Repeat category" value="Access" note="2 findings reopened this month" tone="gold"/><Metric icon={Check} label="Fix rate" value="62%" note="Findings cleared after a rescan" tone="blue"/></div><div className="workspace-card insight-chart"><div className="card-head"><div><span>LAUNCH READINESS</span><h2>Score over recent runs</h2></div><em>Demo trend</em></div><div className="bar-chart">{[["Run 001",61],["Run 002",66],["Run 003",68],["Run 004",72]].map(([label,value]) => <div key={label}><span style={{height:`${value}%`}}><b>{value}</b></span><small>{label}</small></div>)}</div></div><div className="workspace-card insight-list"><div className="card-head"><div><span>REPEATED PATTERNS</span><h2>Where the app needs attention</h2></div></div>{[["Access boundaries","2 open","Admin and database scope"],["Secret handling","1 critical","Browser-exposed credential"],["Usage guardrails","1 review","AI route needs a cap"]].map(row => <div className="insight-row" key={row[0]}><strong>{row[0]}</strong><span>{row[2]}</span><em>{row[1]}</em></div>)}</div></div>; }

function TesterFeedback({ notify }: { notify: (value: string) => void }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch("/api/tester/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, usefulness: Number(payload.usefulness), contactPermission: payload.contactPermission === "on" }) });
    const data = await response.json(); setSending(false);
    if (!response.ok) { notify(data.error || "Could not send feedback."); return; }
    setSent(true); notify("Feedback saved and delivered to Pallos. Thank you.");
  }
  if (sent) return <section className="workspace-card feedback-success"><CheckCircle weight="fill" /><div><span>FEEDBACK SENT</span><h2>Thank you for testing Pallos.</h2><p>Your answers are saved and will directly shape the next build.</p></div></section>;
  return <form className="workspace-card tester-feedback" onSubmit={submit}><div className="feedback-intro"><span>TESTER FEEDBACK</span><h2>Tell us what worked—and what did not.</h2><p>This takes about two minutes. Your answers are saved in Pallos and emailed to our team.</p></div><label>How useful was Pallos?<select name="usefulness" required defaultValue=""><option value="" disabled>Choose 1–10</option>{Array.from({ length: 10 }, (_, index) => <option key={index + 1}>{index + 1}</option>)}</select></label><label>Was setup clear?<select name="setupClarity" required defaultValue=""><option value="" disabled>Choose one</option><option>Very clear</option><option>Mostly clear</option><option>Confusing</option></select></label><label>Were the detected changes clear?<select name="detectionClarity" required defaultValue=""><option value="" disabled>Choose one</option><option>Very clear</option><option>Mostly clear</option><option>Confusing</option></select></label><label>What confused you?<textarea name="confusingText" rows={3} /></label><label>What feature was missing?<textarea name="missingFeature" rows={3} /></label><label>Would you use Pallos again?<select name="reuseIntent" required defaultValue=""><option value="" disabled>Choose one</option><option>Yes</option><option>Maybe</option><option>No</option></select></label><label>Would you pay for automatic monitoring?<select name="willingnessToPay" required defaultValue=""><option value="" disabled>Choose one</option><option>Yes, now</option><option>Maybe after more features</option><option>No</option></select></label><label className="feedback-consent"><input name="contactPermission" type="checkbox" />Pallos may email me one follow-up question.</label><button className="run-button" disabled={sending}>{sending ? "Sending…" : "Send tester feedback"}</button></form>;
}

function ContactView() {
  const accounts = [
    ["Instagram", "@pallos_agent", "https://www.instagram.com/pallos_agent/", InstagramLogo],
    ["Facebook", "Pallos", "https://www.facebook.com/Pallos", FacebookLogo],
    ["X", "@Pallos_Agent", "https://x.com/Pallos_Agent", XLogo],
    ["TikTok", "@pallos_agent", "https://www.tiktok.com/@pallos_agent", TiktokLogo],
    ["LinkedIn", "Pallos", "https://www.linkedin.com/in/pallos", LinkedinLogo],
    ["Indie Hackers", "@PallosAgent", "https://www.indiehackers.com/@PallosAgent", UsersThree],
  ] as const;
  return <div className="contact-layout"><section className="workspace-card contact-primary"><span>EMAIL</span><h2>Have feedback on the sandbox?</h2><p>Tell us what felt confusing, what you expected to happen, or which checks would make Pallos useful for your build.</p><a href="mailto:pallosagent@gmail.com?subject=Pallos%20Agent%20feedback"><EnvelopeSimple />pallosagent@gmail.com<ArrowRight /></a><button onClick={() => navigator.clipboard.writeText("pallosagent")}><DiscordLogo />Copy Discord username: pallosagent<Copy /></button></section><section className="workspace-card contact-socials"><div className="card-head"><div><span>FOLLOW PALLOS</span><h2>Official accounts</h2></div></div>{accounts.map(([label,handle,href,Icon]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer"><Icon /><div><strong>{label}</strong><span>{handle}</span></div><ArrowRight /></a>)}</section></div>;
}

function SettingsView({ notify, tab, setTab, appearance, updateAppearance, connected, toggleConnector, account, setAccount, logout }: {
  notify: (value: string) => void;
  tab: SettingsTab;
  setTab: (tab: SettingsTab) => void;
  appearance: Appearance;
  updateAppearance: (appearance: Appearance) => void;
  connected: Record<string, boolean>;
  toggleConnector: (name: string) => void;
  account: Account | null;
  setAccount: (account: Account) => void;
  logout: () => Promise<void>;
}) {
  const [accountSaving, setAccountSaving] = useState(false);
  function save(event: FormEvent<HTMLFormElement>, message: string) {
    event.preventDefault();
    notify(message);
  }

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setAccountSaving(true);
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/auth/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: form.get("displayName"), password: form.get("password") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update your account.");
      setAccount(data.user as Account);
      (formElement.elements.namedItem("password") as HTMLInputElement).value = "";
      notify("Account details updated.");
    } catch (caught) { notify(caught instanceof Error ? caught.message : "Could not update your account."); }
    finally { setAccountSaving(false); }
  }

  async function signOutOthers() {
    const response = await fetch("/api/auth/me", { method: "DELETE" });
    const data = await response.json();
    notify(response.ok ? "Other sessions signed out." : data.error || "Could not sign out other sessions.");
  }

  const tabs: { id: SettingsTab; label: string; note: string }[] = [
    { id: "general", label: "General", note: "Workspace defaults" },
    { id: "appearance", label: "Appearance", note: "Theme and density" },
    { id: "account", label: "Account", note: "Login details" },
    { id: "connectors", label: "Connectors", note: "Service access" },
    { id: "security", label: "Security", note: "History and deletion" },
  ];
  const services = [
    ["Supabase", "Policies, schema, and public configuration", Database],
    ["Vercel", "Deployments and environment names", Code],
    ["Stripe", "Integration and exposed-key patterns", LinkSimple],
  ] as const;

  return <div className="settings-shell">
    <nav className="settings-tabs" aria-label="Settings sections">{tabs.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><strong>{item.label}</strong><span>{item.note}</span></button>)}</nav>

    {tab === "general" && <div className="settings-grid">
      <form className="workspace-card settings-card" onSubmit={(event) => save(event, "General settings saved locally for this session.")}><div className="card-head"><div><span>WORKSPACE</span><h2>General settings</h2></div></div><label>Workspace name<input defaultValue="Pallos Sandbox" /></label><label>Notification email<input type="email" defaultValue="pallosagent@gmail.com" /></label><label>Default project<select defaultValue="Unsafe Store Demo"><option>Unsafe Store Demo</option><option>Client Portal Demo</option><option>AI Notes Demo</option></select></label><button className="run-button" type="submit">Save general settings</button></form>
      <div className="workspace-card settings-card"><div className="card-head"><div><span>REVIEW POLICY</span><h2>V1 controls</h2></div></div>{[["Require human review","Never mark a proposed fix approved automatically."],["Keep files read-only","The sandbox never changes repository files."],["Show evidence by default","Open every finding with its source context visible."]].map(([title,note]) => <label className="setting-toggle" key={title}><div><strong>{title}</strong><span>{note}</span></div><input type="checkbox" defaultChecked /></label>)}</div>
    </div>}

    {tab === "appearance" && <div className="appearance-layout">
      <section className="workspace-card settings-card appearance-card"><div className="card-head"><div><span>CANVAS</span><h2>Interface theme</h2></div><em>Saved on this device</em></div><div className="visual-options">{(["light","dim"] as const).map((theme) => <button key={theme} className={appearance.theme === theme ? "selected" : ""} onClick={() => updateAppearance({ ...appearance, theme })}><span className={`theme-preview ${theme}`}><i /><i /><i /></span><strong>{theme === "light" ? "Light workspace" : "Dim workspace"}</strong><small>{theme === "light" ? "Bright review canvas" : "Lower-glare review canvas"}</small>{appearance.theme === theme && <Check weight="bold" />}</button>)}</div></section>
      <section className="workspace-card settings-card"><div className="card-head"><div><span>PERSONALITY</span><h2>Accent color</h2></div></div><div className="accent-options">{(["indigo","cyan","emerald"] as const).map((accent) => <button key={accent} aria-label={`Use ${accent} accent`} className={appearance.accent === accent ? "selected" : ""} onClick={() => updateAppearance({ ...appearance, accent })}><i className={accent} /><span>{accent}</span>{appearance.accent === accent && <Check weight="bold" />}</button>)}</div><div className="density-control"><div><strong>Information density</strong><span>Choose how much data fits on screen.</span></div><div>{(["comfortable","compact"] as const).map((density) => <button key={density} className={appearance.density === density ? "active" : ""} onClick={() => updateAppearance({ ...appearance, density })}>{density}</button>)}</div></div><label className="setting-toggle"><div><strong>Reduce interface motion</strong><span>Minimize menu, button, and loading animations.</span></div><input type="checkbox" checked={appearance.reducedMotion} onChange={(event) => updateAppearance({ ...appearance, reducedMotion: event.target.checked })} /></label></section>
    </div>}

    {tab === "account" && <div className="settings-grid">
      <form key={account?.id || "loading"} className="workspace-card settings-card" onSubmit={saveAccount}><div className="card-head"><div><span>PROFILE</span><h2>Login details</h2></div><span className="demo-chip">LIVE ACCOUNT</span></div><label>Display name<input name="displayName" defaultValue={account?.displayName || ""} required /></label><label>Login email<input type="email" value={account?.email || ""} readOnly /></label><label>New password<input name="password" type="password" minLength={8} autoComplete="new-password" placeholder="Leave blank to keep your password" /></label><p className="settings-help">Your password is handled by Supabase Auth. Pallos never stores plaintext passwords.</p><button className="run-button" type="submit" disabled={accountSaving}>{accountSaving ? "Saving…" : "Save login details"}</button></form>
      <section className="workspace-card settings-card account-security"><div className="card-head"><div><span>ACCESS</span><h2>Session security</h2></div></div><div className="session-row"><span>{(account?.displayName || account?.email || "P").charAt(0).toUpperCase()}</span><div><strong>This device</strong><small>{account?.email || "Authenticated account"} · Active now</small></div><em>Current</em></div><button className="outline-action settings-action" onClick={signOutOthers}>Sign out other sessions</button><button className="danger-action" onClick={logout}>Log out on this device</button></section>
    </div>}

    {tab === "connectors" && <div className="workspace-card connector-settings"><div className="card-head"><div><span>CONNECTED SERVICES</span><h2>Connector access</h2></div><em>{Object.values(connected).filter(Boolean).length} of {services.length} active</em></div><p className="connector-intro">Choose which demo services can provide context to Pallos. Live connections will use provider authorization and can be revoked at any time.</p><div className="connector-settings-list">{services.map(([name, body, Icon]) => <div key={name}><span className="connection-icon"><Icon /></span><div><strong>{name}</strong><small>{body}</small></div><em><i className={`status-light ${connected[name] ? "" : "off"}`} />{connected[name] ? "Demo connected" : "Not connected"}</em><button onClick={() => toggleConnector(name)}>{connected[name] ? "Disconnect" : "Connect demo"}</button></div>)}</div></div>}
    {tab === "security" && <SecuritySettings notify={notify} />}
  </div>;
}
