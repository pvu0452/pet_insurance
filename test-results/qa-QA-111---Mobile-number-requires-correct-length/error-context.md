# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa.spec.ts >> QA-111 - Mobile number requires correct length
- Location: tests/qa.spec.ts:302:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name*="mobile" i], input[type="tel"]').first()

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
  209 | 
  210 |   const lastNameField = page.locator('input[name*="last" i]').first();
  211 | 
  212 |   await lastNameField.fill("Smith@#$");
  213 | 
  214 |   await expect(lastNameField).not.toHaveValue("Smith@#$");
  215 | });
  216 | 
  217 | // QA-105
  218 | test("QA-105 - First name accepts alphabetic characters", async ({ page }) => {
  219 |   await page.goto("/details");
  220 | 
  221 |   const nameField = page.locator('input[name*="first" i]').first();
  222 | 
  223 |   await nameField.fill("Josh");
  224 | 
  225 |   await expect(nameField).toHaveValue("Josh");
  226 | });
  227 | 
  228 | // QA-106
  229 | test("QA-106 - Last name accepts alphabetic characters", async ({ page }) => {
  230 |   await page.goto("/details");
  231 | 
  232 |   const lastNameField = page.locator('input[name*="last" i]').first();
  233 | 
  234 |   await lastNameField.fill("Smith");
  235 | 
  236 |   await expect(lastNameField).toHaveValue("Smith");
  237 | });
  238 | 
  239 | // QA-107
  240 | test("QA-107 - First name cannot be left blank", async ({ page }) => {
  241 |   await page.goto("/details");
  242 | 
  243 |   const nameField = page.locator('input[name*="first" i]').first();
  244 | 
  245 |   await nameField.fill("");
  246 | 
  247 |   const continueButton = page.getByRole("button", {
  248 |     name: /continue|next/i,
  249 |   });
  250 | 
  251 |   await continueButton.click();
  252 | 
  253 |   await expect(page).toHaveURL(/details/i);
  254 | });
  255 | 
  256 | // QA-108
  257 | test("QA-108 - Last name cannot be left blank", async ({ page }) => {
  258 |   await page.goto("/details");
  259 | 
  260 |   const lastNameField = page.locator('input[name*="last" i]').first();
  261 | 
  262 |   await lastNameField.fill("");
  263 | 
  264 |   const continueButton = page.getByRole("button", {
  265 |     name: /continue|next/i,
  266 |   });
  267 | 
  268 |   await continueButton.click();
  269 | 
  270 |   await expect(page).toHaveURL(/details/i);
  271 | });
  272 | 
  273 | // QA-109
  274 | test("QA-109 - Mobile number does not allow letters", async ({ page }) => {
  275 |   await page.goto("/details");
  276 | 
  277 |   const mobileField = page.locator(
  278 |     'input[name*="mobile" i], input[type="tel"]'
  279 |   ).first();
  280 | 
  281 |   await mobileField.fill("04ABCDEF12");
  282 | 
  283 |   await expect(mobileField).not.toHaveValue("04ABCDEF12");
  284 | });
  285 | 
  286 | // QA-110
  287 | test("QA-110 - Mobile number does not allow special characters", async ({
  288 |   page,
  289 | }) => {
  290 |   await page.goto("/details");
  291 | 
  292 |   const mobileField = page.locator(
  293 |     'input[name*="mobile" i], input[type="tel"]'
  294 |   ).first();
  295 | 
  296 |   await mobileField.fill("0400-000-000");
  297 | 
  298 |   await expect(mobileField).not.toHaveValue("0400-000-000");
  299 | });
  300 | 
  301 | // QA-111
  302 | test("QA-111 - Mobile number requires correct length", async ({ page }) => {
  303 |   await page.goto("/details");
  304 | 
  305 |   const mobileField = page.locator(
  306 |     'input[name*="mobile" i], input[type="tel"]'
  307 |   ).first();
  308 | 
> 309 |   await mobileField.fill("040000");
      |                     ^ Error: locator.fill: Test timeout of 30000ms exceeded.
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
  405 |   await expect(page.locator("body")).toContainText(
  406 |     /customer|personal details/i
  407 |   );
  408 | });
  409 | 
```