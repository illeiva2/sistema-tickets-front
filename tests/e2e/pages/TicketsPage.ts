// @ts-nocheck
import { expect, Page } from "@playwright/test";

export class TicketsPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto("/tickets");
    await expect(this.page.getByRole("heading", { name: "Tickets", exact: true })).toBeVisible();
  }

  async openTicketByTitle(title: string) {
    await this.page.getByText(title, { exact: true }).click();
    await expect(this.page).toHaveURL(/\/tickets\/[\w-]+/);
  }

  async expectTicketVisible(title: string) {
    await expect(this.page.getByText(title, { exact: true })).toBeVisible();
  }
}