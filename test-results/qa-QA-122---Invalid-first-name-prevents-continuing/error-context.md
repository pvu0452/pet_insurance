# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa.spec.ts >> QA-122 - Invalid first name prevents continuing
- Location: tests/qa.spec.ts:451:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name*="first" i]').first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - img "WAS Insurance" [ref=e4]
    - generic [ref=e5]:
      - heading "Your details" [level=1] [ref=e6]
      - paragraph [ref=e7]: Review your information before completing your purchase.
    - generic [ref=e9]:
      - generic [ref=e10]: Quote
      - generic [ref=e11]: Plans
      - generic [ref=e12]: Details
    - generic [ref=e15]:
      - heading "Your Details" [level=2] [ref=e17]
      - generic [ref=e18]:
        - generic [ref=e19]:
          - generic [ref=e20]:
            - generic [ref=e21]: First Name
            - textbox [ref=e22]
          - generic [ref=e23]:
            - generic [ref=e24]: Last Name
            - textbox [ref=e25]
        - generic [ref=e26]:
          - generic [ref=e27]: Mobile Number
          - textbox [ref=e28]
        - generic [ref=e29]:
          - generic [ref=e30]: Email
          - textbox [ref=e31]
    - button "Review your pet details Address, name, DOB, breed and sex ▼" [ref=e33]:
      - generic [ref=e34]:
        - heading "Review your pet details" [level=2] [ref=e35]
        - paragraph [ref=e36]: Address, name, DOB, breed and sex
      - generic [ref=e37]: ▼
    - button "Review your pet cover Annual limit, benefit, excess and plan ▼" [ref=e39]:
      - generic [ref=e40]:
        - heading "Review your pet cover" [level=2] [ref=e42]
        - paragraph [ref=e43]: Annual limit, benefit, excess and plan
      - generic [ref=e44]: ▼
    - generic [ref=e46]:
      - generic [ref=e47]:
        - button "Important Information Please review and acknowledge the information below before purchasing. ▼" [ref=e48]:
          - generic [ref=e49]:
            - heading "Important Information" [level=3] [ref=e50]
            - paragraph [ref=e51]: Please review and acknowledge the information below before purchasing.
          - generic [ref=e52]: ▼
        - generic [ref=e53] [cursor=pointer]:
          - checkbox "I confirm all the statements above and acknowledge that I have read and understood the important information." [ref=e54]
          - generic [ref=e55]: I confirm all the statements above and acknowledge that I have read and understood the important information.
      - generic [ref=e56]:
        - button "Privacy Policy Please review how your personal information is handled. ▼" [ref=e57]:
          - generic [ref=e58]:
            - heading "Privacy Policy" [level=3] [ref=e59]
            - paragraph [ref=e60]: Please review how your personal information is handled.
          - generic [ref=e61]: ▼
        - generic [ref=e62] [cursor=pointer]:
          - checkbox "I have read, understood and agree to the Privacy Policy." [ref=e63]
          - generic [ref=e64]: I have read, understood and agree to the Privacy Policy.
    - generic [ref=e65]:
      - button "Back" [ref=e66]
      - button "Confirm and Pay" [disabled] [ref=e67]
  - button "Open Next.js Dev Tools" [ref=e73] [cursor=pointer]
  - alert [ref=e77]
```

# Test source

```ts
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
  405 |   await expect(page.locator("body")).toContainText(
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
> 456 |   await firstName.fill("Josh123");
      |                   ^ Error: locator.fill: Test timeout of 30000ms exceeded.
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
  506 |     'input[name*="mobile" i], input[type="tel"]'
  507 |   ).first();
  508 | 
  509 |   await mobile.fill("123");
  510 | 
  511 |   const continueButton = page.getByRole("button", {
  512 |     name: /continue|next/i,
  513 |   });
  514 | 
  515 |   await continueButton.click();
  516 | 
  517 |   await expect(page).toHaveURL(/details/i);
  518 | });
  519 | 
  520 | // QA-126
  521 | test("QA-126 - Customer details remain after page refresh", async ({
  522 |   page,
  523 | }) => {
  524 |   await page.goto("/details");
  525 | 
  526 |   const firstName = page.locator('input[name*="first" i]').first();
  527 | 
  528 |   await firstName.fill("Josh");
  529 | 
  530 |   await page.reload();
  531 | 
  532 |   await expect(
  533 |     page.locator('input[name*="first" i]').first()
  534 |   ).toHaveValue("Josh");
  535 | });
  536 | 
  537 | // QA-127
  538 | test("QA-127 - Customer details remain when navigating back", async ({
  539 |   page,
  540 | }) => {
  541 |   await page.goto("/details");
  542 | 
  543 |   const firstName = page.locator('input[name*="first" i]').first();
  544 | 
  545 |   await firstName.fill("Josh");
  546 | 
  547 |   await page.goBack();
  548 |   await page.goForward();
  549 | 
  550 |   await expect(page).toHaveURL(/details/i);
  551 | });
  552 | 
  553 | // QA-128
  554 | test("QA-128 - Whitespace is not accepted as a valid name", async ({
  555 |   page,
  556 | }) => {
```