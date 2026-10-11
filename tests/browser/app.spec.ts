import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.route("https://api.avax-test.network/**", (route) =>
    route.abort(),
  );
});
test("desktop market, disclosures, simulator and no-wallet feedback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Reach higher. Know your footing." }),
  ).toBeVisible();
  await expect(page.getByText("Contract deployment pending")).toBeVisible();
  await expect(page.getByText(/At the 7-day epoch end/)).toBeVisible();
  await page.getByRole("slider").fill("60");
  await expect(page.getByText("+60%", { exact: true })).toHaveCount(2);
  await page
    .getByRole("button", { name: "Connect wallet", exact: false })
    .first()
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Ethereum-compatible wallet",
  );
  await page
    .getByRole("button", { name: "Provide backing", exact: true })
    .click();
  await expect(
    page.getByText(/Junior entry and withdrawals freeze/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Get 10,000 free aDEMO" }),
  ).toBeDisabled();
  await page.screenshot({ path: "docs/evidence/desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Asset field guide" }).click();
  await expect(
    page.getByRole("heading", { name: "Identity before integration." }),
  ).toBeVisible();
  await expect(
    page.getByText("0x5425890298aed601595a70AB815c96711a31Bc65"),
  ).toBeVisible();
});
test("mobile navigation and layout remain usable without RPC", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Reach higher. Know your footing." }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "docs/evidence/mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Your positions" }).click();
  await expect(
    page.getByRole("heading", {
      name: "A clear view starts with your wallet.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Asset field guide" }).click();
  await expect(
    page.getByRole("heading", { name: "No new token needed." }),
  ).toBeVisible();
});
test("wallet account and network changes clear the connected session", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let account = "0x1111111111111111111111111111111111111111";
    let chain = "0xa869";
    const listeners: Record<string, Set<(...args: unknown[]) => void>> = {};
    const provider = {
      async request({ method }: { method: string }) {
        if (method === "eth_requestAccounts" || method === "eth_accounts")
          return [account];
        if (method === "eth_chainId") return chain;
        if (method === "wallet_switchEthereumChain") {
          chain = "0xa869";
          return null;
        }
        throw new Error(`Unexpected wallet method ${method}`);
      },
      on(event: string, callback: (...args: unknown[]) => void) {
        (listeners[event] ??= new Set()).add(callback);
      },
      removeListener(event: string, callback: (...args: unknown[]) => void) {
        listeners[event]?.delete(callback);
      },
    };
    Object.assign(window, {
      ethereum: provider,
      testWalletChange(event: string) {
        if (event === "accountsChanged")
          account = "0x2222222222222222222222222222222222222222";
        else chain = "0x1";
        listeners[event]?.forEach((callback) =>
          callback(event === "accountsChanged" ? [account] : chain),
        );
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Connect wallet", exact: false })
    .first()
    .click();
  await expect(page.getByRole("button", { name: /0x1111…1111/ })).toBeVisible();
  await page.evaluate(() =>
    (window as any).testWalletChange("accountsChanged"),
  );
  await expect(
    page.getByRole("button", { name: "Connect wallet", exact: false }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Connect wallet", exact: false })
    .first()
    .click();
  await expect(page.getByRole("button", { name: /0x2222…2222/ })).toBeVisible();
  await page.evaluate(() => (window as any).testWalletChange("chainChanged"));
  await expect(
    page.getByRole("button", { name: "Connect wallet", exact: false }).first(),
  ).toBeVisible();
});
