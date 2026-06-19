// @ts-nocheck
import { test, expect } from "@playwright/test";
import { loginAsRole } from "../utils/auth";
import { NewTicketPage } from "../pages/NewTicketPage";
import { TicketsPage } from "../pages/TicketsPage";

test("crear ticket como usuario final y verlo en listado y detalle", async ({ page }) => {
  await loginAsRole(page, "USER");

  const newTicketPage = new NewTicketPage(page);
  const ticketsPage = new TicketsPage(page);
  const title = `E2E Ticket ${Date.now()}`;

  await newTicketPage.open();
  await newTicketPage.createTicket({
    title,
    description: "Alta simple creada desde Playwright",
    priority: "MEDIUM",
  });

  await ticketsPage.expectTicketVisible(title);
  await ticketsPage.openTicketByTitle(title);

  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await expect(page.getByText("Alta simple creada desde Playwright", { exact: true })).toBeVisible();
});