import { test, expect } from "@playwright/test";

test("missing search endpoint explains restart, and works after backend recovery", async ({
  page,
}) => {
  await page.route("**/api/market-data/search?**", (route) =>
    route.fulfill({
      status: 404,
      json: {
        error: { code: "HTTP_ERROR", message: "Not Found", details: [] },
      },
    }),
  );
  await page.goto("/simulator/eln");
  const search = page.getByRole("combobox", {
    name: "Stock, index or currency pair",
  });
  await search.click();
  await expect(page.getByRole("status")).toContainText("restart with run.cmd");
  await expect(
    page.getByRole("button", { name: "Save product", exact: true }),
  ).toBeDisabled();
  await page.unroute("**/api/market-data/search?**");
  await search.press("Escape");
  await page.getByLabel("Product name", { exact: true }).fill("NIFTY");
  await search.click();
  await page.getByRole("option", { name: /NIFTY 50/ }).click();
  await expect(
    page.getByRole("button", { name: "Save product", exact: true }),
  ).toBeEnabled();
});
const stored = (page) =>
  page.evaluate(
    () => JSON.parse(sessionStorage.getItem("astraforge.session.v1")).state,
  );
async function customer(page, name = "Customer One") {
  await page.goto("/clients");
  await page.getByLabel("Customer name", { exact: true }).fill(name);
  await page.getByLabel("Risk level", { exact: true }).selectOption("MODERATE");
  await page
    .getByLabel("Investment goal", { exact: true })
    .selectOption("INCOME");
  await page
    .getByLabel("How long can they invest? (months)", { exact: true })
    .fill("24");
  await page
    .getByLabel("Maximum loss they can accept (%)", { exact: true })
    .fill("20");
  await page
    .getByLabel("When will they need the money? (months)", { exact: true })
    .fill("24");
  await page.getByRole("button", { name: "Save customer & continue" }).click();
}
async function addProduct(page, type = "CPN", name = "Reusable note") {
  await page.goto("/simulator");
  await page.getByRole("link", { name: "Add " + type, exact: true }).click();
  await page.getByLabel("Product name", { exact: true }).fill(name);
  await page
    .getByRole("combobox", { name: "Stock, index or currency pair" })
    .click();
  await page
    .getByRole("option", { name: type === "DCD" ? /USD \/ INR/ : /NIFTY 50/ })
    .click();
  if (type === "DCD")
    await page.getByLabel("Agreed conversion rate", { exact: true }).fill("85");
  await expect(
    page.getByRole("button", { name: "Save product", exact: true }),
  ).toBeEnabled({ timeout: 60000 });
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page).toHaveURL(/simulator$/);
}
async function invest(page, amount = "100000") {
  await page.getByRole("button", { name: "Use product", exact: true }).click();
  await page.getByLabel(/^Amount to invest/).fill(amount);
  await page.getByRole("button", { name: "View results", exact: true }).click();
  await expect(
    page.getByText("Illustrative maturity value", { exact: true }),
  ).toBeVisible({ timeout: 90000 });
}
async function assessAndSave(page) {
  await page.getByRole("link", { name: /Check client suitability/ }).click();
  await expect(
    page.getByText("OVERALL ASSESSMENT", { exact: true }),
  ).toBeVisible({ timeout: 90000 });
  await expect(page.locator(".checklist > details")).toHaveCount(6);
  await expect(
    page.getByText("Missing information requires review before proceeding."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Save assessment to session/ })
    .click();
  await expect(page).toHaveURL(/history$/);
}
for (const type of ["ELN", "CPN"]) {
  test(
    type + " saved product through real API, assessment and reload",
    async ({ page }) => {
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await customer(page);
      await addProduct(page, type);
      await invest(page);
      await expect(page.locator("tbody tr")).toHaveCount(9);
      await page.getByText("See all market scenarios", { exact: true }).click();
      await expect(page.locator("tbody tr").first()).toBeVisible();
      await page.getByRole("tab", { name: "Historical backtest" }).click();
      await expect(
        page.getByText("Historical windows", { exact: true }),
      ).toBeVisible();
      await assessAndSave(page);
      await page.reload();
      await expect(
        page.getByRole("cell", { name: "Customer One", exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "View assessment" }).click();
      await expect(
        page.getByText("OVERALL ASSESSMENT", { exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: "test-results/" + type.toLowerCase() + "-suitability.png",
        fullPage: true,
      });
      expect((await stored(page)).products).toHaveLength(1);
      expect(errors).toEqual([]);
    },
  );
}
test("reuse for another customer, different amount, independent results and immutable saved assessment", async ({
  page,
}) => {
  await customer(page);
  await addProduct(page);
  await invest(page);
  await assessAndSave(page);
  const first = await stored(page);
  await page.goto("/simulator");
  await page.getByRole("button", { name: "New customer", exact: true }).click();
  await expect(page.getByLabel("Customer name", { exact: true })).toHaveValue(
    "",
  );
  await customer(page, "Customer Two");
  await invest(page, "250000");
  await assessAndSave(page);
  const second = await stored(page);
  expect(second.products).toEqual(first.products);
  expect(second.history).toHaveLength(2);
  expect(second.history[1]).toEqual(first.history[0]);
  expect(second.history[0].product.config.investment).toBe(250000);
  expect(second.history[0].client.client_id).not.toBe(
    first.history[0].client.client_id,
  );
  await page.goto("/simulator");
  await page.getByRole("link", { name: "Edit saved product" }).click();
  await page.getByLabel("Product name", { exact: true }).fill("Updated note");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("heading", { name: "Updated note" }),
  ).toBeVisible();
  const edited = await stored(page);
  expect(edited.history).toEqual(second.history);
  expect(edited.products).toHaveLength(1);
});
test("DCD reuse flow (provider-price fixture; calculation and suitability use real API)", async ({
  page,
}) => {
  const instrument = {
    ticker: "USDINR=X",
    label: "USD / INR",
    currency: "INR",
    kind: "fx",
    deposit: "USD",
    alternate: "INR",
  };
  const market = {
    ticker: "USDINR=X",
    instrument,
    currency: "INR",
    source: "Test fixture",
    as_of: "2026-01-01",
    fetched_at: "2026-01-01",
    count: 2,
    latest_price: 83,
    warnings: ["Test fixture, not live data"],
    prices: [
      { date: "2025-12-31", close: 82 },
      { date: "2026-01-01", close: 83 },
    ],
  };
  await page.route("**/api/market-data/history?ticker=USDINR%3DX", (route) =>
    route.fulfill({ json: market }),
  );
  await page.route("**/api/products/prepare", (route) => {
    const body = route.request().postDataJSON();
    return route.fulfill({
      json: {
        market,
        configuration: {
          product_type: "DCD",
          ticker: "USDINR=X",
          dcd_config: {
            ...body.template.dcd_terms,
            deposit_currency: "USD",
            alternate_currency: "INR",
            deposit_amount: body.investment_amount,
            initial_fx_rate: 83,
            maturity_fx_rate: 83,
          },
        },
      },
    });
  });
  await customer(page);
  await addProduct(page, "DCD", "FX deposit");
  await invest(page);
  await expect(
    page.getByText("Actual settlement legs", { exact: false }),
  ).toBeVisible();
  await assessAndSave(page);
  expect((await stored(page)).product.config.deposit_currency).toBe("USD");
});
test("invalid terms, duplicate names, unavailable API and dynamic search keyboard selection", async ({
  page,
}) => {
  await addProduct(page);
  await page.getByRole("link", { name: "Add ELN", exact: true }).click();
  await page.getByLabel("Product name", { exact: true }).fill("Reusable note");
  await page
    .getByRole("combobox", { name: "Stock, index or currency pair" })
    .click();
  await page.getByRole("option", { name: /NIFTY 50/ }).click();
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("already exists");
  await page.getByLabel("Product name", { exact: true }).fill("Invalid note");
  await page
    .getByLabel("Loss trigger (% of starting price)", { exact: true })
    .fill("100");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("must be lower");
  await page
    .getByLabel("Loss trigger (% of starting price)", { exact: true })
    .fill("70");
  await page.route("**/api/products/validate", (route) => route.abort());
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Cannot reach");
  await page.route("**/api/market-data/search?**", (route) =>
    route.fulfill({
      json: {
        results: [
          {
            ticker: "AAPL",
            label: "Apple Inc.",
            kind: "equity",
            exchange: "NASDAQ",
          },
        ],
        warning: null,
      },
    }),
  );
  await page.route("**/api/market-data/history?ticker=AAPL", (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: {
          code: "MARKET_DATA_UNAVAILABLE",
          message: "Provider unavailable",
        },
      },
    }),
  );
  const search = page.getByRole("combobox", {
    name: "Stock, index or currency pair",
  });
  await search.fill("Apple");
  await expect(page.getByRole("option", { name: /Apple Inc/ })).toBeVisible();
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(
    page.getByRole("alert").filter({ hasText: "Provider unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save product", exact: true }),
  ).toBeDisabled();
});
test("editing customer clears active calculations and preserves product library", async ({
  page,
}) => {
  await customer(page);
  await addProduct(page);
  await invest(page);
  await page.goto("/clients");
  await page.getByLabel("Customer name", { exact: true }).fill("Edited name");
  await page.getByRole("button", { name: "Save customer & continue" }).click();
  await expect(page).toHaveURL(/investment$/);
  const data = await stored(page);
  expect(data.simulation).toBeNull();
  expect(data.evaluation).toBeNull();
  expect(data.product).toBeNull();
  expect(data.products).toHaveLength(1);
});
test("mobile layout and only six primary customer inputs", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Customer assessments", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.goto("/clients");
  await expect(page.locator("input:visible,select:visible")).toHaveCount(6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/customer-mobile.png",
    fullPage: true,
  });
  await addProduct(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/products-desktop.png",
    fullPage: true,
  });
});
test("optional holdings block wrong currency and oversized investments", async ({
  page,
}) => {
  await customer(page);
  await addProduct(page);
  await page.goto("/clients");
  await page
    .getByText("Optional: existing investments", { exact: true })
    .click();
  await page.getByLabel("Total investments", { exact: true }).fill("1000000");
  await page
    .getByLabel("Currency of existing investments", { exact: true })
    .selectOption("USD");
  await page.getByRole("button", { name: "Save customer & continue" }).click();
  await page.getByLabel(/^Amount to invest/).fill("100000");
  await page.getByRole("button", { name: "View results", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("No currency conversion");
  await page.getByRole("link", { name: "Edit customer", exact: true }).click();
  await page
    .getByText("Optional: existing investments", { exact: true })
    .click();
  await page
    .getByLabel("Currency of existing investments", { exact: true })
    .selectOption("INR");
  await page.getByRole("button", { name: "Save customer & continue" }).click();
  await page.getByLabel(/^Amount to invest/).fill("2000000");
  await page.getByRole("button", { name: "View results", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("exceeds");
});
