# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa.spec.ts >> QA-103 - First name does not allow special characters
- Location: tests/qa.spec.ts:192:5

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
  99  | 
  100 |   const continueButton = page.getByRole("button", {
  101 |     name: /continue|next/i,
  102 |   });
  103 | 
  104 |   await continueButton.click();
  105 | 
  106 |   await expect(page).toHaveURL(/details/i);
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
  134 |   await expect(page).toHaveURL(/details/i);
  135 | });
  136 | 
  137 | // QA-098
  138 | test("QA-098 - Navigate back without losing information", async ({ page }) => {
  139 |   await page.goto("/details");
  140 | 
  141 |   await page.goBack();
  142 |   await page.goForward();
  143 | 
  144 |   await expect(page).toHaveURL(/details/i);
  145 | });
  146 | 
  147 | // QA-099
  148 | test("QA-099 - Refresh Details Page", async ({ page }) => {
  149 |   await page.goto("/details");
  150 | 
  151 |   await page.reload();
  152 | 
  153 |   await expect(page).toHaveURL(/details/i);
  154 | });
  155 | 
  156 | // QA-100
  157 | test("QA-100 - Customer details retained when continuing", async ({
  158 |   page,
  159 | }) => {
  160 |   await page.goto("/details");
  161 | 
  162 |   const nameField = page.locator('input[name*="name" i]').first();
  163 | 
  164 |   await nameField.fill("Josh");
  165 | 
  166 |   await expect(nameField).toHaveValue("Josh");
  167 | });
  168 | 
  169 | // QA-101
  170 | test("QA-101 - First name does not allow numbers", async ({ page }) => {
  171 |   await page.goto("/details");
  172 | 
  173 |   const nameField = page.locator('input[name*="first" i]').first();
  174 | 
  175 |   await nameField.fill("Josh123");
  176 | 
  177 |   await expect(nameField).not.toHaveValue("Josh123");
  178 | });
  179 | 
  180 | // QA-102
  181 | test("QA-102 - Last name does not allow numbers", async ({ page }) => {
  182 |   await page.goto("/details");
  183 | 
  184 |   const lastNameField = page.locator('input[name*="last" i]').first();
  185 | 
  186 |   await lastNameField.fill("Smith123");
  187 | 
  188 |   await expect(lastNameField).not.toHaveValue("Smith123");
  189 | });
  190 | 
  191 | // QA-103
  192 | test("QA-103 - First name does not allow special characters", async ({
  193 |   page,
  194 | }) => {
  195 |   await page.goto("/details");
  196 | 
  197 |   const nameField = page.locator('input[name*="first" i]').first();
  198 | 
> 199 |   await nameField.fill("Josh@#$");
      |                   ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  200 | 
  201 |   await expect(nameField).not.toHaveValue("Josh@#$");
  202 | });
  203 | 
  204 | // QA-104
  205 | test("QA-104 - Last name does not allow special characters", async ({
  206 |   page,
  207 | }) => {
  208 |   await page.goto("/details");
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
```