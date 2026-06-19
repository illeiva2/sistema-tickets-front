// @ts-nocheck
import { test, expect } from "@playwright/test";
import { loginAsRole, logout } from "../utils/auth";
import { DashboardPage } from "../pages/DashboardPage";
import { NewTicketPage } from "../pages/NewTicketPage";
import { TicketsPage } from "../pages/TicketsPage";
import { TicketDetailPage } from "../pages/TicketDetailPage";
import { seededUsers } from "../fixtures/users";

test("el dashboard actualiza contadores al crear un ticket", async ({ page }) => {
  await loginAsRole(page, "ADMIN");

  const dashboardPage = new DashboardPage(page);
  const newTicketPage = new NewTicketPage(page);

  await dashboardPage.open();
  const initialOpen = await dashboardPage.getOpenTicketsCount();

  await page.getByRole("link", { name: "Nuevo Ticket" }).click();
  const title = `E2E Dashboard ${Date.now()}`;
  await newTicketPage.createTicket({
    title,
    description: "Ticket para validar métricas del dashboard",
    priority: "LOW",
  });

  await dashboardPage.open();
  await dashboardPage.refresh();

  await expect(await dashboardPage.getOpenTicketsCount()).toBe(initialOpen + 1);
});

test("el dashboard actualiza contadores al cerrar un ticket", async ({ page }) => {
  const title = `E2E Close ${Date.now()}`;

  await loginAsRole(page, "USER");
  const newTicketPage = new NewTicketPage(page);
  await newTicketPage.open();
  await newTicketPage.createTicket({
    title,
    description: "Ticket de prueba para cerrar y validar métricas",
    priority: "LOW",
  });

  await logout(page, seededUsers.USER.name);
  await loginAsRole(page, "ADMIN");

  const dashboardPage = new DashboardPage(page);
  const ticketsPage = new TicketsPage(page);
  const detailPage = new TicketDetailPage(page);

  await dashboardPage.open();
  const initialClosed = await dashboardPage.getClosedTicketsCount();

  await ticketsPage.open();
  await ticketsPage.openTicketByTitle(title);
  await detailPage.expectLoaded();
  await detailPage.setStatus("CLOSED");
  await detailPage.reload();

  await dashboardPage.open();
  await dashboardPage.refresh();

  await expect(await dashboardPage.getClosedTicketsCount()).toBe(initialClosed + 1);
});