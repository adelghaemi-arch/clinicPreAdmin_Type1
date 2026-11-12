import { test, expect, type Page } from "@playwright/test";

const url = process.env.APP_URL || "http://localhost:5173";

async function asPatient(page: Page, patientId = "p1") {
  await page.goto(url);
  await page.evaluate((id) => {
    localStorage.clear();
    localStorage.setItem(
      "nabz-session",
      JSON.stringify({
        phone: id === "p2" ? "09124567890" : "09123456789",
        role: "patient",
        demo: true,
        patientId: id,
      }),
    );
  }, patientId);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("h1")).toBeVisible();
}

async function openIntake(page: Page) {
  await page
    .locator(".pd-intake")
    .getByRole("button", { name: /شروع پرسش‌ها|ادامه پرسش‌ها/ })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("تکمیل پرونده برای ویزیت امروز");
  return dialog;
}

async function state(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("nabz-clinic-data-v1")!),
  );
}

test("intake is a dedicated fullscreen page with per-item multiline notes and autosave on blur", async ({
  page,
}) => {
  await asPatient(page, "p1");
  const dialog = await openIntake(page);
  await expect(page.locator(".app-modal.modal-full")).toBeVisible();
  await dialog.getByRole("button", { name: "فرم سریع" }).click();

  // Every card has its own multiline note field.
  const noteCount = await dialog.getByLabel(/یادداشت تکمیلی/).count();
  expect(noteCount).toBeGreaterThanOrEqual(8);

  // Main answer + note for the trigger question, then blur autosaves silently.
  await dialog.getByLabel("محرک‌ها", { exact: true }).fill("کم‌خوابی و استرس");
  await dialog
    .getByLabel(/یادداشت تکمیلی trigger/)
    .fill("خط اول\nخط دوم\nخط سوم؛ مثل هفته پیش سرماخوردم");
  await dialog.getByLabel(/یادداشت تکمیلی trigger/).blur();
  await page.waitForTimeout(300);
  let saved = (await state(page)).intakes.find(
    (item: { appointmentId: string }) => item.appointmentId === "a1",
  );
  expect(saved.answers.trigger.value).toBe("کم‌خوابی و استرس");
  expect(saved.answers.trigger.note).toContain("خط دوم");
  await expect(page.locator(".app-toast")).toHaveCount(0);

  // Notes survive reload as draft data.
  await page.keyboard.press("Escape");
  await page.reload({ waitUntil: "networkidle" });
  await page
    .locator(".pd-intake")
    .getByRole("button", { name: /ادامه پرسش‌ها/ })
    .click();
  await page.getByRole("button", { name: "فرم سریع" }).click();
  await expect(page.getByLabel("محرک‌ها", { exact: true })).toHaveValue(
    "کم‌خوابی و استرس",
  );
});

test("analysis button shows a concise summary with details, goes stale on edit, and auto-runs on save", async ({
  page,
}) => {
  await asPatient(page, "p1");
  const dialog = await openIntake(page);
  await dialog.getByRole("button", { name: /پر کردن با مثال/ }).click();
  await dialog.getByRole("button", { name: "فرم سریع" }).click();

  await dialog
    .getByRole("button", { name: /تحلیل اطلاعات با هوش/ })
    .first()
    .click();
  const summary = dialog.locator(".intake-analysis-summary").first();
  await expect(summary).toBeVisible();
  const text = (await summary.innerText()).trim();
  expect(text.length).toBeGreaterThan(20);
  expect(text.length).toBeLessThan(400);
  // Details hidden until requested.
  await expect(
    dialog.locator(".intake-analysis-topics li").first(),
  ).toBeHidden();
  await dialog
    .getByRole("button", { name: "جزئیات", exact: true })
    .first()
    .click();
  await expect(
    dialog.locator(".intake-analysis-topics li").first(),
  ).toBeVisible();
  await expect(
    dialog.locator(".intake-analysis-topics li").first(),
  ).toContainText("دارو");

  // Editing any field invalidates the previous analysis.
  await dialog
    .getByLabel("داروهای فعلی", { exact: true })
    .fill("تغییر جدید برای تست دارویی");
  // Staleness must be visible before blur/autosave.
  await expect(dialog.locator(".intake-stale-note")).toContainText("نامعتبر");
  await expect(dialog.locator(".intake-analysis").first()).toContainText(
    "تحلیل قبلی نامعتبر شد",
  );

  // Saving without pressing analyze refreshes it automatically.
  await dialog.getByRole("button", { name: "ثبت برای پزشک" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const saved = (await state(page)).intakes.find(
    (item: { patientId: string }) => item.patientId === "p1",
  );
  expect(saved.status).toBe("submitted");
  expect(saved.analysis.topics.find((topic: { id: string }) => topic.id === "meds").summary).toContain("تغییر جدید برای تست دارویی");
  // Record shows the fresh analysis with its own details toggle.
  await page
    .locator(".sidebar-navigation")
    .getByRole("button", { name: "سوابق پزشکی من" })
    .click();
  await page
    .locator(".ehr-tabs")
    .getByRole("button", { name: /پرسش‌های پیش از ویزیت/ })
    .click();
  await expect(page.locator(".ehr-analysis b").first()).toContainText(
    "جمع‌بندی",
  );
  await expect(page.locator(".ehr-analysis details")).toBeVisible();
});

test("patient can attach a lab file and the physician sees it in the record", async ({
  page,
}) => {
  await asPatient(page, "p1");
  const dialog = await openIntake(page);
  await dialog.getByRole("button", { name: "فرم سریع" }).click();
  await dialog.getByLabel("آپلود فایل پزشکی").setInputFiles([
    {
      name: "azmayesh-khoon.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("demo lab content"),
    },
  ]);
  await expect(dialog.locator(".intake-file-list li").first()).toContainText(
    "azmayesh-khoon.pdf",
  );
  await dialog.getByRole("button", { name: "ذخیره پیش‌نویس" }).click();
  const saved = (await state(page)).intakes.find(
    (item: { patientId: string }) => item.patientId === "p1",
  );
  expect(saved.attachments).toHaveLength(1);
  expect(saved.attachments[0].name).toBe("azmayesh-khoon.pdf");
  await dialog.getByRole("button", { name: "بستن", exact: true }).click();

  await page
    .locator(".sidebar-navigation")
    .getByRole("button", { name: "سوابق پزشکی من" })
    .click();
  await page
    .locator(".ehr-tabs")
    .getByRole("button", { name: /پرسش‌های پیش از ویزیت/ })
    .click();
  await expect(page.locator(".ehr-files")).toContainText("azmayesh-khoon.pdf");
});

test("example fill reads like an ordinary patient, not a clinician", async ({
  page,
}) => {
  await asPatient(page, "p1");
  const dialog = await openIntake(page);
  await dialog.getByRole("button", { name: /پر کردن با مثال/ }).click();
  await dialog.getByRole("button", { name: "فرم سریع" }).click();
  await expect(dialog.getByLabel("داروهای فعلی", { exact: true })).toHaveValue(
    /سرماخوردم/,
  );
  await expect(dialog.getByLabel("عمل‌های قبلی", { exact: true })).toHaveValue(
    /پارسال عمل/,
  );
  await expect(
    dialog.getByLabel("آخرین بار بدحالی", { exact: true }),
  ).toHaveValue(/هفته پیش|پنجشنبه/);
});

test("patient inbox opens the dedicated full-page intake on mobile", async ({
  page,
}) => {
  await page.goto(url);
  await page.locator(".role-selector").click();
  await page
    .locator(".role-popover")
    .getByRole("button", { name: "پنل بیمار", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "بیشتر" })
    .click();
  await page
    .locator(".sidebar-navigation")
    .getByRole("button", { name: "کارتابل من" })
    .click();
  await expect(page.locator("h1")).toHaveText("کارتابل من");
  await expect(page.locator(".inbox-task")).toHaveCount(5);
  await page
    .locator(".inbox-task")
    .filter({ hasText: "تکمیل پرونده برای ویزیت امروز" })
    .getByRole("button", { name: "تکمیل پرونده", exact: true })
    .click();
  await expect(page.locator(".app-modal.modal-full")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText(
    "تکمیل پرونده برای ویزیت امروز",
  );
  await page.getByRole("button", { name: "فرم سریع", exact: true }).click();
  expect(await page.getByLabel(/یادداشت تکمیلی/).count()).toBe(8);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});


test("free multiline answers survive Escape without blur", async ({ page }) => {
  await asPatient(page);
  const dialog = await openIntake(page);
  await dialog.getByRole("button", { name: "فرم سریع" }).click();
  const input = dialog.getByLabel("داروهای فعلی", { exact: true });
  await expect(input).toHaveJSProperty("tagName", "TEXTAREA");
  await input.fill("اسم قرصم یادم نیست\nجعبه‌اش را می‌آورم");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  const saved = (await state(page)).intakes.find((item: { patientId: string }) => item.patientId === "p1");
  expect(saved.answers.meds.value).toContain("جعبه‌اش را می‌آورم");
});

test("option-first form keeps descriptions optional and persists quick selections", async ({ page }) => {
  await asPatient(page);
  const dialog = await openIntake(page);
  const allergy = dialog.locator('[data-question="allergy"]');
  await allergy.getByRole("button", { name: "حساسیت ندارم", exact: true }).click();
  await expect(allergy.getByRole("button", { name: "حساسیت ندارم", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(allergy.locator(".intake-free-answer textarea")).toHaveCount(0);
  await allergy.locator(".intake-note-disclosure > summary").click();
  await allergy.getByLabel("یادداشت تکمیلی allergy").fill("یک بار بعد از غذا خارش داشتم\nاسمش یادم نیست");
  await allergy.getByLabel("یادداشت تکمیلی allergy").blur();
  const saved = (await state(page)).intakes.find((item: { patientId: string }) => item.patientId === "p1");
  expect(saved.answers.allergy.value).toBe("حساسیت ندارم");
  expect(saved.answers.allergy.note).toContain("اسمش یادم نیست");
  await allergy.getByRole("button", { name: "پاسخ دیگر / نوشتن", exact: true }).click();
  await expect(allergy.getByLabel("حساسیت دارویی", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
