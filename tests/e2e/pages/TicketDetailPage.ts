// @ts-nocheck
import { expect, Page } from "@playwright/test";

export class TicketDetailPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(
      this.page.getByRole("heading", { level: 1 }).filter({ hasText: /^Ticket #/ }),
      { timeout: 15000 },
    ).toBeVisible();
  }

  async getTitle() {
    return this.page.getByRole("heading", { level: 1 }).filter({ hasText: /^Ticket #/ });
  }

  async claimTicket() {
    await this.page.getByRole("button", { name: "Reclamar Ticket" }).click();
  }

  async setStatus(status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED") {
    await this.page.getByRole("combobox").first().selectOption(status);
  }

  async setAssigneeByLabel(label: string) {
    await this.page.getByRole("combobox").nth(2).selectOption({ label });
  }

  async reload() {
    await this.page.reload();
    await this.expectLoaded();
  }

  async getDisplayedStatusValue() {
    return this.page.getByRole("combobox").first().inputValue();
  }
}