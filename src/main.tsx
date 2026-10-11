import React from "react";
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
import { Trade } from "./Trade";
import { CreatePool } from "./CreatePool";
function App() {
  const { account, connect, message, setMessage } = useAlpine();
  const location = useLocation();
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
      <aside className="sidebar">
        <RouteLink to="/" className="brand">
          <img src="/mark.svg" alt="" />
          <span>
            YieldShield<small>ALPINE / AVALANCHE</small>
          </span>
        </RouteLink>
        <div className="nav-caption">YOUR EXPEDITION</div>
        <nav aria-label="Main navigation">
          {nav.map(([to, label, icon]) => (
            <NavLink
              key={to}
              to={`${to}${location.search}`}
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
      <main>
        <header>
          <div className="breadcrumb">
            Alpine <span>/</span>{" "}
            {location.pathname === "/"
              ? "Overview"
              : location.pathname.split("/")[1].replaceAll("-", " ")}
          </div>
          <div className="header-actions">
            <span className="network">
              <i />
              {localMode ? "LOCAL CHAIN" : "AVALANCHE FUJI"}
            </span>
            <button className="wallet-button" onClick={() => void connect()}>
              {account ? short(account) : "Connect wallet"}
              <span>↗</span>
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
          <Routes>
            <Route path="/" element={<Markets home />} />
            <Route path="/markets" element={<Markets />} />
            <Route path="/pools/:key" element={<PoolDetail />} />
            <Route path="/protect" element={<RoleFlow role="protect" />} />
            <Route path="/provide" element={<RoleFlow role="provide" />} />
            <Route path="/positions" element={<Positions />} />
            <Route path="/positions/:key" element={<PositionDetail />} />
            <Route
              path="*"
              element={
                <Empty title="Page not found">
                  Explore <RouteLink to="/markets">markets</RouteLink> to find a
                  route.
                </Empty>
              }
            />
          </Routes>
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
