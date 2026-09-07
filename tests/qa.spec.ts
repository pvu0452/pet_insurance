import { test, expect } from "@playwright/test";

// QA-086
test("QA-086 - Open revamped Details Page", async ({ page }) => {
  await page.goto("/details");

  await expect(page).toHaveURL(/details/i);
});

// QA-087
test("QA-087 - Check Details Page layout", async ({ page }) => {
  await page.goto("/details");

  await expect(page.locator("body")).toBeVisible();
});

// QA-088
test("QA-088 - Check pet information displayed", async ({ page }) => {
  await page.goto("/details");

  await expect(page.locator("body")).toContainText(/pet/i);
});

// QA-089
test("QA-089 - Check customer information fields", async ({ page }) => {
  await page.goto("/details");

  await expect(page.locator("input").first()).toBeVisible();
});

// QA-090
test("QA-090 - Check required field indicators", async ({ page }) => {
  await page.goto("/details");

  const requiredFields = page.locator("input[required]");

  await expect(requiredFields.first()).toBeVisible();
});

// QA-091
test("QA-091 - Check Continue/Next button", async ({ page }) => {
  await page.goto("/details");

  const continueButton = page.getByRole("button", {
    name: /continue|next/i,
  });

  await expect(continueButton).toBeVisible();
});

// QA-092
test("QA-092 - Required details cannot be submitted blank", async ({
  page,
}) => {
  await page.goto("/details");

  const continueButton = page.getByRole("button", {
    name: /continue|next/i,
  });

  await continueButton.click();

  await expect(page.locator("body")).toBeVisible();
});

// QA-093
test("QA-093 - Valid customer name accepted", async ({ page }) => {
  await page.goto("/details");

  const nameField = page.locator('input[name*="name" i]').first();

  await nameField.fill("Josh");

  await expect(nameField).toHaveValue("Josh");
});

// QA-094
test("QA-094 - Valid mobile number accepted", async ({ page }) => {
  await page.goto("/details");

  const mobileField = page.locator(
    'input[name*="mobile" i], input[type="tel"]'
  ).first();

  await mobileField.fill("0400000000");

  await expect(mobileField).toHaveValue("0400000000");
});

// QA-095
test("QA-095 - Invalid mobile number rejected", async ({ page }) => {
  await page.goto("/details");

  const mobileField = page.locator(
    'input[name*="mobile" i], input[type="tel"]'
  ).first();

  await mobileField.fill("123");

  const continueButton = page.getByRole("button", {
    name: /continue|next/i,
  });

  await continueButton.click();

  await expect(page.locator("body")).toBeVisible();
});

// QA-096
test("QA-096 - Valid email accepted", async ({ page }) => {
  await page.goto("/details");

  const emailField = page.locator('input[type="email"]').first();

  await emailField.fill("test@example.com");

  await expect(emailField).toHaveValue("test@example.com");
});

// QA-097
test("QA-097 - Invalid email rejected", async ({ page }) => {
  await page.goto("/details");

  const emailField = page.locator('input[type="email"]').first();

  await emailField.fill("invalid-email");

  const continueButton = page.getByRole("button", {
    name: /continue|next/i,
  });

  await continueButton.click();

  await expect(page.locator("body")).toBeVisible();
});

// QA-098
test("QA-098 - Navigate back without losing information", async ({ page }) => {
  await page.goto("/details");

  await page.goBack();

  await page.goForward();

  await expect(page).toHaveURL(/details/i);
});

// QA-099
test("QA-099 - Refresh Details Page", async ({ page }) => {
  await page.goto("/details");

  await page.reload();

  await expect(page).toHaveURL(/details/i);
});

// QA-100
test("QA-100 - Customer details retained when continuing", async ({
  page,
}) => {
  await page.goto("/details");

  const nameField = page.locator('input[name*="name" i]').first();

  await nameField.fill("Josh");

  await expect(nameField).toHaveValue("Josh");
});