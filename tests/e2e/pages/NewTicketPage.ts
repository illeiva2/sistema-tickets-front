// @ts-nocheck
import { expect, Page } from "@playwright/test";

export class NewTicketPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto("/tickets/new");
    await expect(this.page.getByRole("heading", { name: "Nuevo Ticket" })).toBeVisible();
  }

  async createTicket(data: { title: string; description: string; priority: string }) {
    await this.page.getByPlaceholder("Resumen del problema o solicitud").fill(data.title);
    await this.page.getByPlaceholder("Describe detalladamente el problema o solicitud...").fill(data.description);
    await this.page.getByRole("combobox").selectOption(data.priority);
    await this.page.getByRole("button", { name: "Crear Ticket" }).click();
    await expect(this.page).toHaveURL(/\/tickets/);
  }
}