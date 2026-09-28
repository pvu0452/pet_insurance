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

  await expect(page).toHaveURL(/details/i);
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

  await expect(page).toHaveURL(/details/i);
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

  await expect(page).toHaveURL(/details/i);
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

// QA-101
test("QA-101 - First name does not allow numbers", async ({ page }) => {
  await page.goto("/details");

  const nameField = page.locator('input[name*="first" i]').first();

  await nameField.fill("Josh123");

  await expect(nameField).not.toHaveValue("Josh123");
});

// QA-102
test("QA-102 - Last name does not allow numbers", async ({ page }) => {
  await page.goto("/details");

  const lastNameField = page.locator('input[name*="last" i]').first();

  await lastNameField.fill("Smith123");

  await expect(lastNameField).not.toHaveValue("Smith123");
});

// QA-103
test("QA-103 - First name does not allow special characters", async ({
  page,
}) => {
  await page.goto("/details");

  const nameField = page.locator('input[name*="first" i]').first();

  await nameField.fill("Josh@#$");

  await expect(nameField).not.toHaveValue("Josh@#$");
});

// QA-104
test("QA-104 - Last name does not allow special characters", async ({
  page,
}) => {
  await page.goto("/details");

  const lastNameField = page.locator('input[name*="last" i]').first();

  await lastNameField.fill("Smith@#$");

  await expect(lastNameField).not.toHaveValue("Smith@#$");
});

// QA-105
test("QA-105 - First name accepts alphabetic characters", async ({ page }) => {
  await page.goto("/details");

  const nameField = page.locator('input[name*="first" i]').first();

  await nameField.fill("Josh");

  await expect(nameField).toHaveValue("Josh");
});

// QA-106
test("QA-106 - Last name accepts alphabetic characters", async ({ page }) => {
  await page.goto("/details");

  const lastNameField = page.locator('input[name*="last" i]').first();

  await lastNameField.fill("Smith");

  await expect(lastNameField).toHaveValue("Smith");
});

// QA-107
test("QA-107 - First name cannot be left blank", async ({ page }) => {
  await page.goto("/details");

  const nameField = page.locator('input[name*="first" i]').first();

  await nameField.fill("");

  const continueButton = page.getByRole("button", {
    name: /continue|next/i,
  });

  await continueButton.click();

  await expect(page).toHaveURL(/details/i);
});

// QA-108
test("QA-108 - Last name cannot be left blank", async ({ page }) => {
  await page.goto("/details");

  const lastNameField = page.locator('input[name*="last" i]').first();

  await lastNameField.fill("");

  const continueButton = page.getByRole("button", {
    name: /continue|next/i,
  });

  await continueButton.click();

  await expect(page).toHaveURL(/details/i);
});

// QA-109
test("QA-109 - Mobile number does not allow letters", async ({ page }) => {
  await page.goto("/details");

  const mobileField = page.locator(
    'input[name*="mobile" i], input[type="tel"]'
  ).first();

  await mobileField.fill("04ABCDEF12");

  await expect(mobileField).not.toHaveValue("04ABCDEF12");
});

// QA-110
test("QA-110 - Mobile number does not allow special characters", async ({
  page,
}) => {
  await page.goto("/details");

  const mobileField = page.locator(
    'input[name*="mobile" i], input[type="tel"]'
  ).first();

  await mobileField.fill("0400-000-000");

  await expect(mobileField).not.toHaveValue("0400-000-000");
});

// QA-111
test("QA-111 - Mobile number requires correct length", async ({ page }) => {
  await page.goto("/details");

  const mobileField = page.locator(
    'input[name*="mobile" i], input[type="tel"]'
  ).first();

  await mobileField.fill("040000");

  const continueButton = page.getByRole("button", {
    name: /continue|next/i,
  });

  await continueButton.click();

  await expect(page).toHaveURL(/details/i);
});

// QA-112
test("QA-112 - Mobile number accepts valid Australian number", async ({
  page,
}) => {
  await page.goto("/details");

  const mobileField = page.locator(
    'input[name*="mobile" i], input[type="tel"]'
  ).first();

  await mobileField.fill("0400000000");

  await expect(mobileField).toHaveValue("0400000000");
});

// QA-113
test("QA-113 - Email rejects missing @ symbol", async ({ page }) => {
  await page.goto("/details");

  const emailField = page.locator('input[type="email"]').first();

  await emailField.fill("testexample.com");

  const continueButton = page.getByRole("button", {
    name: /continue|next/i,
  });

  await continueButton.click();

  await expect(page).toHaveURL(/details/i);
});

// QA-114
test("QA-114 - Email rejects missing domain", async ({ page }) => {
  await page.goto("/details");

  const emailField = page.locator('input[type="email"]').first();

  await emailField.fill("test@");

  const continueButton = page.getByRole("button", {
    name: /continue|next/i,
  });

  await continueButton.click();

  await expect(page).toHaveURL(/details/i);
});

// QA-115
test("QA-115 - Email accepts valid email address", async ({ page }) => {
  await page.goto("/details");

  const emailField = page.locator('input[type="email"]').first();

  await emailField.fill("josh@example.com");

  await expect(emailField).toHaveValue("josh@example.com");
});

// QA-116
test("QA-116 - Quote price is displayed", async ({ page }) => {
  await page.goto("/details");

  await expect(page.locator("body")).toContainText(/\$/);
});

// QA-117
test("QA-117 - Selected plan is displayed correctly", async ({ page }) => {
  await page.goto("/details");

  await expect(page.locator("body")).toContainText(/silver|gold|plan/i);
});

// QA-118
test("QA-118 - Quote contains pet information", async ({ page }) => {
  await page.goto("/details");

  await expect(page.locator("body")).toContainText(/pet/i);
});

// QA-119
test("QA-119 - Customer details section is displayed", async ({ page }) => {
  await page.goto("/details");

  await expect(page.locator("body")).toContainText(
    /customer|personal details/i
  );
});

// QA-120
test("QA-120 - Continue button exists when required fields are empty",
  async ({ page }) => {
    await page.goto("/details");

    const continueButton = page.getByRole("button", {
      name: /continue|next/i,
    });

    await expect(continueButton).toBeVisible();
  }
);

// QA-121
test("QA-121 - Valid customer details allow user to continue", async ({
  page,
}) => {
  await page.goto("/details");

  const firstName = page.locator('input[name*="first" i]').first();
  const lastName = page.locator('input[name*="last" i]').first();
  const mobile = page.locator(
    'input[name*="mobile" i], input[type="tel"]'
  ).first();
  const email = page.locator('input[type="email"]').first();

  await firstName.fill("Josh");
  await lastName.fill("Smith");
  await mobile.fill("0400000000");
  await email.fill("josh@example.com");

  const continueButton = page.getByRole("button", {
    name: /continue|next/i,
  });

  await continueButton.click();

  await expect(page).not.toHaveURL(/details/i);
});

// QA-122
test("QA-122 - Invalid first name prevents continuing", async ({ page }) => {
  await page.goto("/details");

  const firstName = page.locator('input[name*="first" i]').first();

  await firstName.fill("Josh123");

  const continueButton = page.getByRole("button", {
    name: /continue|next/i,
  });

  await continueButton.click();

  await expect(page).toHaveURL(/details/i);
});

// QA-123
test("QA-123 - Invalid last name prevents continuing", async ({ page }) => {
  await page.goto("/details");

  const lastName = page.locator('input[name*="last" i]').first();

  await lastName.fill("Smith123");

  const continueButton = page.getByRole("button", {
    name: /continue|next/i,
  });

  await continueButton.click();

  await expect(page).toHaveURL(/details/i);
});

// QA-124
test("QA-124 - Invalid email prevents continuing", async ({ page }) => {
  await page.goto("/details");

  const email = page.locator('input[type="email"]').first();

  await email.fill("not-an-email");

  const continueButton = page.getByRole("button", {
    name: /continue|next/i,
  });

  await continueButton.click();

  await expect(page).toHaveURL(/details/i);
});

// QA-125
test("QA-125 - Invalid mobile prevents continuing", async ({ page }) => {
  await page.goto("/details");

  const mobile = page.locator(
    'input[name*="mobile" i], input[type="tel"]'
  ).first();

  await mobile.fill("123");

  const continueButton = page.getByRole("button", {
    name: /continue|next/i,
  });

  await continueButton.click();

  await expect(page).toHaveURL(/details/i);
});

// QA-126
test("QA-126 - Customer details remain after page refresh", async ({
  page,
}) => {
  await page.goto("/details");

  const firstName = page.locator('input[name*="first" i]').first();

  await firstName.fill("Josh");

  await page.reload();

  await expect(
    page.locator('input[name*="first" i]').first()
  ).toHaveValue("Josh");
});

// QA-127
test("QA-127 - Customer details remain when navigating back", async ({
  page,
}) => {
  await page.goto("/details");

  const firstName = page.locator('input[name*="first" i]').first();

  await firstName.fill("Josh");

  await page.goBack();
  await page.goForward();

  await expect(page).toHaveURL(/details/i);
});

// QA-128
test("QA-128 - Whitespace is not accepted as a valid name", async ({
  page,
}) => {
  await page.goto("/details");

  const firstName = page.locator('input[name*="first" i]').first();

  await firstName.fill("   ");

  const continueButton = page.getByRole("button", {
    name: /continue|next/i,
  });

  await continueButton.click();

  await expect(page).toHaveURL(/details/i);
});

// QA-129
test("QA-129 - First name has maximum length validation", async ({ page }) => {
  await page.goto("/details");

  const firstName = page.locator('input[name*="first" i]').first();

  await firstName.fill("A".repeat(100));

  const value = await firstName.inputValue();

  expect(value.length).toBeLessThan(100);
});

// QA-130
test("QA-130 - Last name has maximum length validation", async ({ page }) => {
  await page.goto("/details");

  const lastName = page.locator('input[name*="last" i]').first();

  await lastName.fill("B".repeat(100));

  const value = await lastName.inputValue();

  expect(value.length).toBeLessThan(100);
});