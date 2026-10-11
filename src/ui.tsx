import { type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { assets, fmt, type Market } from "./chain";
import { useAlpine } from "./state";
export function useMarket() {
  const a = useAlpine();
  const [params, setParams] = useSearchParams();
  const key = params.get("pool") || "reference";
  const market =
    a.markets.find((m) => m.key.toLowerCase() === key.toLowerCase()) ||
    a.markets[0];
  return {
    ...a,
    market,
    snapshot: a.snapshots[market.key],
    params,
    select: (key: string) => {
      const n = new URLSearchParams(params);
      n.set("pool", key);
      n.delete("amount");
      setParams(n);
    },
  };
}
export function RouteLink({
  to,
  children,
  className = "",
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  const [params] = useSearchParams();
  const url = new URL(to, "https://alpine.local");
  if (!url.searchParams.has("pool") && params.has("pool"))
    url.searchParams.set("pool", params.get("pool")!);
  return (
    <Link className={className} to={`${url.pathname}${url.search}${url.hash}`}>
      {children}
    </Link>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-title">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
export function MarketSelect() {
  const { market, markets, select } = useMarket();
  return (
    <label className="field-label">
      Choose a market
      <select value={market.key} onChange={(e) => select(e.target.value)}>
        {markets.map((m) => (
          <option key={m.key} value={m.key}>
            {m.name} / {m.backingSymbol}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="market-facts">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function Notice() {
  const { ready } = useAlpine();
  return !ready ? (
    <div className="notice">
      Fuji contracts are awaiting deployment. Explore all workflows here; wallet
      actions become available after verified deployment. No deposits have been
      collected.
    </div>
  ) : null;
}
export function ActionButton({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  const { ready, account, busy, connect } = useAlpine();
  return (
    <button
      className="primary-button"
      disabled={busy || !ready || (!account ? false : disabled)}
      onClick={!account ? () => void connect() : onClick}
    >
      {busy
        ? "Waiting for wallet or confirmation…"
        : !ready
          ? "Awaiting Fuji deployment"
          : !account
            ? "Connect wallet"
            : children}
      <span aria-hidden>↗</span>
    </button>
  );
}
export function Amount({
  value,
  onChange,
  symbol,
  label = "Amount",
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  symbol: string;
  label?: string;
  max?: string;
}) {
  return (
    <label className="field-label">
      {label}
      <div className="amount-input">
        <input
          aria-label={label}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
        />
        <span>{symbol}</span>
      </div>
      {max && (
        <button
          type="button"
          className="text-button"
          onClick={() => onChange(max)}
        >
          Use maximum · {max}
        </button>
      )}
    </label>
  );
}
export function Risk({
  provider = false,
  backing = "aDEMO",
}: {
  provider?: boolean;
  backing?: string;
}) {
  return (
    <div className="risk-box">
      <strong>
        {provider ? "Capital at risk" : "Fixed protection maturity"}
      </strong>
      <p>
        {provider
          ? "Provider deposits and redemptions freeze while any protected position remains. After maturity, anyone can settle each position to release the freeze. You absorb losses and receive surrendered asset inventory; fees and returns are not guaranteed."
          : "At maturity, remaining assets are surrendered for the fixed entry backing claim, even if the asset rose. Exit before maturity to retain upside. Partial exits release only their proportional entry claim."}
      </p>
      {backing === "bvaDEMO" && (
        <p>
          The floor is a fixed number of bvaDEMO vault receipts. Their
          redeemable aDEMO amount can change; this is not a fixed dollar
          guarantee.
        </p>
      )}
    </div>
  );
}
export function MarketCard({ market }: { market: Market }) {
  const { snapshots } = useAlpine();
  const s = snapshots[market.key],
    asset = assets.find((a) => a.key === market.asset)!;
  return (
    <article className="market-card">
      <div className="card-top">
        <div className="token-stack">
          <span className="avax-symbol">
            {market.asset === "vault" ? "v" : "▲"}
          </span>
          <span className="backing-symbol">
            {market.backingSymbol === "bvaDEMO" ? "v" : "a"}
          </span>
        </div>
        <span className="test-pill">{s ? "TESTNET" : "PREPARED"}</span>
      </div>
      <h3>{market.name}</h3>
      <p className="card-description">
        {asset.symbol} / {market.backingSymbol}
      </p>
      <div className="price-source">{market.source}</div>
      <Facts
        items={[
          [
            `Price · ${market.backingSymbol}`,
            s?.price ? fmt(s.price) : "Unavailable",
          ],
          [
            "Available entry claims",
            s
              ? `${fmt(s.capacity)} ${market.backingSymbol}`
              : "Awaiting deployment",
          ],
          [
            "Provider entry",
            s
              ? s.reserved > 0n
                ? "Frozen · open protection"
                : "Available until maturity"
              : "Prepared",
          ],
        ]}
      />
      <div className="button-row">
        <RouteLink
          className="secondary-button"
          to={`/pools/${market.key}?pool=${market.key}`}
        >
          Market details ↗
        </RouteLink>
        <RouteLink
          className="secondary-button"
          to={`/protect?pool=${market.key}`}
        >
          Protect
        </RouteLink>
        <RouteLink
          className="secondary-button"
          to={`/provide?pool=${market.key}`}
        >
          Provide capital
        </RouteLink>
      </div>
    </article>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span aria-hidden>◇</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
