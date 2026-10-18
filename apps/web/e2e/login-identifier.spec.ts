import { expect, test, type Page } from "@playwright/test";

// The sign-in box takes an email address or a mobile number. Mobile sign-in is not available yet (the store API is email and
// password only), so a mobile number only ever gets a "not available" notice and is never sent anywhere.
// Runs against the demo build (NEXT_PUBLIC_AUTH_DEMO=true), like auth.spec.ts.
const rand = () => Math.floor(100000000 + Math.random() * 899999999);
const unique = () => ({ email: `ident${Date.now()}${rand()}@example.com`, password: "Saree2026" });
const unavailable = "Mobile sign-in isn't available yet — use your email";

const box = (page: Page) => page.locator("input[data-kind]");
const alerts = (page: Page) => page.locator("form").getByRole("alert");
const signInButton = (page: Page) => page.getByRole("button", { name: "Sign In", exact: true });
const notice = (page: Page) => page.locator("form").getByRole("status").filter({ hasText: unavailable });

/** The notice is shown, announced as a status, described-by the box, and no error is on the box. */
const expectNoticeOnly = async (page: Page) => {
  await expect(page.getByText(unavailable)).toHaveCount(1);
  await expect(notice(page)).toBeVisible();
  await expect(alerts(page)).toHaveCount(0);
  await expect(box(page)).not.toHaveAttribute("aria-invalid", "true");
  const id = await notice(page).getAttribute("id");
  await expect(box(page)).toHaveAttribute("aria-describedby", id!);
};

const signUp = async (page: Page, person: { email: string; password: string }) => {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Test Buyer");
  await page.getByLabel("Email address").fill(person.email);
  await page.getByLabel("Password", { exact: true }).fill(person.password);
  await page.getByLabel("Confirm password", { exact: true }).fill(person.password);
  await page.getByText("I agree to the").click();
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/account$/, { timeout: 8000 });
  await page.getByRole("button", { name: "Logout" }).click();
};

test.describe("email or mobile sign-in box", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("the label, icon and notice follow what is typed, and go back; the keyboard is always the email one", async ({ page }) => {
    const input = box(page);
    const icon = page.locator("form svg[data-icon]").first();
    await expect(page.getByLabel("Email or mobile number")).toBeVisible();
    await expect(input).toHaveAttribute("data-kind", "empty");
    await expect(input).toHaveAttribute("inputmode", "email");
    await expect(icon).toHaveAttribute("data-icon", "email");

    await input.pressSequentially("98");
    await expect(input).toHaveAttribute("data-kind", "mobile");
    await expect(input).toHaveAttribute("type", "text");
    await expect(page.getByLabel("Mobile number")).toBeVisible();
    await expect(icon).toHaveAttribute("data-icon", "mobile");
    await expectNoticeOnly(page);

    await input.pressSequentially("76543");
    await expect(input).toHaveAttribute("inputmode", "email"); // never a numeric-only keypad: it has no "@" or letters
    await expectNoticeOnly(page);

    await input.fill("+91 98");
    await expect(input).toHaveAttribute("data-kind", "mobile");

    await input.fill("a");
    await expect(input).toHaveAttribute("data-kind", "email");
    await expect(input).toHaveAttribute("inputmode", "email");
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(icon).toHaveAttribute("data-icon", "email");
    await expect(page.getByText(unavailable)).toHaveCount(0);

    await input.fill("98765@example.com");
    await expect(input).toHaveAttribute("data-kind", "email");

    await input.fill("");
    await expect(input).toHaveAttribute("data-kind", "empty");
    await expect(page.getByLabel("Email or mobile number")).toBeVisible();
  });

  test("email -> phone -> email by clearing and retyping: label, icon and notice follow", async ({ page }) => {
    const input = box(page);
    const icon = page.locator("form svg[data-icon]").first();
    await input.fill("meera@example.com");
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(icon).toHaveAttribute("data-icon", "email");
    await expect(page.getByText(unavailable)).toHaveCount(0);

    await input.fill("");
    await input.pressSequentially("9876543210");
    await expect(page.getByLabel("Mobile number")).toBeVisible();
    await expect(icon).toHaveAttribute("data-icon", "mobile");
    await expectNoticeOnly(page);

    await input.fill("");
    await expect(page.getByText(unavailable)).toHaveCount(0);
    await input.pressSequentially("meera@example.com");
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(icon).toHaveAttribute("data-icon", "email");
    await expect(page.getByText(unavailable)).toHaveCount(0);
    await expect(input).toHaveValue("meera@example.com");
  });

  // Layout checks measure everything relative to the form: the card is vertically centred and the page settles for a moment after
  // it loads, so absolute positions on screen can move without anything inside the form having moved.
  type Layout = { formHeight: number; input: number; password: number; button: number; messageBottom: number | null; messageHeight: number; slotHeight: number };
  const measure = (page: Page): Promise<Layout> =>
    page.evaluate(() => {
      const form = document.querySelector("form")!;
      const top = (element: Element | null) => (element ? element.getBoundingClientRect().top - form.getBoundingClientRect().top : 0);
      const message = document.querySelector("form [class*=messageSlot] p");
      const slot = document.querySelector("form [class*=messageSlot]");
      return {
        formHeight: form.getBoundingClientRect().height,
        input: top(form.querySelector("input[data-kind]")),
        password: top(form.querySelector("input[type=password]")),
        button: top(form.querySelector("button[type=submit]")),
        messageBottom: message ? message.getBoundingClientRect().bottom - form.getBoundingClientRect().top : null,
        messageHeight: message ? message.getBoundingClientRect().height : 0,
        slotHeight: slot ? slot.getBoundingClientRect().height : 0,
      };
    });
  // The mouse is moved away first (the button lifts 1px on hover), then the measurement is repeated until two reads agree.
  const layout = async (page: Page): Promise<Layout> => {
    await page.mouse.move(1, 1);
    let last = await measure(page);
    for (let attempt = 0; attempt < 30; attempt++) {
      await page.waitForTimeout(60);
      const next = await measure(page);
      if (JSON.stringify(next) === JSON.stringify(last)) return next;
      last = next;
    }
    return last;
  };
  const passwordLabelTop = (page: Page) =>
    page.evaluate(() => {
      const form = document.querySelector("form")!;
      const label = form.querySelector("input[type=password]")!.closest("div[class*=field]")!.querySelector("label")!;
      return label.getBoundingClientRect().top - form.getBoundingClientRect().top;
    });
  // The page-load slide-in is over when the form's top stops changing.
  const settle = async (page: Page) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    const formTop = () => page.evaluate(() => document.querySelector("form")!.getBoundingClientRect().top);
    let last = await formTop();
    let steady = 0;
    for (let attempt = 0; attempt < 60 && steady < 4; attempt++) {
      await page.waitForTimeout(50);
      const next = await formTop();
      steady = next === last ? steady + 1 : 0;
      last = next;
    }
  };
  // Extra height the reserved message line adds for an email user with no message, measured by switching the slot off.
  const reservedHeight = async (page: Page) => {
    await box(page).fill("meera@example.com");
    const with_ = (await layout(page)).formHeight;
    await page.addStyleTag({ content: "form [class*=messageSlot]{display:none!important}" });
    const without = (await layout(page)).formHeight;
    return with_ - without;
  };

  // The notice is about 297px of text in a box (screen width - 66px) wide: it wraps on 320, 340 and 360 and fits on 375 and up.
  // Two lines are reserved up to 389px wide.
  const widths: { name: string; size: { width: number; height: number } | null; noticeLines: number | null }[] = [
    { name: "default viewport", size: null, noticeLines: null },
    { name: "320px wide", size: { width: 320, height: 900 }, noticeLines: 2 },
    { name: "360px wide", size: { width: 360, height: 900 }, noticeLines: 2 },
    { name: "375px wide", size: { width: 375, height: 900 }, noticeLines: 1 },
    { name: "390px wide", size: { width: 390, height: 900 }, noticeLines: 1 },
  ];
  for (const { name, size, noticeLines } of widths) {
    test(`messages never move the fields in the form, and never overlap the password field (${name})`, async ({ page }) => {
      if (size) await page.setViewportSize(size);
      await page.goto("/login");
      await settle(page);
      const input = box(page);
      const password = page.getByLabel("Password", { exact: true });

      const base = await layout(page); // empty
      const same = (state: Layout) => {
        expect(state.formHeight).toBeCloseTo(base.formHeight, 1);
        expect(state.input).toBeCloseTo(base.input, 1);
        expect(state.password).toBeCloseTo(base.password, 1);
        expect(state.button).toBeCloseTo(base.button, 1);
      };
      // not hidden behind the password field, and not cut off by the slot
      const fits = async (state: Layout) => {
        expect(state.messageBottom).not.toBeNull();
        expect(state.messageBottom!).toBeLessThanOrEqual((await passwordLabelTop(page)) + 0.5);
        expect(state.messageHeight).toBeLessThanOrEqual(state.slotHeight);
      };

      await input.fill("meera@example.com"); // email typed: no message at all
      same(await layout(page));
      await expect(page.locator("form [class*=messageSlot] p")).toHaveCount(0);

      await input.fill("9"); // the notice shows from the first digit
      await expect(page.getByText(unavailable)).toBeVisible();
      same(await layout(page));
      await fits(await layout(page));
      await input.fill("+91 98765 43210");
      await input.blur(); // leaving the box changes nothing for a mobile value
      await expect(page.getByText(unavailable)).toBeVisible();
      const standing = await layout(page);
      same(standing);
      if (noticeLines) expect(standing.messageHeight).toBe(noticeLines * 18);
      if (size) expect(standing.slotHeight).toBe(size.width <= 389 ? 36 : 18);
      await fits(standing);

      await input.fill("meera"); // a short email error
      await input.blur();
      await expect(page.getByText("Enter a valid email, like name@example.com.")).toBeVisible();
      same(await layout(page));
      await fits(await layout(page));
      await input.fill("a-rather-long-name-for-an-email"); // the long email error, which wraps on the narrowest phones
      await input.blur();
      await expect(page.getByText("Enter a valid email, like name@example.com.")).toBeVisible();
      const longError = await layout(page);
      same(longError);
      await fits(longError);
      if (size && size.width <= 340) expect(longError.messageHeight).toBe(36);

      await input.fill("+91 98765 43210"); // submit with a password: the same notice, as an error
      await password.fill("Saree2026");
      await signInButton(page).click();
      await expect(alerts(page)).toHaveText(unavailable);
      const submitted = await layout(page);
      same(submitted);
      await fits(submitted);

      await input.fill("meera@example.com"); // back to email
      await expect(page.locator("form [class*=messageSlot] p")).toHaveCount(0);
      same(await layout(page));
    });
  }

  // blank space the reserved line adds for an email user: small where one line is reserved, and kept to two lines on narrow phones
  for (const { width, limit } of [{ width: 1440, limit: 20 }, { width: 390, limit: 20 }, { width: 375, limit: 34 }, { width: 320, limit: 34 }]) {
    test(`the reserved message line adds at most ${limit}px of blank space for an email user (${width}px wide)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/login");
      await settle(page);
      expect(await reservedHeight(page)).toBeLessThanOrEqual(limit);
    });
  }

  test("the same input element stays in place while the kind changes", async ({ page }) => {
    await settle(page);
    const input = box(page);
    await input.fill("a");
    const before = await layout(page);
    await input.fill("9876543210");
    await input.blur();
    const after = await layout(page);
    expect(after.input).toBeCloseTo(before.input, 1);
    expect(after.button).toBeCloseTo(before.button, 1);
    expect(after.formHeight).toBeCloseTo(before.formHeight, 1);
  });

  test("email: no complaint while typing, a clear message after leaving the box", async ({ page }) => {
    const input = box(page);
    await input.pressSequentially("meera");
    await expect(alerts(page)).toHaveCount(0);
    await input.blur();
    await expect(alerts(page)).toHaveCount(1);
    await expect(page.getByText("Enter a valid email, like name@example.com.")).toBeVisible();
    await expect(input).toHaveAttribute("aria-invalid", "true");

    await input.focus();
    await input.pressSequentially("@exam");
    await expect(alerts(page)).toHaveCount(0); // cleared while typing again
    await input.blur();
    await expect(page.getByText("Enter a valid email, like name@example.com.")).toBeVisible();

    await input.fill("meera@example.com");
    await input.blur();
    await expect(alerts(page)).toHaveCount(0);
  });

  // Inline mobile-format messages ("Enter all 10 digits." ...) are dropped for now: they would suggest mobile sign-in could work.
  // A mobile value only ever shows the standing notice, on screen, while typing, on blur and for any shape of number.
  for (const number of ["98765", "12345", "5876543210", "98765432101", "+1 415 555 0100", "+", "(98765) 43210", "00919876543210", "9876543210", "+91 98765 43210", "919876543210", "09876543210", "98765-43210"]) {
    test(`mobile: ${number} shows only the notice, also after leaving the box`, async ({ page }) => {
      const input = box(page);
      await input.fill(number);
      await expect(input).toHaveAttribute("data-kind", "mobile");
      await expectNoticeOnly(page);
      await input.blur();
      await expect(input).toHaveAttribute("data-kind", "mobile");
      await expectNoticeOnly(page);
    });
  }

  test("a mobile number typed one key at a time never shows an error or loses the notice (checked after every key)", async ({ page }) => {
    const input = box(page);
    for (const character of "+91 98765 43210") {
      await input.press(character === " " ? "Space" : character);
      await expect(alerts(page)).toHaveCount(0);
      await expect(notice(page)).toBeVisible();
    }
    await input.blur();
    await expectNoticeOnly(page);
  });

  test("a letter anywhere without '@' means an email address, judged as one", async ({ page }) => {
    const input = box(page);
    await input.fill("98765 abc 4321");
    await input.blur();
    await expect(input).toHaveAttribute("data-kind", "email");
    await expect(page.getByText(unavailable)).toHaveCount(0);
    await expect(page.getByText("Enter a valid email, like name@example.com.")).toBeVisible();

    await input.fill("-");
    await expect(input).toHaveAttribute("data-kind", "email"); // no digit and not just "+"
  });

  test("no stale text when the kind changes: an email error goes when it turns mobile, a submit error goes when it turns email", async ({ page }) => {
    const input = box(page);
    await input.fill("meera");
    await input.blur();
    await expect(page.getByText("Enter a valid email, like name@example.com.")).toBeVisible();
    await input.fill("9"); // email error from the earlier blur must not linger
    await expect(page.getByText("Enter a valid email, like name@example.com.")).toHaveCount(0);
    await expectNoticeOnly(page);
    await input.blur();
    await expectNoticeOnly(page);

    await page.getByLabel("Password", { exact: true }).fill("Saree2026");
    await signInButton(page).click();
    await expect(alerts(page)).toHaveText(unavailable);
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await input.fill("9a"); // a letter: now an email, the mobile notice and error are gone at once
    await expect(page.getByText(unavailable)).toHaveCount(0);
    await expect(alerts(page)).toHaveCount(0);
    await expect(input).not.toHaveAttribute("aria-invalid", "true");
    await input.blur();
    await expect(page.getByText("Enter a valid email, like name@example.com.")).toBeVisible();
    await input.fill("98");
    await expect(page.getByText("Enter a valid email, like name@example.com.")).toHaveCount(0);
    await expectNoticeOnly(page);
  });

  // A digit-leading email must be typeable on a phone: the keypad never becomes numeric-only, and the kind flips at "@".
  for (const email of ["9876543210@gmail.com", "98765432@ybl"]) {
    test(`a digit-leading email (${email}) typed one character at a time keeps the email keyboard and turns into an email at '@'`, async ({ page }) => {
      const input = box(page);
      const at = email.indexOf("@");
      for (let index = 0; index < email.length; index++) {
        await input.pressSequentially(email[index]);
        await expect(input).not.toHaveAttribute("inputmode", "tel");
        await expect(input).toHaveAttribute("inputmode", "email");
        if (index < at) {
          await expect(input).toHaveAttribute("data-kind", "mobile");
          await expect(notice(page)).toBeVisible();
        } else {
          await expect(input).toHaveAttribute("data-kind", "email");
          await expect(page.getByLabel("Email address")).toBeVisible();
          await expect(page.getByText(unavailable)).toHaveCount(0);
        }
      }
      await expect(input).toHaveValue(email);
      await expect(alerts(page)).toHaveCount(0);
    });
  }

  test("a digit-leading email signs in through the normal email path", async ({ page }) => {
    const person = { email: `9${rand()}@example.com`, password: "Saree2026" };
    await signUp(page, person);
    await page.goto("/login");
    const input = box(page);
    await input.pressSequentially(person.email);
    await expect(input).toHaveAttribute("data-kind", "email");
    await expect(input).toHaveAttribute("inputmode", "email");
    await expect(input).toHaveValue(person.email);
    await page.getByLabel("Password", { exact: true }).fill(person.password);
    await signInButton(page).click();
    await expect(page.getByRole("heading", { name: /Welcome back, Test!/ })).toBeVisible();
  });

  test("edge case: a mobile number with a 91 or 0 prefix, brackets and dashes is still just the notice", async ({ page }) => {
    const input = box(page);
    await input.fill("(98765) 43210");
    await input.blur();
    await expect(input).toHaveAttribute("data-kind", "mobile");
    await expectNoticeOnly(page);
  });

  for (const number of ["+91 98765 43210", "98765", "12345", "+1 415 555 0100"]) {
    test(`a mobile value (${number}) never reaches the auth API; submit shows the notice as the error and focuses the box`, async ({ page }) => {
      const calls: string[] = [];
      page.on("request", (request) => {
        if (/\/auth\//.test(request.url())) calls.push(`${request.method()} ${request.url()}`);
      });
      await page.route("**/auth/**", (route) => {
        calls.push(`routed ${route.request().url()}`);
        return route.abort();
      });

      await box(page).fill(number);
      await page.getByLabel("Password", { exact: true }).fill("Saree2026");
      await signInButton(page).click();

      await expect(alerts(page)).toHaveText(unavailable);
      await expect(page.getByText(unavailable)).toHaveCount(1); // one message, not the notice and an error together
      await expect(box(page)).toBeFocused(); // form is captured before the animation frame (currentTarget is null later)
      await expect(box(page)).toHaveAttribute("aria-invalid", "true");
      await page.waitForTimeout(300);
      expect(calls).toEqual([]);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("heading", { name: /Welcome back, /i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "My account" })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();

      // editing the number clears the submit-time error and the standing notice is back, as a status rather than an alert
      await box(page).fill(`${number}1`);
      await expectNoticeOnly(page);
    });
  }

  test("an empty box asks for an email address or mobile number", async ({ page }) => {
    await signInButton(page).click();
    await expect(page.getByText("Enter your email address or mobile number.")).toBeVisible();
  });

  test("email sign-in still works, and a wrong password still gets the neutral message", async ({ page }) => {
    const person = unique();
    await signUp(page, person);

    await page.goto("/login");
    await box(page).fill(person.email.toUpperCase());
    await page.getByLabel("Password", { exact: true }).fill("Wrong1234");
    await signInButton(page).click();
    await expect(page.getByText("The email or password is incorrect.")).toBeVisible();

    await page.getByLabel("Password", { exact: true }).fill(person.password);
    await signInButton(page).click();
    await expect(page.getByRole("heading", { name: /Welcome back, Test!/ })).toBeVisible();
  });
});
