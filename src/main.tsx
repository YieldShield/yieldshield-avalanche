import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
  type Address,
} from "viem";
import {
  client,
  config,
  poolAbi,
  tokenAbi,
  oracleAbi,
  feedAbi,
  wallet,
  short,
  explorer,
} from "./chain";
import { exitPreview, maxNewFloor, minimumOutput, safeError } from "./math.mjs";
import "./style.css";

type Position = {
  id: bigint;
  owner: string;
  amount: bigint;
  floor: bigint;
  openedAt: bigint;
};
type Pool = {
  backing: bigint;
  reserved: bigint;
  native: bigint;
  juniorNative: bigint;
  totalShares: bigint;
  ownShares: bigint;
  ready: bigint;
  price: bigint;
  positions: Position[];
  tokenBalance: bigint;
  nextClaim: bigint;
  maturity: bigint;
  claimable: bigint;
  expiredPositions: Position[];
};
const EMPTY: Pool = {
  backing: 0n,
  reserved: 0n,
  native: 0n,
  juniorNative: 0n,
  totalShares: 0n,
  ownShares: 0n,
  ready: 0n,
  price: 0n,
  positions: [],
  tokenBalance: 0n,
  nextClaim: 0n,
  maturity: 0n,
  claimable: 0n,
  expiredPositions: [],
};
const num = (n: bigint, d = 6, digits = 2) =>
  Number(formatUnits(n, d)).toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
const Arrow = () => <span aria-hidden="true">↗</span>;
function App() {
  const [tab, setTab] = useState<"market" | "positions" | "assets">("market");
  const [market, setMarket] = useState<"reference" | "scenario">("reference");
  const [mode, setMode] = useState<"protect" | "junior">("protect");
  const [account, setAccount] = useState<Address | null>(null);
  const [pool, setPool] = useState<Pool>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [tx, setTx] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("0.10");
  const [scenario, setScenario] = useState(-30);
  const [reference, setReference] = useState<{
    price: bigint;
    updated: number;
  } | null>(null);
  const [tick, setTick] = useState(Date.now());
  const [refresh, setRefresh] = useState(0);
  const address = (
    market === "reference" ? config.referencePool : config.scenarioPool
  ) as Address | null;
  const oracle = (
    market === "reference" ? config.referenceOracle : config.scenarioOracle
  ) as Address | null;
  const ready =
    config.status === "verified" &&
    Boolean(address && config.backingToken && oracle);
  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const ethereum = window.ethereum;
    const reset = () => {
      setAccount(null);
      setPool(EMPTY);
      setRefresh((x) => x + 1);
    };
    ethereum?.on?.("accountsChanged", reset);
    ethereum?.on?.("chainChanged", reset);
    return () => {
      ethereum?.removeListener?.("accountsChanged", reset);
      ethereum?.removeListener?.("chainChanged", reset);
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setReadError("");
      try {
        const round = await client
          .readContract({
            address: config.chainlinkFeed as Address,
            abi: feedAbi,
            functionName: "latestRoundData",
          })
          .catch(() => null);
        if (!cancelled)
          setReference(
            round && round[1] > 0n && round[4] >= round[0]
              ? { price: round[1] / 100n, updated: Number(round[3]) }
              : null,
          );
        if (!ready || !address || !oracle) {
          if (!cancelled) setPool(EMPTY);
          return;
        }
        const get = (
          functionName:
            | "totalBacking"
            | "reservedBacking"
            | "protectedAvax"
            | "juniorAvax"
            | "totalShares"
            | "nextPositionId",
        ) =>
          client.readContract({
            address: address!,
            abi: poolAbi,
            functionName,
          });
        const [
          backing,
          reserved,
          native,
          juniorNative,
          totalShares,
          next,
          price,
          ownShares,
          withdrawAt,
          tokenBalance,
          nextClaim,
          maturity,
          claimable,
        ] = await Promise.all([
          get("totalBacking"),
          get("reservedBacking"),
          get("protectedAvax"),
          get("juniorAvax"),
          get("totalShares"),
          get("nextPositionId"),
          client
            .readContract({
              address: oracle,
              abi: oracleAbi,
              functionName: "price",
            })
            .catch(() => 0n),
          account
            ? client.readContract({
                address,
                abi: poolAbi,
                functionName: "shares",
                args: [account],
              })
            : 0n,
          account
            ? client.readContract({
                address,
                abi: poolAbi,
                functionName: "withdrawalReadyAt",
                args: [account],
              })
            : 0n,
          account
            ? client.readContract({
                address: config.backingToken as Address,
                abi: tokenAbi,
                functionName: "balanceOf",
                args: [account],
              })
            : 0n,
          account
            ? client.readContract({
                address: config.backingToken as Address,
                abi: tokenAbi,
                functionName: "nextClaim",
                args: [account],
              })
            : 0n,
          client.readContract({
            address,
            abi: poolAbi,
            functionName: "maturity",
          }),
          account
            ? client.readContract({
                address,
                abi: poolAbi,
                functionName: "claimableBacking",
                args: [account],
              })
            : 0n,
        ]);
        // Bounded testnet scan. Owner filtering occurs after validated contract reads.
        const start = next > 100n ? next - 100n : 1n;
        const positions = account
          ? await Promise.all(
              Array.from(
                { length: Number(next - start) },
                (_, i) => start + BigInt(i),
              ).map(async (id) => {
                const p = await client.readContract({
                  address: address!,
                  abi: poolAbi,
                  functionName: "positions",
                  args: [id],
                });
                return {
                  id,
                  owner: p[0],
                  amount: p[1],
                  floor: p[2],
                  openedAt: p[3],
                };
              }),
            )
          : [];
        if (!cancelled)
          setPool({
            backing,
            reserved,
            native,
            juniorNative,
            totalShares,
            price,
            ownShares,
            ready: withdrawAt,
            positions: positions.filter(
              (p) => p.owner.toLowerCase() === account?.toLowerCase(),
            ),
            expiredPositions: positions.filter(
              (p) => p.owner !== "0x0000000000000000000000000000000000000000",
            ),
            tokenBalance,
            nextClaim,
            maturity,
            claimable,
          });
      } catch (error) {
        if (!cancelled) {
          setReadError(safeError(error));
          setPool((p) => ({ ...p, price: 0n }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const timer = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [address, oracle, account, ready, refresh]);
  async function connect() {
    setBusy(true);
    setFeedback("");
    try {
      const { account } = await wallet();
      setAccount(account);
      setRefresh((x) => x + 1);
    } catch (e) {
      setFeedback(safeError(e));
    } finally {
      setBusy(false);
    }
  }
  async function transact(
    kind:
      | "protect"
      | "junior"
      | "faucet"
      | "notice"
      | "withdraw"
      | "exitAvax"
      | "exitBacking"
      | "settle"
      | "claim",
    position?: Position,
  ) {
    setBusy(true);
    setFeedback("");
    setTx(null);
    try {
      if (!ready || !address)
        throw new Error(
          "This market is awaiting its verified Fuji deployment. Explore the model below meanwhile.",
        );
      const { w, account: active } = await wallet();
      setAccount(active);
      if (account && active.toLowerCase() !== account.toLowerCase())
        throw new Error(
          "Wallet account changed. Balances are refreshing; review and try again.",
        );
      let hash: `0x${string}`;
      if (kind === "faucet")
        hash = await w.writeContract({
          account: active,
          address: config.backingToken as Address,
          abi: tokenAbi,
          functionName: "faucet",
        });
      else if (kind === "protect") {
        const value = parseEther(amount);
        if (value <= 0n || value > parseEther("10"))
          throw new Error("Enter between 0 and 10 test AVAX.");
        const fresh = await client.readContract({
          address: oracle!,
          abi: oracleAbi,
          functionName: "price",
        });
        const entryQuote = (value * fresh) / 10n ** 18n;
        if (entryQuote === 0n)
          throw new Error(
            "Amount is too small to reserve one aDEMO base unit.",
          );
        const minFloor = minimumOutput(entryQuote);
        const request = await client.simulateContract({
          account: active,
          address,
          abi: poolAbi,
          functionName: "protect",
          args: [minFloor, BigInt(Math.floor(Date.now() / 1000) + 300)],
          value,
        });
        hash = await w.writeContract(request.request);
      } else if (kind === "junior") {
        const value = parseUnits(amount, 6);
        if (value <= 0n) throw new Error("Enter a positive aDEMO amount.");
        const allowance = await client.readContract({
          address: config.backingToken as Address,
          abi: tokenAbi,
          functionName: "allowance",
          args: [active, address],
        });
        if (allowance < value) {
          setFeedback("Approve exactly this aDEMO amount in your wallet.");
          const approval = await w.writeContract({
            account: active,
            address: config.backingToken as Address,
            abi: tokenAbi,
            functionName: "approve",
            args: [address, value],
          });
          const receipt = await client.waitForTransactionReceipt({
            hash: approval,
          });
          if (receipt.status !== "success")
            throw new Error("Token approval reverted.");
        }
        const [total, backing, junior, price] = await Promise.all([
          client.readContract({
            address,
            abi: poolAbi,
            functionName: "totalShares",
          }),
          client.readContract({
            address,
            abi: poolAbi,
            functionName: "totalBacking",
          }),
          client.readContract({
            address,
            abi: poolAbi,
            functionName: "juniorAvax",
          }),
          client.readContract({
            address: oracle!,
            abi: oracleAbi,
            functionName: "price",
          }),
        ]);
        const nav = backing + (junior * price) / 10n ** 18n;
        const expected =
          total === 0n
            ? value * 10n ** 12n
            : nav > 0n
              ? (value * total) / nav
              : 0n;
        if (expected <= 0n) throw new Error("No viable share quote.");
        const request = await client.simulateContract({
          account: active,
          address,
          abi: poolAbi,
          functionName: "depositJunior",
          args: [value, minimumOutput(expected)],
        });
        hash = await w.writeContract(request.request);
      } else if (kind === "settle" && position)
        hash = await w.writeContract({
          account: active,
          address,
          abi: poolAbi,
          functionName: "settleExpired",
          args: [position.id],
        });
      else if (kind === "claim")
        hash = await w.writeContract({
          account: active,
          address,
          abi: poolAbi,
          functionName: "claimBacking",
        });
      else if (kind === "notice")
        hash = await w.writeContract({
          account: active,
          address,
          abi: poolAbi,
          functionName: "requestJuniorWithdrawal",
        });
      else if (kind === "withdraw") {
        const burn = pool.ownShares;
        const minBacking = pool.totalShares
          ? minimumOutput((pool.backing * burn) / pool.totalShares)
          : 0n;
        const minAvax = pool.totalShares
          ? minimumOutput((pool.juniorNative * burn) / pool.totalShares)
          : 0n;
        const request = await client.simulateContract({
          account: active,
          address,
          abi: poolAbi,
          functionName: "withdrawJunior",
          args: [burn, minBacking, minAvax],
        });
        hash = await w.writeContract(request.request);
      } else if (kind === "exitBacking" && position)
        hash = await w.writeContract({
          account: active,
          address,
          abi: poolAbi,
          functionName: "exitBacking",
          args: [position.id],
        });
      else if (kind === "exitAvax" && position) {
        const fresh = await client.readContract({
          address: oracle!,
          abi: oracleAbi,
          functionName: "price",
        });
        const quote = exitPreview(position.amount, position.floor, fresh);
        hash = await w.writeContract({
          account: active,
          address,
          abi: poolAbi,
          functionName: "exitAvax",
          args: [position.id, minimumOutput(quote.avaxOut)],
        });
      } else throw new Error("Choose a valid action.");
      setTx(hash);
      setFeedback("Submitted. Waiting for Fuji confirmation…");
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success")
        throw new Error(
          "Transaction reverted. No successful action was recorded.",
        );
      setFeedback("Confirmed on Fuji. Your balances are refreshing.");
      setRefresh((x) => x + 1);
    } catch (e) {
      setFeedback(safeError(e));
    } finally {
      setBusy(false);
    }
  }
  let rawAmount = 0n;
  try {
    rawAmount = mode === "protect" ? parseEther(amount) : parseUnits(amount, 6);
  } catch {}
  const floor =
    mode === "protect" && pool.price > 0n
      ? (rawAmount * pool.price) / 10n ** 18n
      : 0n;
  const referenceFresh =
    reference &&
    reference.updated <= tick / 1000 &&
    tick / 1000 - reference.updated <= config.maxPriceAge;
  const epochEnded = pool.maturity > 0n && tick / 1000 >= Number(pool.maturity);
  const admissionClosed =
    pool.maturity > 0n && tick / 1000 + 60 >= Number(pool.maturity);
  const juniorLocked = pool.reserved > 0n;
  const writeSafe =
    !epochEnded &&
    !(mode === "protect" ? admissionClosed : juniorLocked) &&
    ready &&
    !loading &&
    !readError &&
    pool.price > 0n &&
    (market === "scenario" || referenceFresh);
  const model = exitPreview(
    10n ** 18n,
    25_000_000n,
    BigInt((25_000_000 * (100 + scenario)) / 100),
  );
  const ratio = pool.reserved
    ? Number((pool.backing * 10000n) / pool.reserved) / 100
    : null;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setTab("market")}>
          <img src="/mark.svg" alt="" />
          <span>
            YieldShield<small>ALPINE · AVALANCHE</small>
          </span>
        </a>
        <span className="nav-caption">YOUR BASE CAMP</span>
        <nav aria-label="Main navigation">
          <button
            className={tab === "market" ? "active" : ""}
            onClick={() => setTab("market")}
          >
            <span>◈</span> Explore market <b>01</b>
          </button>
          <button
            className={tab === "positions" ? "active" : ""}
            onClick={() => setTab("positions")}
          >
            <span>▱</span> Your positions{" "}
            {pool.positions.length > 0 ? <b>{pool.positions.length}</b> : null}
          </button>
          <button
            className={tab === "assets" ? "active" : ""}
            onClick={() => setTab("assets")}
          >
            <span>⌘</span> Asset field guide
          </button>
        </nav>
        <div className="sidebar-bottom">
          <span className="mountain-line">△ / △</span>
          <p>
            Know your exposure.
            <br />
            Choose your exit.
          </p>
          <a
            href="https://build.avax.network/console/primary-network/faucet"
            target="_blank"
            rel="noreferrer"
          >
            Get Fuji test AVAX <Arrow />
          </a>
          <div className="version">EXPERIMENTAL PILOT · V0.1</div>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumb">
            Avalanche <span>/</span>{" "}
            {tab === "market"
              ? "Explore market"
              : tab === "positions"
                ? "Your positions"
                : "Asset field guide"}
          </div>
          <div className="header-actions">
            <span className="network">
              <i /> Fuji testnet
            </span>
            <button className="wallet-button" disabled={busy} onClick={connect}>
              {account ? short(account) : "Connect wallet"} <span>→</span>
            </button>
          </div>
        </header>
        <div className="content">
          <div className="testnet-note">
            <span>TESTNET EXPEDITION</span> Every asset here has no monetary
            value. Experimental code; independently unaudited.
          </div>
          {feedback ? (
            <div className="feedback" role="status">
              {feedback}{" "}
              {tx ? (
                <a href={explorer("tx", tx)} target="_blank" rel="noreferrer">
                  View transaction <Arrow />
                </a>
              ) : null}
              <button
                aria-label="Dismiss notification"
                onClick={() => setFeedback("")}
              >
                ×
              </button>
            </div>
          ) : null}
          {tab === "market" ? (
            <>
              <section className="hero">
                <div>
                  <div className="eyebrow">
                    AVAX EXPOSURE, WITH AN EXIT PLAN
                  </div>
                  <h1>
                    Reach higher.
                    <br />
                    <em>Know your footing.</em>
                  </h1>
                  <p>
                    Keep your AVAX upside. Reserve a backing exit.
                    <br />
                    Explore how two sides share risk on Avalanche.
                  </p>
                  <a href="#market" className="hero-link">
                    Explore the pilot <span>↓</span>
                  </a>
                </div>
                <div className="mountain-art" aria-hidden="true">
                  <svg viewBox="0 0 500 310">
                    <defs>
                      <linearGradient id="snow" x1="0" x2="0.7" y2="1">
                        <stop stopColor="#fafdf9" />
                        <stop offset="1" stopColor="#b4cfc2" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 290 120 124 176 189 297 25 492 290Z"
                      fill="#91b3a4"
                    />
                    <path d="m85 290 212-265 114 265Z" fill="url(#snow)" />
                    <path d="m297 25 195 265H360Z" fill="#6d9a88" />
                    <path
                      d="m297 25-64 80 37-6 18 25 23-37 32 14Z"
                      fill="#f7faf6"
                    />
                    <path
                      d="M0 290 120 124l-26 117 48-26 46 75Z"
                      fill="#c7dcd2"
                    />
                    <path
                      d="m275 154 82 39-10 49 80 48"
                      stroke="#ef624d"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray="5 6"
                    />
                    <circle cx="275" cy="154" r="6" fill="#ef624d" />
                    <path
                      d="m276 151 3-39 26 10-27 8"
                      stroke="#193730"
                      fill="#ef624d"
                    />
                    <path
                      d="M3 301H480"
                      stroke="#a6c3b5"
                      strokeDasharray="2 5"
                    />
                  </svg>
                  <span className="altitude">
                    46°51′ N &nbsp; / &nbsp; BUILT FOR AVALANCHE
                  </span>
                </div>
              </section>
              <section className="stats" aria-label="Market statistics">
                <div>
                  <small>REFERENCE AVAX / USD</small>
                  <strong>
                    {reference ? `$${num(reference.price)}` : "—"}{" "}
                    <span className={referenceFresh ? "positive" : "muted"}>
                      {referenceFresh ? "● Live feed" : "● Unavailable / stale"}
                    </span>
                  </strong>
                  <p>
                    Chainlink on Fuji ·{" "}
                    {reference
                      ? `${Math.max(0, Math.floor(tick / 1000 - reference.updated))}s ago`
                      : "connecting"}
                  </p>
                </div>
                <div>
                  <small>BACKING IN SELECTED POOL</small>
                  <strong>
                    {ready ? num(pool.backing) : "—"} <span>aDEMO</span>
                  </strong>
                  <p>
                    {ready
                      ? "From the deployed contract"
                      : "Deployment awaiting test gas"}
                  </p>
                </div>
                <div>
                  <small>REQUIRED ENTRY BACKING</small>
                  <strong>
                    150<span>%</span>
                  </strong>
                  <p>Reserved before a position opens</p>
                </div>
              </section>
              <div className="market-heading" id="market">
                <div>
                  <span className="eyebrow">01 / THE FIRST ASCENT</span>
                  <h2>A clear view of both sides.</h2>
                </div>
                <span className="pill">ONE ASSET. TWO EXIT CHOICES.</span>
              </div>
              <div className="market-grid">
                <section className="market-card">
                  <div className="card-top">
                    <div className="token-stack">
                      <span className="avax-symbol">▲</span>
                      <span className="backing-symbol">a</span>
                    </div>
                    <span className="test-pill">FUJI PILOT</span>
                  </div>
                  <h3>AVAX / aDEMO</h3>
                  <p className="card-description">
                    Native test AVAX exposure, backed by
                    <br />
                    junior-provided demo dollars.
                  </p>
                  <div className="market-switch" aria-label="Price source">
                    <button
                      className={market === "reference" ? "selected" : ""}
                      onClick={() => {
                        setMarket("reference");
                        setPool(EMPTY);
                      }}
                    >
                      Reference market
                    </button>
                    <button
                      className={market === "scenario" ? "selected" : ""}
                      onClick={() => {
                        setMarket("scenario");
                        setPool(EMPTY);
                      }}
                    >
                      Scenario lab
                    </button>
                  </div>
                  <div className="price-source">
                    <i
                      className={market === "scenario" ? "scenario-dot" : ""}
                    />
                    <span>
                      {market === "reference"
                        ? "Chainlink AVAX/USD"
                        : "Synthetic cycle: 25 → 35 → 15"}
                    </span>
                    <b>{pool.price ? `$${num(pool.price)}` : "—"}</b>
                  </div>
                  <dl className="market-facts">
                    <div>
                      <dt>Backing reserved</dt>
                      <dd>{num(pool.reserved)} aDEMO</dd>
                    </div>
                    <div>
                      <dt>New position capacity</dt>
                      <dd>
                        {num(maxNewFloor(pool.backing, pool.reserved))} aDEMO
                      </dd>
                    </div>
                    <div>
                      <dt>Current backing ratio</dt>
                      <dd>
                        {ratio ? `${ratio.toFixed(0)}%` : "No open exposure"}
                      </dd>
                    </div>
                    <div>
                      <dt>Protected exit delay</dt>
                      <dd>60 seconds</dd>
                    </div>
                    <div>
                      <dt>7-day epoch ends</dt>
                      <dd>
                        {pool.maturity
                          ? new Date(
                              Number(pool.maturity) * 1000,
                            ).toLocaleString()
                          : "After deployment"}
                      </dd>
                    </div>
                  </dl>
                  <div className="reserve-bar">
                    <span
                      style={{
                        width: pool.backing
                          ? `${Math.min(100, Number((pool.reserved * 100n) / pool.backing))}%`
                          : "0%",
                      }}
                    />
                  </div>
                  <div className="bar-legend">
                    <span>● Reserved</span>
                    <span>○ Available backing</span>
                  </div>
                  <p className="source-note">
                    {market === "scenario"
                      ? "Scenario prices change every 120 seconds; this is an onchain test model, never a market quote."
                      : "If the reference price becomes stale, price-dependent actions stop. The pre-reserved backing exit remains available."}
                  </p>
                  {address ? (
                    <a
                      className="contract-link"
                      href={explorer("address", address)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View market contract <Arrow />
                    </a>
                  ) : (
                    <span className="pending">
                      ○ Contract deployment pending
                    </span>
                  )}
                </section>
                <section className="action-card">
                  <div className="action-tabs">
                    <button
                      className={mode === "protect" ? "selected" : ""}
                      onClick={() => {
                        setMode("protect");
                        setAmount("0.10");
                      }}
                    >
                      Hold exposure
                    </button>
                    <button
                      className={mode === "junior" ? "selected" : ""}
                      onClick={() => {
                        setMode("junior");
                        setAmount("100");
                      }}
                    >
                      Provide backing
                    </button>
                  </div>
                  <h3>
                    {mode === "protect"
                      ? "Choose your footing."
                      : "Be the backing."}
                  </h3>
                  <p>
                    {mode === "protect"
                      ? "Deposit test AVAX. Reserve your entry value in aDEMO, while keeping exposure to AVAX."
                      : "Supply aDEMO first-loss capital. Earn a share of realized gains and absorb backing-exit losses."}
                  </p>
                  <label className="amount-label" htmlFor="amount">
                    {mode === "protect" ? "YOU DEPOSIT" : "YOU SUPPLY"}
                  </label>
                  <div className="amount-input">
                    <input
                      id="amount"
                      aria-label={
                        mode === "protect" ? "Test AVAX amount" : "aDEMO amount"
                      }
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      autoComplete="off"
                    />
                    <span>{mode === "protect" ? "AVAX" : "aDEMO"}</span>
                  </div>
                  <div className="amount-help">
                    {mode === "protect"
                      ? "Test AVAX only · maximum 10 per position"
                      : `${num(pool.tokenBalance)} aDEMO in connected wallet`}
                  </div>
                  <dl className="quote">
                    <div>
                      <dt>
                        {mode === "protect"
                          ? "Entry backing reserved"
                          : "Gain share to juniors"}
                      </dt>
                      <dd>
                        {mode === "protect"
                          ? `${num(floor)} aDEMO`
                          : "10% of positive gains"}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {mode === "protect"
                          ? "Gain-sharing fee"
                          : "Withdrawal notice"}
                      </dt>
                      <dd>
                        {mode === "protect"
                          ? "12% of positive gains"
                          : "120 seconds"}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {mode === "protect"
                          ? "Quote tolerance"
                          : "Principal risk"}
                      </dt>
                      <dd>
                        {mode === "protect"
                          ? "0.5% · valid 5 minutes"
                          : "First loss"}
                      </dd>
                    </div>
                  </dl>
                  <button
                    className="primary-button"
                    disabled={
                      busy || (!account ? false : !writeSafe || rawAmount <= 0n)
                    }
                    onClick={() => (account ? transact(mode) : connect())}
                  >
                    {busy
                      ? "Check your wallet…"
                      : !account
                        ? "Connect wallet to begin"
                        : !ready
                          ? "Awaiting deployment"
                          : epochEnded
                            ? "Epoch ended"
                            : mode === "junior" && juniorLocked
                              ? "Junior changes locked during exposure"
                              : mode === "protect"
                                ? "Previewed — deposit test AVAX"
                                : "Approve & supply aDEMO"}{" "}
                    <span>→</span>
                  </button>
                  {mode === "junior" ? (
                    <button
                      className="faucet-link"
                      disabled={
                        busy || !ready || Number(pool.nextClaim) > tick / 1000
                      }
                      onClick={() => transact("faucet")}
                    >
                      {Number(pool.nextClaim) > tick / 1000
                        ? "aDEMO faucet cooldown active"
                        : "Get 10,000 free aDEMO"}
                    </button>
                  ) : null}
                  <p className="risk-note">
                    {mode === "protect"
                      ? "At the 7-day epoch end, unclosed positions surrender AVAX for entry backing, forfeiting later upside. aDEMO is not Circle USDC or redeemable dollars."
                      : "Junior entry and withdrawals freeze while any protected position is open, until all exit or settle after the 7-day epoch. Redemptions return an asset basket; notice is not a guaranteed exit time."}
                  </p>
                  {readError ? (
                    <p className="error-note" role="alert">
                      Live reads unavailable. {readError}
                    </p>
                  ) : null}
                </section>
              </div>
              <section className="scenario-section">
                <div>
                  <div className="eyebrow">BEFORE YOU TAKE THE TRAIL</div>
                  <h2>See how the exits differ.</h2>
                  <p>
                    An illustrative 1 AVAX position opened at $25.
                    <br />
                    Move the price; compare both exit choices.
                  </p>
                  <label htmlFor="scenario">
                    AVAX price change{" "}
                    <strong>
                      {scenario > 0 ? "+" : ""}
                      {scenario}%
                    </strong>
                  </label>
                  <input
                    id="scenario"
                    type="range"
                    min="-60"
                    max="60"
                    step="1"
                    value={scenario}
                    onChange={(e) => setScenario(Number(e.target.value))}
                  />
                  <div className="range-labels">
                    <span>−60%</span>
                    <span>+60%</span>
                  </div>
                  <small>
                    Illustrative model only. This slider does not change an
                    oracle or submit a transaction.
                  </small>
                </div>
                <div className="scenario-results">
                  <div>
                    <span>KEEP YOUR EXPOSURE</span>
                    <strong>
                      {Number(formatEther(model.avaxOut)).toFixed(4)}{" "}
                      <small>AVAX</small>
                    </strong>
                    <p>
                      $
                      {(
                        Number(formatEther(model.avaxOut)) *
                        25 *
                        (1 + scenario / 100)
                      ).toFixed(2)}{" "}
                      illustrative value after gain fee
                    </p>
                    <div className="scenario-track">
                      <i
                        style={{
                          width: `${Math.min(100, 50 * (1 + scenario / 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <span>SURRENDER FOR BACKING</span>
                    <strong>
                      25.00 <small>aDEMO</small>
                    </strong>
                    <p>The entry floor, in demo backing units</p>
                    <div className="scenario-track coral">
                      <i style={{ width: "50%" }} />
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : tab === "positions" ? (
            <section className="positions-section">
              <div className="eyebrow">YOUR EXPEDITION</div>
              <h1>Your positions.</h1>
              <p>
                Position records belong to the selected market. Connect the
                wallet that opened them.
              </p>
              <div className="market-switch inline">
                <button
                  className={market === "reference" ? "selected" : ""}
                  onClick={() => setMarket("reference")}
                >
                  Reference market
                </button>
                <button
                  className={market === "scenario" ? "selected" : ""}
                  onClick={() => setMarket("scenario")}
                >
                  Scenario lab
                </button>
              </div>
              {!account ? (
                <div className="empty-state">
                  <span>▱</span>
                  <h3>A clear view starts with your wallet.</h3>
                  <p>
                    Connect to read your Fuji positions. Connecting does not
                    move assets.
                  </p>
                  <button
                    className="primary-button"
                    disabled={busy}
                    onClick={connect}
                  >
                    Connect wallet →
                  </button>
                </div>
              ) : pool.positions.length === 0 ? (
                <div className="empty-state">
                  <span>△</span>
                  <h3>No open positions found.</h3>
                  <p>
                    {ready
                      ? "This epoch is capped at 100 positions. All its position IDs are scanned."
                      : "This market is awaiting its Fuji deployment."}
                  </p>
                  <button
                    className="secondary-button"
                    onClick={() => setTab("market")}
                  >
                    Explore market →
                  </button>
                </div>
              ) : (
                <div className="position-list">
                  {pool.positions.map((p) => {
                    let q = null;
                    try {
                      q = exitPreview(p.amount, p.floor, pool.price);
                    } catch {}
                    const unlocked = tick / 1000 >= Number(p.openedAt) + 60;
                    return (
                      <article key={String(p.id)} className="position-card">
                        <div>
                          <span className="eyebrow">
                            POSITION #{String(p.id)}
                          </span>
                          <h3>{num(p.amount, 18, 4)} AVAX</h3>
                          <p>Reserved entry backing: {num(p.floor)} aDEMO</p>
                          <small>
                            {unlocked
                              ? "Exit delay complete"
                              : `Exit available in ${Math.max(0, Math.ceil(Number(p.openedAt) + 60 - tick / 1000))}s`}
                          </small>
                        </div>
                        <div className="position-actions">
                          <button
                            disabled={
                              busy ||
                              !unlocked ||
                              !q ||
                              Boolean(readError) ||
                              epochEnded
                            }
                            onClick={() => transact("exitAvax", p)}
                          >
                            Keep {q ? num(q.avaxOut, 18, 5) : "—"} AVAX
                          </button>
                          <button
                            disabled={busy || !unlocked}
                            onClick={() => transact("exitBacking", p)}
                          >
                            Surrender for {num(p.floor)} aDEMO
                          </button>
                          {epochEnded ? (
                            <button
                              disabled={busy}
                              onClick={() => transact("settle", p)}
                            >
                              Settle expired position
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
              <section className="junior-position">
                <h3>Your junior backing</h3>
                {pool.claimable > 0n ? (
                  <div className="feedback">
                    {num(pool.claimable)} aDEMO credited by expiry settlement.
                    <button
                      className="secondary-button"
                      disabled={busy}
                      onClick={() => transact("claim")}
                    >
                      Claim backing
                    </button>
                  </div>
                ) : null}
                <p>
                  {num(pool.ownShares, 18, 4)} shares · Withdrawals include your
                  proportional aDEMO and junior AVAX inventory.
                </p>
                <div className="position-actions">
                  {epochEnded && pool.expiredPositions.length > 0 ? (
                    <button
                      disabled={busy}
                      onClick={() =>
                        transact("settle", pool.expiredPositions[0])
                      }
                    >
                      Settle next expired position (
                      {pool.expiredPositions.length} remaining)
                    </button>
                  ) : null}
                  <button
                    disabled={busy || pool.ownShares === 0n}
                    onClick={() => transact("notice")}
                  >
                    Start 120-second notice
                  </button>
                  <button
                    disabled={
                      busy ||
                      juniorLocked ||
                      pool.ownShares === 0n ||
                      pool.ready === 0n ||
                      tick / 1000 < Number(pool.ready)
                    }
                    onClick={() => transact("withdraw")}
                  >
                    Withdraw all available shares
                  </button>
                </div>
                <small>
                  {pool.ready > 0n
                    ? `Notice ${tick / 1000 >= Number(pool.ready) ? "matured" : `matures in ${Math.ceil(Number(pool.ready) - tick / 1000)}s`}. All protected positions must close or settle before redemption.`
                    : "A new junior deposit resets your withdrawal notice."}
                </small>
              </section>
            </section>
          ) : (
            <section className="assets-section">
              <div className="eyebrow">THE ASSET FIELD GUIDE</div>
              <h1>Identity before integration.</h1>
              <p>
                Every chain, asset and price source is explicit. No ticker
                stands in for a contract address.
              </p>
              <div className="asset-cards">
                <article>
                  <span className="pill">PILOT · FUJI 43113</span>
                  <h3>Native test AVAX</h3>
                  <p>
                    Used for gas and protected exposure. This pilot accepts
                    native AVAX directly; no custom wrapper is presented as
                    canonical WAVAX.
                  </p>
                  <a
                    href="https://build.avax.network/docs/primary-network"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Avalanche network documentation ↗
                  </a>
                </article>
                <article>
                  <span className="pill">PILOT · DEMO TOKEN</span>
                  <h3>Alpine Demo Dollar</h3>
                  <p>
                    aDEMO has 6 decimals and a public test faucet. It is not
                    Circle USDC, is not USD backed, and has no redemption claim
                    or monetary value.
                  </p>
                  {config.backingToken ? (
                    <a
                      href={explorer("address", config.backingToken)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {short(config.backingToken)} ↗
                    </a>
                  ) : (
                    <small>Address published after verified deployment</small>
                  )}
                </article>
                <article>
                  <span className="pill">RESEARCH · NOT ACTIVATED</span>
                  <h3>Circle native USDC</h3>
                  <p>
                    The first production backing candidate. The pilot tracks
                    Circle’s official Fuji identity separately and never
                    relabels aDEMO as USDC.
                  </p>
                  <code>{config.circleFujiUsdc}</code>
                  <a
                    href="https://developers.circle.com/stablecoins/usdc-contract-addresses"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Official Circle identities ↗
                  </a>
                </article>
                <article>
                  <span className="pill">RESEARCH · NOT ACTIVATED</span>
                  <h3>BENQI sAVAX</h3>
                  <p>
                    A future Avalanche yield asset. Redemption NAV, the
                    unstaking delay and executable market prices require
                    separate treatment. No sAVAX yield or liquidity is simulated
                    as live.
                  </p>
                  <a
                    href="https://docs.benqi.fi/resources/contracts/liquid-staking"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Official BENQI contracts ↗
                  </a>
                </article>
              </div>
              <div className="field-note">
                <h3>No new token needed.</h3>
                <p>
                  The pilot works through AVAX exposure and first-loss backing.
                  It does not require a YieldShield governance token,
                  incentives, a bridge or a new Avalanche L1. Before real
                  capital, the next gates are independent security review,
                  economic risk analysis, precise USDC and WAVAX adapters, and
                  reliable external testing.
                </p>
              </div>
            </section>
          )}
          <footer>
            <span>
              <img src="/mark.svg" alt="" /> YieldShield Alpine
            </span>
            <p>
              Experimental testnet software. No insurance, guaranteed returns or
              capital guarantee.
            </p>
            <a
              href="https://www.team1.network/grants"
              target="_blank"
              rel="noreferrer"
            >
              Built for Avalanche <Arrow />
            </a>
          </footer>
        </div>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
