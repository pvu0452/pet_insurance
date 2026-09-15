# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa.spec.ts >> QA-119 - Customer details section is displayed
- Location: tests/qa.spec.ts:402:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('body')
Expected pattern: /customer|personal details/i
Received string:  "Your detailsReview your information before completing your purchase.QuotePlansDetailsYour DetailsFirst NameLast NameMobile NumberEmailReview your pet detailsAddress, name, DOB, breed and sex▼Review your pet coverAnnual limit, benefit, excess and plan▼Important InformationPlease review and acknowledge the information below before purchasing.▼I confirm all the statements above and acknowledge that I have read and understood the important information.Privacy PolicyPlease review how your personal information is handled.▼I have read, understood and agree to the Privacy Policy.BackConfirm and Pay"
Timeout: 5000ms

Call log:
  - Expect "toContainText" locator('body') with timeout 5000ms
  - waiting for locator('body')
    - locator resolved to <body class="min-h-full flex flex-col">…</body>
    - unexpected value "Loading your detailsPlease wait while we prepare your quote."
    13 × locator resolved to <body class="min-h-full flex flex-col">…</body>
       - unexpected value "Your detailsReview your information before completing your purchase.QuotePlansDetailsYour DetailsFirst NameLast NameMobile NumberEmailReview your pet detailsAddress, name, DOB, breed and sex▼Review your pet coverAnnual limit, benefit, excess and plan▼Important InformationPlease review and acknowledge the information below before purchasing.▼I confirm all the statements above and acknowledge that I have read and understood the important information.Privacy PolicyPlease review how your personal information is handled.▼I have read, understood and agree to the Privacy Policy.BackConfirm and Pay"

```

```yaml
- img "WAS Insurance"
- heading "Your details" [level=1]
- paragraph: Review your information before completing your purchase.
- text: Quote Plans Details
- heading "Your Details" [level=2]
- text: First Name
- textbox
- text: Last Name
- textbox
- text: Mobile Number
- textbox
- text: Email
- textbox
- button "Review your pet details Address, name, DOB, breed and sex ▼":
  - heading "Review your pet details" [level=2]
  - paragraph: Address, name, DOB, breed and sex
  - text: ▼
- button "Review your pet cover Annual limit, benefit, excess and plan ▼":
  - heading "Review your pet cover" [level=2]
  - paragraph: Annual limit, benefit, excess and plan
  - text: ▼
- button "Important Information Please review and acknowledge the information below before purchasing. ▼":
  - heading "Important Information" [level=3]
  - paragraph: Please review and acknowledge the information below before purchasing.
  - text: ▼
- checkbox "I confirm all the statements above and acknowledge that I have read and understood the important information."
- text: I confirm all the statements above and acknowledge that I have read and understood the important information.
- button "Privacy Policy Please review how your personal information is handled. ▼":
  - heading "Privacy Policy" [level=3]
  - paragraph: Please review how your personal information is handled.
  - text: ▼
- checkbox "I have read, understood and agree to the Privacy Policy."
- text: I have read, understood and agree to the Privacy Policy.
- button "Back"
- button "Confirm and Pay" [disabled]
- alert
```

# Test source

```ts
  305 |   const mobileField = page.locator(
  306 |     'input[name*="mobile" i], input[type="tel"]'
  307 |   ).first();
  308 | 
  309 |   await mobileField.fill("040000");
  310 | 
  311 |   const continueButton = page.getByRole("button", {
  312 |     name: /continue|next/i,
  313 |   });
  314 | 
  315 |   await continueButton.click();
  316 | 
  317 |   await expect(page).toHaveURL(/details/i);
  318 | });
  319 | 
  320 | // QA-112
  321 | test("QA-112 - Mobile number accepts valid Australian number", async ({
  322 |   page,
  323 | }) => {
  324 |   await page.goto("/details");
  325 | 
  326 |   const mobileField = page.locator(
  327 |     'input[name*="mobile" i], input[type="tel"]'
  328 |   ).first();
  329 | 
  330 |   await mobileField.fill("0400000000");
  331 | 
  332 |   await expect(mobileField).toHaveValue("0400000000");
  333 | });
  334 | 
  335 | // QA-113
  336 | test("QA-113 - Email rejects missing @ symbol", async ({ page }) => {
  337 |   await page.goto("/details");
  338 | 
  339 |   const emailField = page.locator('input[type="email"]').first();
  340 | 
  341 |   await emailField.fill("testexample.com");
  342 | 
  343 |   const continueButton = page.getByRole("button", {
  344 |     name: /continue|next/i,
  345 |   });
  346 | 
  347 |   await continueButton.click();
  348 | 
  349 |   await expect(page).toHaveURL(/details/i);
  350 | });
  351 | 
  352 | // QA-114
  353 | test("QA-114 - Email rejects missing domain", async ({ page }) => {
  354 |   await page.goto("/details");
  355 | 
  356 |   const emailField = page.locator('input[type="email"]').first();
  357 | 
  358 |   await emailField.fill("test@");
  359 | 
  360 |   const continueButton = page.getByRole("button", {
  361 |     name: /continue|next/i,
  362 |   });
  363 | 
  364 |   await continueButton.click();
  365 | 
  366 |   await expect(page).toHaveURL(/details/i);
  367 | });
  368 | 
  369 | // QA-115
  370 | test("QA-115 - Email accepts valid email address", async ({ page }) => {
  371 |   await page.goto("/details");
  372 | 
  373 |   const emailField = page.locator('input[type="email"]').first();
  374 | 
  375 |   await emailField.fill("josh@example.com");
  376 | 
  377 |   await expect(emailField).toHaveValue("josh@example.com");
  378 | });
  379 | 
  380 | // QA-116
  381 | test("QA-116 - Quote price is displayed", async ({ page }) => {
  382 |   await page.goto("/details");
  383 | 
  384 |   await expect(page.locator("body")).toContainText(/\$/);
  385 | });
  386 | 
  387 | // QA-117
  388 | test("QA-117 - Selected plan is displayed correctly", async ({ page }) => {
  389 |   await page.goto("/details");
  390 | 
  391 |   await expect(page.locator("body")).toContainText(/silver|gold|plan/i);
  392 | });
  393 | 
  394 | // QA-118
  395 | test("QA-118 - Quote contains pet information", async ({ page }) => {
  396 |   await page.goto("/details");
  397 | 
  398 |   await expect(page.locator("body")).toContainText(/pet/i);
  399 | });
  400 | 
  401 | // QA-119
  402 | test("QA-119 - Customer details section is displayed", async ({ page }) => {
  403 |   await page.goto("/details");
  404 | 
> 405 |   await expect(page.locator("body")).toContainText(
      |                                      ^ Error: expect(locator).toContainText(expected) failed
  406 |     /customer|personal details/i
  407 |   );
  408 | });
  409 | 
  410 | // QA-120
  411 | test("QA-120 - Continue button exists when required fields are empty",
  412 |   async ({ page }) => {
  413 |     await page.goto("/details");
  414 | 
  415 |     const continueButton = page.getByRole("button", {
  416 |       name: /continue|next/i,
  417 |     });
  418 | 
  419 |     await expect(continueButton).toBeVisible();
  420 |   }
  421 | );
  422 | 
  423 | // QA-121
  424 | test("QA-121 - Valid customer details allow user to continue", async ({
  425 |   page,
  426 | }) => {
  427 |   await page.goto("/details");
  428 | 
  429 |   const firstName = page.locator('input[name*="first" i]').first();
  430 |   const lastName = page.locator('input[name*="last" i]').first();
  431 |   const mobile = page.locator(
  432 |     'input[name*="mobile" i], input[type="tel"]'
  433 |   ).first();
  434 |   const email = page.locator('input[type="email"]').first();
  435 | 
  436 |   await firstName.fill("Josh");
  437 |   await lastName.fill("Smith");
  438 |   await mobile.fill("0400000000");
  439 |   await email.fill("josh@example.com");
  440 | 
  441 |   const continueButton = page.getByRole("button", {
  442 |     name: /continue|next/i,
  443 |   });
  444 | 
  445 |   await continueButton.click();
  446 | 
  447 |   await expect(page).not.toHaveURL(/details/i);
  448 | });
  449 | 
  450 | // QA-122
  451 | test("QA-122 - Invalid first name prevents continuing", async ({ page }) => {
  452 |   await page.goto("/details");
  453 | 
  454 |   const firstName = page.locator('input[name*="first" i]').first();
  455 | 
  456 |   await firstName.fill("Josh123");
  457 | 
  458 |   const continueButton = page.getByRole("button", {
  459 |     name: /continue|next/i,
  460 |   });
  461 | 
  462 |   await continueButton.click();
  463 | 
  464 |   await expect(page).toHaveURL(/details/i);
  465 | });
  466 | 
  467 | // QA-123
  468 | test("QA-123 - Invalid last name prevents continuing", async ({ page }) => {
  469 |   await page.goto("/details");
  470 | 
  471 |   const lastName = page.locator('input[name*="last" i]').first();
  472 | 
  473 |   await lastName.fill("Smith123");
  474 | 
  475 |   const continueButton = page.getByRole("button", {
  476 |     name: /continue|next/i,
  477 |   });
  478 | 
  479 |   await continueButton.click();
  480 | 
  481 |   await expect(page).toHaveURL(/details/i);
  482 | });
  483 | 
  484 | // QA-124
  485 | test("QA-124 - Invalid email prevents continuing", async ({ page }) => {
  486 |   await page.goto("/details");
  487 | 
  488 |   const email = page.locator('input[type="email"]').first();
  489 | 
  490 |   await email.fill("not-an-email");
  491 | 
  492 |   const continueButton = page.getByRole("button", {
  493 |     name: /continue|next/i,
  494 |   });
  495 | 
  496 |   await continueButton.click();
  497 | 
  498 |   await expect(page).toHaveURL(/details/i);
  499 | });
  500 | 
  501 | // QA-125
  502 | test("QA-125 - Invalid mobile prevents continuing", async ({ page }) => {
  503 |   await page.goto("/details");
  504 | 
  505 |   const mobile = page.locator(
```