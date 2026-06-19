// @ts-nocheck
import { expect, Page } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.page.getByPlaceholder("Email").fill(email);
    await this.page.getByPlaceholder("Contraseña").fill(password);
    await this.page.getByRole("button", { name: "Iniciar Sesión" }).click();
    await expect(this.page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  }
}