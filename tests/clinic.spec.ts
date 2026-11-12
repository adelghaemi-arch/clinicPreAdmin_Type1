import { test, expect, type Page } from "@playwright/test";

const url = process.env.APP_URL || "http://localhost:5173";

async function switchRole(page: Page, name: string) {
  await page.locator(".role-selector").click();
  await page
    .locator(".role-popover")
    .getByRole("button", { name, exact: true })
    .click();
  await expect(page.locator("h1")).toBeVisible();
}

async function navigate(page: Page, name: string) {
  await page
    .locator(".sidebar-navigation")
    .getByRole("button", { name })
    .click();
}

test.beforeEach(async ({ page }) => {
  await page.goto(url);
  await expect(page.locator("h1")).toBeVisible();
});

test("Persian dashboard, six themes and persisted light/dark selection", async ({
  page,
}) => {
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator(".metric-card")).toHaveCount(4);
  await expect(page.locator(".metric-value").first()).toContainText("۱۲");
  await navigate(page, "تنظیمات");
  await expect(page.locator(".theme-option")).toHaveCount(6);
  for (const [name, id] of [
    ["شب", "night"],
    ["سازمانی", "corporate"],
    ["زمرد", "emerald"],
    ["نورد", "nord"],
    ["گرگ‌ومیش", "dim"],
    ["زمستان", "winter"],
  ]) {
    await page.locator(".theme-option").filter({ hasText: name }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", id);
  }
  await page
    .getByRole("button", { name: "فعال کردن تم تیره", exact: true })
    .click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
});

test("five-digit OTP rejects incorrect codes and accepts Persian digits", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "خروج و ورود با کد پنج‌رقمی", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "شماره تلفن همراه", exact: true })
    .fill("۰۹۱۲۱۲۳۴۵۶۷");
  await page
    .getByRole("button", { name: "دریافت کد ورود", exact: true })
    .click();
  const inputs = page.locator(".otp-inputs input");
  await expect(inputs).toHaveCount(5);
  for (let i = 0; i < 5; i++) await inputs.nth(i).fill("0");
  await page
    .getByRole("button", { name: "تأیید و ورود به پنل", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("صحیح نیست");
  for (const [i, digit] of [..."۱۲۳۴۵"].entries())
    await inputs.nth(i).fill(digit);
  await page
    .getByRole("button", { name: "تأیید و ورود به پنل", exact: true })
    .click();
  await expect(page.locator("h1")).toHaveText("داشبورد مدیریتی");
});

test("shared workflow: registration, scheduling, triage, visit and payment", async ({
  page,
}) => {
  await navigate(page, "پرونده بیماران");
  await page
    .getByRole("button", { name: "تشکیل پرونده جدید", exact: true })
    .click();
  await page
    .getByLabel("نام و نام خانوادگی", { exact: true })
    .fill("آرمان سپهری");
  await page.getByLabel("کد ملی (۱۰ رقم)", { exact: true }).fill("1112223334");
  await page.getByLabel("شماره همراه", { exact: true }).fill("09129998877");
  await page.getByRole("button", { name: "ذخیره پرونده", exact: true }).click();
  await expect(page.locator(".record-person")).toContainText("آرمان سپهری");
  const patientId = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("nabz-clinic-data-v1")!).patients.find(
        (p: { name: string }) => p.name === "آرمان سپهری",
      ).id,
  );
  await page.getByRole("button", { name: "بستن پنجره", exact: true }).click();
  await navigate(page, "نوبت‌ها و پذیرش");
  await page
    .getByRole("button", { name: "ثبت نوبت جدید", exact: true })
    .click();
  await page.locator("#appointment-form select").nth(0).selectOption(patientId);
  await page
    .getByRole("combobox", { name: "تخصص", exact: true })
    .selectOption("قلب و عروق");
  await page
    .getByRole("combobox", { name: "پزشک متخصص", exact: true })
    .selectOption("d1");
  await page.getByRole("button", { name: "۰۸:۰۰", exact: true }).click();
  await page
    .getByRole("button", { name: "تأیید و ثبت نوبت", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator(".search-input input").fill("آرمان سپهری");
  await page
    .locator("tr")
    .filter({ hasText: "آرمان سپهری" })
    .getByRole("button", { name: "پذیرش", exact: true })
    .click();
  await expect(
    page.locator("tr").filter({ hasText: "آرمان سپهری" }),
  ).toContainText("در انتظار");

  await switchRole(page, "پرستاری و خدمات");
  await navigate(page, "تریاژ و علائم حیاتی");
  await page
    .locator("tr")
    .filter({ hasText: "آرمان سپهری" })
    .getByRole("button", { name: "ثبت علائم", exact: true })
    .click();
  await page.getByLabel("فشار خون (mmHg)", { exact: true }).fill("120/80");
  await page.getByLabel("نبض (در دقیقه)", { exact: true }).fill("75");
  await page.getByLabel("دمای بدن (سانتی‌گراد)", { exact: true }).fill("36.8");
  await page.getByLabel("وزن (کیلوگرم)", { exact: true }).fill("74");
  await page.getByLabel("قد (سانتی‌متر)", { exact: true }).fill("178");
  await page
    .getByRole("button", { name: "ذخیره و آماده‌سازی ویزیت", exact: true })
    .click();
  await expect(
    page.locator("tr").filter({ hasText: "آرمان سپهری" }),
  ).toContainText("آماده ویزیت");

  await switchRole(page, "پزشک متخصص");
  await navigate(page, "ویزیت و نسخه‌نویسی");
  await page
    .locator("tr")
    .filter({ hasText: "آرمان سپهری" })
    .getByRole("button", { name: "ویزیت", exact: true })
    .click();
  await page
    .getByLabel("شرح حال و معاینه", { exact: true })
    .fill("معاینه دوره‌ای و ارزیابی وضعیت عمومی؛ علائم حیاتی پایدار.");
  await page
    .getByLabel("تشخیص و کد ICD-10", { exact: true })
    .fill("Z00 - معاینه دوره‌ای");
  await page
    .getByLabel("آزمایش، تصویربرداری یا ارجاع", { exact: true })
    .fill("آزمایش CBC برای پیگیری");
  await page
    .getByRole("button", { name: "ثبت نسخه و پایان ویزیت", exact: true })
    .click();

  await switchRole(page, "مالی و بیمه");
  await navigate(page, "امور مالی و بیمه");
  await page.locator(".search-input input").fill("آرمان سپهری");
  await page.getByRole("button", { name: "تسویه فاکتور", exact: true }).click();
  await page
    .getByRole("button", { name: "ثبت پرداخت نمایشی", exact: true })
    .click();
  await expect(page.locator(".receipt-success")).toContainText("موفقیت");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "دانلود رسید", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/^receipt-.*\.txt$/);
  const saved = await page.evaluate((id) => {
    const data = JSON.parse(localStorage.getItem("nabz-clinic-data-v1")!);
    return {
      appointment: data.appointments.find(
        (item: { patientId: string }) => item.patientId === id,
      ),
      prescriptions: data.prescriptions.filter(
        (item: { patientId: string }) => item.patientId === id,
      ),
    };
  }, patientId);
  expect(saved.appointment.status).toBe("completed");
  expect(saved.appointment.paid).toBe(true);
  expect(saved.appointment.vitals.pressure).toBe("120/80");
  expect(saved.prescriptions).toHaveLength(1);
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("nabz-session")!).role,
    ),
  ).toBe("finance");
});

test("patient view only shows own appointments, prescriptions and search results", async ({
  page,
}) => {
  await switchRole(page, "پنل بیمار");
  await navigate(page, "نوبت‌های من");
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await expect(page.locator("tbody")).not.toContainText("علی رضایی");
  await page
    .getByRole("textbox", { name: "جستجوی سراسری", exact: true })
    .fill("علی رضایی");
  await expect(page.locator(".search-results")).toContainText("پیدا نشد");
  await page.keyboard.press("Escape");
  await navigate(page, "نسخه‌های الکترونیک");
  await expect(page.locator(".prescription-panel")).toHaveCount(1);
  await expect(page.locator(".prescription-panel")).toContainText("مریم احمدی");
  await navigate(page, "اعلان‌ها");
  await expect(page.locator(".notification-list")).not.toContainText(
    "حسین موسوی",
  );
});

test("insurance bundles are local, exported and cannot duplicate submitted invoices", async ({
  page,
}) => {
  await switchRole(page, "مالی و بیمه");
  await navigate(page, "اسناد بیمه‌ای");
  const card = page
    .locator(".insurance-panel")
    .filter({ hasText: "بیمه سلامت" });
  await card
    .getByRole("button", { name: "استعلام نمایشی اعتبار", exact: true })
    .click();
  await expect(card).toContainText("تأیید شد");
  await card
    .getByRole("button", { name: "ساخت بسته اسناد", exact: true })
    .click();
  await page
    .getByRole("button", { name: "تأیید و ادامه", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await card
    .getByRole("button", { name: "ساخت بسته اسناد", exact: true })
    .click();
  await expect(page.locator(".app-toast").last()).toContainText("وجود ندارد");
});

test("all six workspaces render, and mobile navigation has no page overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const role of [
    "مدیریت کلینیک",
    "پزشک متخصص",
    "پذیرش و نوبت‌دهی",
    "پرستاری و خدمات",
    "مالی و بیمه",
    "پنل بیمار",
  ]) {
    await switchRole(page, role);
    const items = page.locator(".sidebar-navigation .nav-item");
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      await items.nth(i).click();
      await expect(page.locator("h1")).toBeVisible();
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "بیشتر" })
    .click();
  await expect(page.locator(".sidebar")).toHaveClass(/sidebar-open/);
  await page.locator(".sidebar-navigation .nav-item").first().click();
  await expect(page.locator(".sidebar")).not.toHaveClass(/sidebar-open/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
