import { test, expect, type Page } from "@playwright/test";

const url = process.env.APP_URL || "http://localhost:5173";
const roles = [
  "مدیریت کلینیک",
  "پزشک متخصص",
  "پذیرش و نوبت‌دهی",
  "پرستاری و خدمات",
  "مالی و بیمه",
  "پنل بیمار",
];

async function role(page: Page, name: string) {
  await page.locator(".role-selector").click();
  await page
    .locator(".role-popover")
    .getByRole("button", { name, exact: true })
    .click();
}
const fits = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test.beforeEach(async ({ page }) => {
  await page.goto(url);
  await expect(page.locator("h1")).toBeVisible();
});

test("mobile bottom navigation switches sections, opens the more sheet and changes role", async ({
  page,
}) => {
  const nav = page.locator(".mobile-nav");
  await expect(nav).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("button")).toHaveCount(5);
  await expect(
    page.getByRole("button", { name: "باز کردن منو", exact: true }),
  ).toBeHidden();
  await expect(page.locator(".assistant-fab")).toBeHidden();

  await nav.getByRole("button", { name: "نوبت‌ها" }).click();
  await expect(page.locator("h1")).toHaveText("نوبت‌ها و پذیرش");
  await expect(nav.getByRole("button", { name: "نوبت‌ها" })).toHaveClass(
    /is-active/,
  );

  await nav.getByRole("button", { name: "بیشتر" }).click();
  await expect(page.locator(".sidebar")).toHaveClass(/sidebar-open/);
  await page
    .locator(".sidebar-navigation")
    .getByRole("button", { name: "تعرفه‌ها و خدمات" })
    .click();
  await expect(page.locator("h1")).toHaveText("تعرفه‌ها و خدمات");
  await expect(page.locator(".sidebar")).not.toHaveClass(/sidebar-open/);
  await expect(nav.getByRole("button", { name: "بیشتر" })).toHaveClass(
    /is-active/,
  );

  await nav.getByRole("button", { name: "بیشتر" }).click();
  await role(page, "پرستاری و خدمات");
  await expect(page.locator(".sidebar")).not.toHaveClass(/sidebar-open/);
  await expect(nav.getByRole("button", { name: "تریاژ" })).toBeVisible();
  await nav.getByRole("button", { name: "تریاژ" }).click();
  await expect(page.locator("h1")).toHaveText("تریاژ و علائم حیاتی");
  expect(await fits(page)).toBe(true);
});

test("page hints stay one line, expand on demand, run actions and remember being hidden", async ({
  page,
}) => {
  const hints = page.locator(".smart-hints");
  await expect(hints.locator(".smart-chip").first()).toBeVisible();
  await expect(page.locator(".smart-detail")).toHaveCount(0);
  await hints.getByRole("button", { name: /خارج از شیفت/ }).click();
  await expect(page.locator(".smart-detail")).toContainText("نوبت فعال");
  await page
    .locator(".smart-detail")
    .getByRole("button", { name: "برنامه پزشک", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("دکتر نگار شریفی");
  const inline = page.locator(".inline-hint").first();
  await expect(inline).toContainText("ظرفیت");
  await expect(inline.locator("p")).toHaveCount(0);
  await inline.getByRole("button").click();
  await expect(inline.locator("p")).toContainText("نوبت فعال");
  await page.getByRole("button", { name: "بستن پنجره", exact: true }).click();

  await hints.locator(".smart-toggle").click();
  await expect(hints.locator(".smart-chip")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".smart-toggle")).toBeVisible();
  await expect(page.locator(".smart-chip")).toHaveCount(0);
});

test("assistant answers from local data with collapsed details and working actions", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "دستیار هوشمند", exact: true })
    .click();
  const panel = page.locator(".assistant-panel");
  await expect(panel).toBeVisible();
  await panel
    .getByRole("button", { name: "فاکتورهای باز", exact: true })
    .click();
  const reply = panel.locator(".assistant-msg.from-bot").last();
  await expect(reply).toContainText("فاکتور باز");
  await expect(reply.locator("li").first()).toBeHidden();
  await reply.locator("summary").click();
  await expect(reply.locator("li").first()).toBeVisible();

  await panel.getByLabel("پرسش از دستیار").fill("مریم احمدی");
  await panel.getByRole("button", { name: "ارسال پرسش", exact: true }).click();
  await expect(panel.locator(".assistant-msg.from-bot").last()).toContainText(
    "پنی‌سیلین",
  );
  await panel
    .getByRole("button", { name: "باز کردن پرونده", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "پرونده الکترونیک سلامت",
  );
  await expect(panel).toBeHidden();
});

test("assistant never leaks other patients or finance data outside the role", async ({
  page,
}) => {
  const panel = page.locator(".assistant-panel");
  const ask = async (text: string) => {
    await panel.getByLabel("پرسش از دستیار").fill(text);
    await panel
      .getByRole("button", { name: "ارسال پرسش", exact: true })
      .click();
    await expect(panel.locator(".assistant-msg.from-user").last()).toHaveText(
      text,
    );
    return panel.locator(".assistant-msg.from-bot").last();
  };
  const open = () =>
    page.getByRole("button", { name: "دستیار هوشمند", exact: true }).click();

  await role(page, "پنل بیمار");
  await open();
  await expect(await ask("علی رضایی")).toContainText("پاسخ آماده‌ای");
  await expect(await ask("0089712345")).toContainText("پاسخ آماده‌ای");
  const queue = await ask("صف انتظار");
  await expect(queue).toContainText("نوبت بعدی");
  await expect(queue).not.toContainText("علی رضایی");
  await expect(await ask("خلاصه امروز")).not.toContainText("رضایی");
  await page.getByRole("button", { name: "بستن دستیار", exact: true }).click();

  await role(page, "پرستاری و خدمات");
  await open();
  await expect(await ask("فاکتورهای باز")).toContainText("در دسترس نیست");
  await expect(await ask("درد قفسه سینه دارم")).toContainText("توصیه پزشکی");
  await page.getByRole("button", { name: "بستن دستیار", exact: true }).click();

  await role(page, "مالی و بیمه");
  await open();
  const brief = await ask("مریم احمدی");
  await expect(brief).toContainText("فاکتور باز");
  await expect(brief).not.toContainText("پنی‌سیلین");
});

test("every role and section has hints and the assistant on mobile without overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  const nav = page.locator(".mobile-nav");
  const more = nav.getByRole("button", { name: "بیشتر" });
  const ai = nav.getByRole("button", { name: "دستیار هوشمند", exact: true });
  for (const name of roles) {
    await more.click();
    await role(page, name);
    const count = await page.locator(".sidebar-navigation .nav-item").count();
    for (let index = 0; index < count; index++) {
      await more.click();
      await page.locator(".sidebar-navigation .nav-item").nth(index).click();
      await expect(page.locator(".smart-chip").first()).toBeVisible();
      expect(await fits(page)).toBe(true);
    }
    await ai.click();
    await expect(page.locator(".assistant-panel")).toBeVisible();
    await page.locator(".assistant-chips button").first().click();
    await expect(
      page.locator(".assistant-msg.from-bot").last().locator("details"),
    ).toBeVisible();
    expect(await fits(page)).toBe(true);
    await ai.click();
    await expect(page.locator(".assistant-panel")).toBeHidden();
  }
  expect(errors).toEqual([]);
});

test("patient dashboard is compact, data-rich and has one expandable hint", async ({
  page,
}) => {
  await role(page, "پنل بیمار");
  await expect(page.locator("h1")).toHaveText("مریم عزیز، سلام");
  const hints = page.locator(".smart-hints");
  await expect(hints).toHaveCount(1);
  await expect(hints.locator(".smart-chip")).toHaveCount(1);
  await expect(hints.locator(".smart-chip")).toContainText(
    "تکمیل پرونده ویزیت",
  );
  await expect(page.locator(".smart-detail")).toHaveCount(0);
  await hints.locator(".smart-chip").click();
  await expect(page.locator(".smart-detail")).toContainText("پرسش ضروری");
  await page
    .locator(".smart-detail")
    .getByRole("button", { name: /شروع پرسش‌ها|ادامه پرسش‌ها/ })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "تکمیل پرونده برای ویزیت امروز",
  );
  await page.getByRole("button", { name: "بستن", exact: true }).click();

  const next = page.locator(".pd-next");
  await expect(next).toContainText("دکتر نازنین محمدی");
  await expect(next).toContainText("۰۸:۰۰");
  await expect(next).toContainText("پرداخت‌نشده");
  const health = page.locator(".pd-health");
  await expect(health).toContainText("A+");
  await expect(health).toContainText("پنی‌سیلین");
  await expect(health).toContainText("۱۱۸/۷۶");
  await expect(page.locator(".pd-stat")).toHaveCount(6);
  await expect(page.locator(".pd-intake")).toContainText(
    "برای ویزیت سردرد و میگرن",
  );
  await expect(page.locator(".pd-ehr")).toContainText("آپاندکتومی");
  await expect(page.locator(".pd-middle")).toContainText(
    "نمونه‌گیری آزمایش CBC",
  );
  await expect(page.locator(".pd-bottom")).toContainText("قرص فروس سولفات");
  await expect(page.locator(".pd-bottom")).not.toContainText("علی رضایی");

  await next.getByRole("button", { name: "پرداخت", exact: true }).click();
  await page
    .getByRole("button", { name: "ثبت پرداخت نمایشی", exact: true })
    .click();
  await expect(page.locator(".receipt-success")).toBeVisible();
  await page.getByRole("button", { name: "بستن پنجره", exact: true }).click();
  await expect(next).toContainText("پرداخت شده");
  await expect(page.locator(".smart-single .smart-chip")).toContainText(
    "تکمیل پرونده ویزیت",
  );

  await page.locator(".pd-stat", { hasText: "نسخه" }).click();
  await expect(page.locator("h1")).toHaveText("نسخه‌های الکترونیک من");
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "خانه" })
    .click();
  await expect(page.locator(".pd-next")).toBeVisible();
  expect(await fits(page)).toBe(true);
});

test("triage flags out-of-range vitals while typing", async ({ page }) => {
  await role(page, "پرستاری و خدمات");
  await page.locator(".smart-chip", { hasText: "منتظر تریاژ" }).click();
  await page
    .locator(".smart-detail")
    .getByRole("button", { name: "ثبت علائم نفر اول", exact: true })
    .click();
  await expect(page.locator(".live-vitals")).toHaveCount(0);
  await page.getByLabel("فشار خون (mmHg)", { exact: true }).fill("150/95");
  await page.getByLabel("دمای بدن (سانتی‌گراد)", { exact: true }).fill("38.6");
  await expect(page.locator(".live-vitals")).toContainText("فشار خون بالا");
  await expect(page.locator(".live-vitals")).toContainText("تب");
  await page.getByLabel("فشار خون (mmHg)", { exact: true }).fill("118/76");
  await page.getByLabel("دمای بدن (سانتی‌گراد)", { exact: true }).fill("36.7");
  await expect(page.locator(".live-vitals")).toHaveCount(0);
});
