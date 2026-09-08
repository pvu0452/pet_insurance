# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa.spec.ts >> QA-100 - Customer details retained when continuing
- Location: tests/qa.spec.ts:158:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name*="name" i]').first()

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
  65  | 
  66  | // QA-093
  67  | test("QA-093 - Valid customer name accepted", async ({ page }) => {
  68  |   await page.goto("/details");
  69  | 
  70  |   const nameField = page.locator('input[name*="name" i]').first();
  71  | 
  72  |   await nameField.fill("Josh");
  73  | 
  74  |   await expect(nameField).toHaveValue("Josh");
  75  | });
  76  | 
  77  | // QA-094
  78  | test("QA-094 - Valid mobile number accepted", async ({ page }) => {
  79  |   await page.goto("/details");
  80  | 
  81  |   const mobileField = page.locator(
  82  |     'input[name*="mobile" i], input[type="tel"]'
  83  |   ).first();
  84  | 
  85  |   await mobileField.fill("0400000000");
  86  | 
  87  |   await expect(mobileField).toHaveValue("0400000000");
  88  | });
  89  | 
  90  | // QA-095
  91  | test("QA-095 - Invalid mobile number rejected", async ({ page }) => {
  92  |   await page.goto("/details");
  93  | 
  94  |   const mobileField = page.locator(
  95  |     'input[name*="mobile" i], input[type="tel"]'
  96  |   ).first();
  97  | 
  98  |   await mobileField.fill("123");
  99  | 
  100 |   const continueButton = page.getByRole("button", {
  101 |     name: /continue|next/i,
  102 |   });
  103 | 
  104 |   await continueButton.click();
  105 | 
  106 |   await expect(page.locator("body")).toBeVisible();
  107 | });
  108 | 
  109 | // QA-096
  110 | test("QA-096 - Valid email accepted", async ({ page }) => {
  111 |   await page.goto("/details");
  112 | 
  113 |   const emailField = page.locator('input[type="email"]').first();
  114 | 
  115 |   await emailField.fill("test@example.com");
  116 | 
  117 |   await expect(emailField).toHaveValue("test@example.com");
  118 | });
  119 | 
  120 | // QA-097
  121 | test("QA-097 - Invalid email rejected", async ({ page }) => {
  122 |   await page.goto("/details");
  123 | 
  124 |   const emailField = page.locator('input[type="email"]').first();
  125 | 
  126 |   await emailField.fill("invalid-email");
  127 | 
  128 |   const continueButton = page.getByRole("button", {
  129 |     name: /continue|next/i,
  130 |   });
  131 | 
  132 |   await continueButton.click();
  133 | 
  134 |   await expect(page.locator("body")).toBeVisible();
  135 | });
  136 | 
  137 | // QA-098
  138 | test("QA-098 - Navigate back without losing information", async ({ page }) => {
  139 |   await page.goto("/details");
  140 | 
  141 |   await page.goBack();
  142 | 
  143 |   await page.goForward();
  144 | 
  145 |   await expect(page).toHaveURL(/details/i);
  146 | });
  147 | 
  148 | // QA-099
  149 | test("QA-099 - Refresh Details Page", async ({ page }) => {
  150 |   await page.goto("/details");
  151 | 
  152 |   await page.reload();
  153 | 
  154 |   await expect(page).toHaveURL(/details/i);
  155 | });
  156 | 
  157 | // QA-100
  158 | test("QA-100 - Customer details retained when continuing", async ({
  159 |   page,
  160 | }) => {
  161 |   await page.goto("/details");
  162 | 
  163 |   const nameField = page.locator('input[name*="name" i]').first();
  164 | 
> 165 |   await nameField.fill("Josh");
      |                   ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  166 | 
  167 |   await expect(nameField).toHaveValue("Josh");
  168 | });
```