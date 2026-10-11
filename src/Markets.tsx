import { useParams } from "react-router-dom";
import { useAlpine } from "./state";
import { assets, fmt, explorer } from "./chain";
import { PageTitle, RouteLink, MarketCard, Facts, Risk, Empty } from "./ui";
export function Markets({ home = false }: { home?: boolean }) {
  const { markets } = useAlpine();
  return (
    <>
      {home ? (
        <section className="hero">
          <div>
            <div className="eyebrow">YIELDSHIELD / AVALANCHE FIELD STATION</div>
            <h1>
              Explore the upside.
              <br />
              <em>Define your floor.</em>
            </h1>
            <p>
              A place for holders and capital providers to meet.
              <br />
              Three funded test assets. Two forms of backing.
              <br />
              One clear choice about who carries the downside.
            </p>
            <div className="button-row">
              <RouteLink className="secondary-button" to="/protect">
                Protect an asset ↗
              </RouteLink>
              <RouteLink className="secondary-button" to="/provide">
                Provide capital ↗
              </RouteLink>
            </div>
          </div>
          <div className="mountain-art" aria-hidden>
            <svg viewBox="0 0 500 330">
              <path d="M0 300 145 125 230 235 335 35 500 300Z" fill="#d9e7d8" />
              <path d="m145 125 85 110 105-200 165 265H230Z" fill="#b3cfb8" />
              <path d="m335 35-35 71 36-18 22 18Z" fill="#fffefa" />
              <path d="M0 300 125 200 245 300 320 190 500 300" fill="#729e80" />
              <path d="M0 310h500" stroke="#294d36" />
              <path
                d="M335 35v-26l35 10-35 7"
                fill="#ef775d"
                stroke="#526f51"
              />
            </svg>
            <span className="altitude">46° 51′ N · THE ALPINE EXPERIMENT</span>
          </div>
        </section>
      ) : (
        <PageTitle
          eyebrow="DISCOVER"
          title="Find your market."
          description="Compare the asset, backing token, price source and capacity before choosing a role."
        />
      )}
      <div className="market-heading">
        <div>
          <div className="eyebrow">EXPLORE THE RANGE</div>
          <h2>Protection markets</h2>
        </div>
        <RouteLink className="secondary-button" to="/create-pool">
          Create a market +
        </RouteLink>
      </div>
      <div className="catalog-grid">
        {markets.map((m) => (
          <MarketCard key={m.key} market={m} />
        ))}
      </div>
      <div className="field-note">
        <h3>A funded experiment.</h3>
        <p>
          All assets are valueless test tokens. awAVAX wraps actual Fuji AVAX;
          vaDEMO and bvaDEMO represent funded aDEMO vault deposits. sAVAX and
          Circle USDC are research references only and cannot be deposited here.
        </p>
        <RouteLink className="hero-link" to="/how-it-works">
          Read the field guide ↗
        </RouteLink>
      </div>
    </>
  );
}
export function PoolDetail() {
  const { key } = useParams();
  const { markets, snapshots, errors } = useAlpine();
  const market = markets.find(
    (m) => m.key.toLowerCase() === key?.toLowerCase(),
  );
  if (!market)
    return (
      <Empty title="Market not found">
        Return to <RouteLink to="/markets">markets</RouteLink> or refresh after
        the factory registry loads.
      </Empty>
    );
  const s = snapshots[market.key],
    asset = assets.find((a) => a.key === market.asset)!;
  return (
    <>
      <PageTitle
        eyebrow="MARKET DETAILS"
        title={market.name}
        description={`${asset.symbol} protected with ${market.backingSymbol} collateral. ${market.source}.`}
      />
      <div className="market-grid">
        <MarketCard market={market} />
        <article className="action-card">
          <h3>Know the terms</h3>
          <Facts
            items={[
              [
                "Collateral requirement",
                `${(s?.terms.collateralBps || 15000) / 100}%`,
              ],
              [
                "Gain fees: providers / creator / protocol",
                `${(s?.terms.juniorFeeBps ?? 1000) / 100}% / ${(s?.terms.creatorFeeBps ?? 100) / 100}% / 1%`,
              ],
              [
                "Earliest holder exit",
                `${s?.terms.exitDelay || 60} seconds after entry`,
              ],
              [
                "Provider notice",
                `${s?.terms.juniorNotice || 120} seconds + exposure clearance`,
              ],
              [
                "Maturity",
                s
                  ? new Date(Number(s.maturity) * 1000).toLocaleString("en-US")
                  : "Set at deployment",
              ],
              [
                "Remaining backing",
                s ? `${fmt(s.backing)} ${market.backingSymbol}` : "Unavailable",
              ],
              ["Open positions", s?.positions.length ?? "Unavailable"],
            ]}
          />
          {market.address && (
            <a
              className="contract-link"
              href={explorer("address", market.address)}
              target="_blank"
              rel="noreferrer"
            >
              Verify contract {market.address}
            </a>
          )}
          {errors[market.key] && (
            <p className="error-note">{errors[market.key]}</p>
          )}
        </article>
      </div>
      <Risk backing={market.backingSymbol} />
      <Risk provider backing={market.backingSymbol} />
      <div className="button-row">
        <RouteLink
          className="secondary-button"
          to={`/positions?pool=${market.key}`}
        >
          Positions
        </RouteLink>
        <RouteLink
          className="secondary-button"
          to={`/create-pool?pool=${market.key}`}
        >
          Create a fresh market
        </RouteLink>
      </div>
    </>
  );
}
