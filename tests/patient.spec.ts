import { test, expect, type Page } from "@playwright/test";

const url = process.env.APP_URL || "http://localhost:5173";
async function role(page: Page, name: string) {
  await page.locator(".role-selector").click();
  await page
    .locator(".role-popover")
    .getByRole("button", { name, exact: true })
    .click();
}
async function state(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("nabz-clinic-data-v1")!),
  );
}
const fits = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test.beforeEach(async ({ page }) => {
  await page.goto(url);
  await expect(page.locator("h1")).toBeVisible();
});

test("pre-visit intake asks specialty-specific questions in chat and form, saves draft and submits to the record", async ({
  page,
}) => {
  await role(page, "پنل بیمار");
  await page
    .locator(".pd-intake")
    .getByRole("button", { name: /شروع پرسش‌ها/ })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("تکمیل پرونده برای ویزیت امروز");
  await expect(dialog.locator(".intake-focus")).toContainText("سردرد و میگرن");
  // Common questions are prefilled from the record; first unanswered is neurology onset.
  await expect(dialog.locator(".intake-bubble.current")).toContainText(
    "سردرد یا علامت اصلی",
  );
  await dialog.getByRole("button", { name: "چند هفته", exact: true }).click();
  await dialog
    .getByRole("button", { name: "حساسیت به نور/صدا", exact: true })
    .click();
  await dialog.getByLabel(/محرک‌ها/).fill("کم‌خوابی");
  await dialog.getByRole("button", { name: "ثبت و ادامه" }).click();
  await expect(dialog.locator(".intake-bubble.current")).toContainText(
    "MRI یا CT",
  );
  await dialog.getByRole("button", { name: "ثبت و ادامه" }).click();
  await expect(dialog.locator(".intake-review")).toBeVisible();
  await dialog.getByRole("button", { name: "ذخیره پیش‌نویس" }).click();
  let saved = (await state(page)).intakes.find(
    (item: { patientId: string }) => item.patientId === "p1",
  );
  expect(saved.status).toBe("draft");
  expect(saved.answers.onset.value).toBe("چند هفته");
  // Switch to form mode and edit an answer
  await dialog.getByRole("button", { name: "فرم سریع" }).click();
  await dialog
    .locator(".intake-form .intake-options")
    .nth(1)
    .getByRole("button", { name: "تهوع یا استفراغ", exact: true })
    .click();
  await dialog.getByRole("button", { name: "ثبت برای پزشک" }).click();
  await expect(dialog).toHaveCount(0);
  saved = (await state(page)).intakes.find(
    (item: { patientId: string }) => item.patientId === "p1",
  );
  expect(saved.status).toBe("submitted");
  expect(saved.answers.neuro.value).toBe("تهوع یا استفراغ");
  await expect(page.locator(".pd-intake")).toContainText("ثبت شده");
  await expect(page.locator(".smart-single .smart-chip")).toContainText(
    "پرداخت باز",
  );
  // Physician sees the answers in the visit context
  await role(page, "پزشک متخصص");
  await page
    .locator(".sidebar-navigation")
    .getByRole("button", { name: "پرونده بیماران" })
    .click();
  await page.locator(".search-input input").fill("مریم احمدی");
  await page.getByRole("button", { name: "مشاهده پرونده" }).click();
  const summary = page.locator(".context-summary");
  await expect(summary).toContainText("پرسش‌های پیش از ویزیت ثبت شده");
  await summary.getByRole("button", { name: "مشاهده پاسخ‌ها" }).click();
  await expect(page.getByRole("dialog")).toContainText("پاسخ‌های پیش از ویزیت");
  await expect(page.getByRole("dialog")).toContainText("چند هفته");
});

test("two patient profiles are distinct and the record personalizes by age, gender, marital status and specialty", async ({
  page,
}) => {
  await role(page, "پنل بیمار");
  await expect(page.locator("h1")).toHaveText("مریم عزیز، سلام");
  await expect(page.locator(".pd-health")).toContainText("متأهل");
  await expect(page.locator(".pd-intake-title")).toContainText("سردرد و میگرن");
  await page.locator(".patient-switcher-button").first().click();
  await page
    .locator(".patient-switcher-popover")
    .getByRole("button", { name: /علی رضایی/ })
    .click();
  await expect(page.locator("h1")).toHaveText("علی عزیز، سلام");
  await expect(page.locator(".pd-health")).toContainText("۵۲ سال");
  await expect(page.locator(".pd-health")).toContainText("O+");
  await expect(page.locator(".pd-intake-title")).toContainText(
    "قلب و فشار خون",
  );
  await expect(page.locator(".pd-ehr")).toContainText("بستری کوتاه");
  await expect(page.locator(".pd-ehr")).not.toContainText("آپاندکتومی");
  await expect(page.locator(".pd-next")).toContainText("دکتر امیرحسین رضایی");
  await page
    .locator(".pd-intake")
    .getByRole("button", { name: /شروع پرسش‌ها/ })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".intake-nav")).toContainText("فشار خون خانگی");
  await expect(dialog.locator(".intake-nav")).not.toContainText("شروع سردرد");
  await dialog.getByRole("button", { name: "بستن", exact: true }).click();
  // Record page shows personalized focus and events; add a surgery with undo
  await page
    .locator(".sidebar-navigation")
    .getByRole("button", { name: "سوابق پزشکی من" })
    .click();
  await expect(page.locator("h1")).toHaveText("پرونده سلامت من");
  await expect(page.locator(".ehr-focus")).toContainText("قلب و فشار خون");
  await expect(page.locator(".ehr-head")).toContainText("متأهل");
  await page.getByRole("button", { name: "افزودن سابقه" }).click();
  await page.getByLabel("نوع رویداد").selectOption("surgery");
  await page.getByLabel("عنوان", { exact: true }).fill("آنژیوپلاستی");
  await page
    .getByLabel("توضیح", { exact: true })
    .fill("نمونه: یک استنت، بدون عارضه");
  await page.getByRole("button", { name: "ذخیره", exact: true }).click();
  await expect(page.locator(".ehr")).toBeVisible();
  await page
    .locator(".ehr-tabs")
    .getByRole("button", { name: "سوابق و رویدادها" })
    .click();
  const row = page.locator(".ehr-event").filter({ hasText: "آنژیوپلاستی" });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "حذف", exact: true }).click();
  await page.getByRole("button", { name: "تأیید و ادامه" }).click();
  await expect(
    page.locator(".ehr-event").filter({ hasText: "آنژیوپلاستی" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "بازگردانی", exact: true }).click();
  await expect(
    page.locator(".ehr-event").filter({ hasText: "آنژیوپلاستی" }),
  ).toHaveCount(1);
  // Patient settings edit marital status and it reflects in record
  await page
    .locator(".sidebar-navigation")
    .getByRole("button", { name: "تنظیمات" })
    .click();
  await page.getByLabel("وضعیت تأهل", { exact: true }).selectOption("سایر");
  await page.getByRole("button", { name: "ذخیره مشخصات" }).click();
  expect(
    (await state(page)).patients.find((p: { id: string }) => p.id === "p2")
      .maritalStatus,
  ).toBe("سایر");
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "خانه" })
    .click();
  await expect(page.locator(".pd-next")).toBeVisible();
  expect(await fits(page)).toBe(true);
});
