import React, { lazy, Suspense, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useLocation,
} from "react-router-dom";
import { AlpineProvider, useAlpine } from "./state";
import { config, localMode, short } from "./chain";
import { RoleFlow, Positions, PositionDetail } from "./Workflows";
import { Markets, PoolDetail } from "./Markets";
import { RouteLink, Notice, Empty } from "./ui";
import "./style.css";
const Trade = lazy(() => import("./Trade").then((m) => ({ default: m.Trade })));
const CreatePool = lazy(() =>
  import("./CreatePool").then((m) => ({ default: m.CreatePool })),
);
import { Portfolio, Activity, Faucet, Status, Assets } from "./AccountPages";
import { Guide, Legal } from "./Guide";
import { RouteOrientation, routeName } from "./navigation";
function App() {
  const { account, connect, message, setMessage, markets, loading } =
    useAlpine();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [location.pathname]);
  const selected = new URLSearchParams(location.search).get("pool");
  const invalidPool =
    selected &&
    !markets.some((m) => m.key.toLowerCase() === selected.toLowerCase());
  const pathPool = location.pathname.startsWith("/pools/")
    ? decodeURIComponent(location.pathname.slice(7))
    : location.pathname.startsWith("/positions/") &&
        location.pathname.includes(":")
      ? decodeURIComponent(
          location.pathname.slice(11).split(":").slice(0, -1).join(":"),
        )
      : null;
  const mismatchedPool =
    pathPool && selected && pathPool.toLowerCase() !== selected.toLowerCase();
  const nav = [
    ["/markets", "Markets", "◇"],
    ["/protect", "Protect", "↗"],
    ["/provide", "Provide capital", "◈"],
    ["/trade", "Trade & convert", "⇄"],
    ["/positions", "My positions", "▱"],
    ["/portfolio", "Portfolio", "◷"],
    ["/activity", "Activity", "≋"],
    ["/create-pool", "Create a pool", "+"],
    ["/faucet", "Get test tokens", "↓"],
    ["/how-it-works", "Field guide", "⌁"],
    ["/status", "Network status", "•"],
  ];
  return (
    <div className="app-shell">
      <RouteOrientation />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="brand-row">
          <RouteLink to="/" className="brand">
            <img src="/mark.svg" alt="" width="38" height="38" />
            <span>
              YieldShield<small>ALPINE / AVALANCHE</small>
            </span>
          </RouteLink>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? "Close menu" : "Menu"}
            <span aria-hidden="true">{menuOpen ? "−" : "+"}</span>
          </button>
        </div>
        <div className="nav-caption">YOUR EXPEDITION</div>
        <nav
          id="primary-navigation"
          aria-label="Main navigation"
          data-expanded={menuOpen}
        >
          {nav.map(([to, label, icon]) => (
            <NavLink
              key={to}
              to={
                selected
                  ? `${to}?${new URLSearchParams({ pool: selected })}`
                  : to
              }
              className={({ isActive }) => (isActive ? "selected" : "")}
            >
              <span aria-hidden>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>Built for Avalanche.</p>
          <small>A valueless testnet experiment.</small>
          <RouteLink to="/legal">Terms & risks ↗</RouteLink>
        </div>
      </aside>
      <main id="main-content" tabIndex={-1}>
        <header>
          <div className="breadcrumb">
            Alpine <span>/</span> {routeName(location.pathname)}
          </div>
          <div className="header-actions">
            <span className="network">
              <i />
              {localMode ? "LOCAL CHAIN" : "AVALANCHE FUJI"}
            </span>
            <button className="wallet-button" onClick={() => void connect()}>
              {account ? short(account) : "Connect wallet"}
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </header>
        <div className="content">
          <div className="testnet-note">
            <span>{localMode ? "LOCAL DEMO" : "TESTNET ONLY"}</span>All funds
            are valueless test assets.{" "}
            {config.status === "awaiting-testnet-gas"
              ? "Contracts prepared; Fuji deployment is pending."
              : "Review the network and market terms before signing."}
          </div>
          <Notice />
          {message && (
            <div className="feedback" role="status">
              {message}
              <button
                aria-label="Dismiss notification"
                onClick={() => setMessage("")}
              >
                ×
              </button>
            </div>
          )}
          {invalidPool || mismatchedPool ? (
            <Empty
              headingLevel={1}
              title={
                loading
                  ? "Loading market registry…"
                  : "Invalid market selection"
              }
            >
              The selected pool could not be verified. No transaction is
              available. <a href="/markets">Choose a market</a>.
            </Empty>
          ) : (
            <Suspense fallback={<p className="notice">Loading page…</p>}>
              <Routes>
                <Route path="/" element={<Markets home />} />
                <Route path="/markets" element={<Markets />} />
                <Route path="/pools/:key" element={<PoolDetail />} />
                <Route path="/protect" element={<RoleFlow role="protect" />} />
                <Route path="/provide" element={<RoleFlow role="provide" />} />
                <Route path="/positions" element={<Positions />} />
                <Route path="/positions/:key" element={<PositionDetail />} />
                <Route path="/trade" element={<Trade />} />
                <Route path="/create-pool" element={<CreatePool />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/activity" element={<Activity />} />
                <Route path="/faucet" element={<Faucet />} />
                <Route path="/assets" element={<Assets />} />
                <Route path="/status" element={<Status />} />
                <Route path="/how-it-works" element={<Guide />} />
                <Route path="/learn/scenarios" element={<Guide />} />
                <Route path="/legal" element={<Legal />} />
                <Route
                  path="*"
                  element={
                    <Empty headingLevel={1} title="Page not found">
                      Explore <RouteLink to="/markets">markets</RouteLink> to
                      find a route.
                    </Empty>
                  }
                />
              </Routes>
            </Suspense>
          )}
          <footer>
            <span>▲ YieldShield Alpine</span>
            <p>Funded test assets · Transparent terms · Capital at risk</p>
            <RouteLink to="/legal">Terms & risks</RouteLink>
          </footer>
        </div>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AlpineProvider>
        <App />
      </AlpineProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
