// @ts-nocheck
import { expect, Page } from "@playwright/test";
import { seededUsers, SeededRole } from "../fixtures/users";

export async function loginAsRole(page: Page, role: SeededRole) {
  const user = seededUsers[role];

  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(user.email);
  await page.getByPlaceholder("Contraseña").fill(user.password);
  await Promise.all([
    page.waitForURL(/^(?!.*\/login).*$/),
    page.getByRole("button", { name: "Iniciar Sesión" }).click(),
  ]);

  await expect(page.getByRole("button", { name: user.name })).toBeVisible();
}

export async function openUserMenu(page: Page, userName: string) {
  await page
    .getByRole("button")
    .filter({ hasText: userName })
    .click();
}

export async function logout(page: Page, userName: string) {
  await openUserMenu(page, userName);
  await page.getByRole("button", { name: "Cerrar Sesión" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Iniciar Sesión" })).toBeVisible();
}