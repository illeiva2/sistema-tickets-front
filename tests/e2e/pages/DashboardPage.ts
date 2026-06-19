// @ts-nocheck
import { expect, Page } from "@playwright/test";

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto("/");
    await expect(this.page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  }

  async refresh() {
    await this.page.getByRole("button", { name: "Actualizar" }).click();
  }

  async getOpenTicketsCount() {
    return this.getCountByCardHeading("Tickets Abiertos");
  }

  async getClosedTicketsCount() {
    return this.getCountByCardHeading("Cerrados");
  }

  async getCountByCardHeading(heading: string) {
    const card = this.page
      .getByRole("heading", { name: heading, exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');

    const value = card.locator('div.text-3xl').first();
    await expect(value).toBeVisible();

    const text = await value.textContent();
    return Number((text || "0").trim());
  }
}