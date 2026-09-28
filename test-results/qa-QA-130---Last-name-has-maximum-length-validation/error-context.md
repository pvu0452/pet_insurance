# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa.spec.ts >> QA-130 - Last name has maximum length validation
- Location: tests/qa.spec.ts:586:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name*="last" i]').first()

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
  557 |   await page.goto("/details");
  558 | 
  559 |   const firstName = page.locator('input[name*="first" i]').first();
  560 | 
  561 |   await firstName.fill("   ");
  562 | 
  563 |   const continueButton = page.getByRole("button", {
  564 |     name: /continue|next/i,
  565 |   });
  566 | 
  567 |   await continueButton.click();
  568 | 
  569 |   await expect(page).toHaveURL(/details/i);
  570 | });
  571 | 
  572 | // QA-129
  573 | test("QA-129 - First name has maximum length validation", async ({ page }) => {
  574 |   await page.goto("/details");
  575 | 
  576 |   const firstName = page.locator('input[name*="first" i]').first();
  577 | 
  578 |   await firstName.fill("A".repeat(100));
  579 | 
  580 |   const value = await firstName.inputValue();
  581 | 
  582 |   expect(value.length).toBeLessThan(100);
  583 | });
  584 | 
  585 | // QA-130
  586 | test("QA-130 - Last name has maximum length validation", async ({ page }) => {
  587 |   await page.goto("/details");
  588 | 
  589 |   const lastName = page.locator('input[name*="last" i]').first();
  590 | 
> 591 |   await lastName.fill("B".repeat(100));
      |                  ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  592 | 
  593 |   const value = await lastName.inputValue();
  594 | 
  595 |   expect(value.length).toBeLessThan(100);
  596 | });
```