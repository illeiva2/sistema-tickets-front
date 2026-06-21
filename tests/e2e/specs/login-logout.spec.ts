// @ts-nocheck
import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { logout, loginAsRole } from "../utils/auth";
import { seededUsers, SeededRole } from "../fixtures/users";

const roleExpectations: Record<SeededRole, { visible: string[]; hidden: string[] }> = {
  ADMIN: { visible: ["Archivos", "Usuarios"], hidden: [] },
  AGENT: { visible: ["Archivos"], hidden: ["Usuarios"] },
  USER: { visible: [], hidden: ["Archivos", "Usuarios"] },
};

for (const role of ["ADMIN", "AGENT", "USER"] as SeededRole[]) {
  test(`login y logout como ${role.toLowerCase()}`, async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(seededUsers[role].email, seededUsers[role].password);

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    for (const label of roleExpectations[role].visible) {
      await expect(page.getByRole("link", { name: label })).toBeVisible();
    }

    for (const label of roleExpectations[role].hidden) {
      await expect(page.getByRole("link", { name: label })).toHaveCount(0);
    }

    await logout(page, seededUsers[role].name);
  });
}