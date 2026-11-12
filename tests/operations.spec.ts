import { test, expect, type Page } from "@playwright/test";

const url = process.env.APP_URL || "http://localhost:5173";

async function role(page: Page, name: string) {
  await page.locator(".role-selector").click();
  await page
    .locator(".role-popover")
    .getByRole("button", { name, exact: true })
    .click();
}
async function nav(page: Page, name: string) {
  await page
    .locator(".sidebar-navigation")
    .getByRole("button", { name })
    .click();
}
async function state(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("nabz-clinic-data-v1")!),
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto(url);
  await expect(page.locator("h1")).toBeVisible();
});

test("completed outpatient services create payable invoices and insurance documents", async ({
  page,
}) => {
  await role(page, "پرستاری و خدمات");
  await nav(page, "خدمات سرپایی");
  await page
    .locator(".service-row")
    .filter({ hasText: "نمونه‌گیری آزمایش CBC" })
    .getByRole("button", { name: "ثبت انجام خدمت", exact: true })
    .click();
  await role(page, "مالی و بیمه");
  await nav(page, "امور مالی و بیمه");
  const invoice = page
    .locator("tbody tr")
    .filter({ hasText: "نمونه‌گیری آزمایش CBC" });
  await expect(invoice).toContainText("۵۴٬۰۰۰");
  await invoice
    .getByRole("button", { name: "تسویه فاکتور", exact: true })
    .click();
  await page
    .getByRole("button", { name: "ثبت پرداخت نمایشی", exact: true })
    .click();
  await expect(page.locator(".receipt-lines")).toContainText(
    "واحد خدمات بالینی سرپایی",
  );
  await page.getByRole("button", { name: "بستن پنجره", exact: true }).click();
  expect(
    (await state(page)).procedures.find(
      (item: { id: string }) => item.id === "s1",
    ).paid,
  ).toBe(true);
  await nav(page, "اسناد بیمه‌ای");
  await page
    .locator(".insurance-panel")
    .filter({ hasText: "تأمین اجتماعی" })
    .getByRole("button", { name: "ساخت بسته اسناد", exact: true })
    .click();
  await page
    .getByRole("button", { name: "تأیید و ادامه", exact: true })
    .click();
  expect((await state(page)).claims[0].appointmentIds).toContain("s1");
});

test("waitlist does not issue an invoice; promotion reserves a free slot and can be cancelled", async ({
  page,
}) => {
  await page.getByRole("button", { name: "پذیرش جدید", exact: true }).click();
  await page.locator("#appointment-form select").nth(0).selectOption("p8");
  await page
    .getByRole("combobox", { name: "تخصص", exact: true })
    .selectOption("قلب و عروق");
  await page
    .getByRole("combobox", { name: "پزشک متخصص", exact: true })
    .selectOption("d1");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "تأیید و ثبت نوبت", exact: true })
    .click();
  const waiting = (await state(page)).appointments.find(
    (item: { status: string }) => item.status === "waitlisted",
  );
  expect(waiting.time).toBe("--:--");
  await nav(page, "امور مالی و بیمه");
  const initialCount = await page.locator("tbody tr").count();
  await nav(page, "نوبت‌ها و پذیرش");
  await page
    .locator(".table-tabs")
    .getByRole("button", { name: "لیست انتظار", exact: true })
    .click();
  await page.getByRole("button", { name: "تخصیص نوبت", exact: true }).click();
  await page.getByRole("checkbox").uncheck();
  await expect(
    page.getByRole("button", { name: "۰۸:۱۵", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "۰۸:۰۰", exact: true }).click();
  await page
    .getByRole("button", { name: "ذخیره تغییرات", exact: true })
    .click();
  expect(
    (await state(page)).appointments.find(
      (item: { id: string }) => item.id === waiting.id,
    ).status,
  ).toBe("scheduled");
  await nav(page, "امور مالی و بیمه");
  await expect(page.locator("tbody tr")).toHaveCount(initialCount + 1);
  await nav(page, "نوبت‌ها و پذیرش");
  await page.locator(".search-input input").fill("رضا جعفری");
  await page
    .locator("tbody tr")
    .filter({ hasText: "۰۸:۰۰" })
    .getByRole("button", { name: "مشاهده پرونده رضا جعفری", exact: true })
    .click();
  await page
    .locator(".record-tabs")
    .getByRole("button", { name: /نوبت‌ها و عملیات/ })
    .click();
  await page
    .locator(".record-appointment")
    .filter({ hasText: "۰۸:۰۰" })
    .getByRole("button", { name: "لغو", exact: true })
    .click();
  await page
    .getByRole("button", { name: "تأیید و ادامه", exact: true })
    .click();
  expect(
    (await state(page)).appointments.find(
      (item: { id: string }) => item.id === waiting.id,
    ).status,
  ).toBe("cancelled");
});

test("doctor capacity and leave, and visit tariffs are editable without changing old invoices", async ({
  page,
}) => {
  await nav(page, "مدیریت پزشکان");
  await page.getByRole("button", { name: "افزودن پزشک", exact: true }).click();
  await page
    .getByLabel("نام و نام خانوادگی", { exact: true })
    .fill("دکتر پیام بهرامی");
  await page.getByLabel("شماره اتاق", { exact: true }).fill("۲۰۷");
  await page.getByLabel("ظرفیت روزانه", { exact: true }).fill("9");
  await page.getByRole("button", { name: "ذخیره برنامه", exact: true }).click();
  const doctor = page
    .locator(".doctor-card")
    .filter({ hasText: "دکتر پیام بهرامی" });
  await doctor
    .getByRole("button", { name: "مشاهده و ویرایش برنامه", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "وضعیت حضور", exact: true })
    .selectOption("off");
  await page.getByRole("button", { name: "ذخیره برنامه", exact: true }).click();
  await expect(doctor).toContainText("خارج از شیفت");
  const saved = (await state(page)).doctors.find(
    (item: { name: string }) => item.name === "دکتر پیام بهرامی",
  );
  expect(saved.capacity).toBe(9);
  expect(saved.days).toHaveLength(3);
  await nav(page, "تعرفه‌ها و خدمات");
  await page
    .locator("tbody tr")
    .filter({ hasText: "ویزیت متخصص قلب و عروق" })
    .getByRole("button", { name: "ویرایش", exact: true })
    .click();
  await page.getByLabel("تعرفه آزاد (تومان)", { exact: true }).fill("700000");
  await page.getByLabel("درصد پوشش بیمه پایه", { exact: true }).fill("80");
  await page.getByRole("button", { name: "ذخیره تعرفه", exact: true }).click();
  const data = await state(page);
  expect(
    data.tariffs.find((item: { id: string }) => item.id === "t1").amount,
  ).toBe(700000);
  expect(
    data.appointments.find((item: { id: string }) => item.id === "a2").total,
  ).toBe(680000);
});

test("closing the cash register blocks payment until it is reopened", async ({
  page,
}) => {
  await role(page, "مالی و بیمه");
  await nav(page, "امور مالی و بیمه");
  await page
    .getByRole("button", { name: "بستن صندوق روز", exact: true })
    .click();
  await page
    .getByRole("button", { name: "تأیید و ادامه", exact: true })
    .click();
  await page
    .getByRole("button", { name: "تسویه فاکتور", exact: true })
    .first()
    .click();
  await expect(page.locator(".app-toast").last()).toContainText(
    "صندوق بسته است",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "بازگشایی صندوق", exact: true })
    .click();
  await page
    .getByRole("button", { name: "تأیید و ادامه", exact: true })
    .click();
  expect((await state(page)).cashClosedDate).toBeNull();
  await page
    .getByRole("button", { name: "تسویه فاکتور", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
