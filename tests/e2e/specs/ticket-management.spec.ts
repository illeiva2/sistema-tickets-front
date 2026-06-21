// @ts-nocheck
import { test, expect } from "@playwright/test";
import { loginAsRole, logout } from "../utils/auth";
import { NewTicketPage } from "../pages/NewTicketPage";
import { TicketsPage } from "../pages/TicketsPage";
import { TicketDetailPage } from "../pages/TicketDetailPage";
import { seededUsers } from "../fixtures/users";

test("agente reclama un ticket y cambia su estado", async ({ page }) => {
  const title = `E2E Claim ${Date.now()}`;

  await loginAsRole(page, "USER");
  const newTicketPage = new NewTicketPage(page);
  await newTicketPage.open();
  await newTicketPage.createTicket({
    title,
    description: "Ticket de prueba para reclamar como agente",
    priority: "MEDIUM",
  });

  await logout(page, seededUsers.USER.name);
  await loginAsRole(page, "AGENT");

  const ticketsPage = new TicketsPage(page);
  const detailPage = new TicketDetailPage(page);

  await ticketsPage.open();
  await ticketsPage.openTicketByTitle(title);
  await detailPage.expectLoaded();

  await detailPage.claimTicket();
  await expect(page.getByRole("main").getByText(seededUsers.AGENT.name, { exact: true })).toBeVisible();

  await detailPage.setStatus("IN_PROGRESS");
  await detailPage.reload();

  await expect(await detailPage.getDisplayedStatusValue()).toBe("IN_PROGRESS");
  await expect(page.getByRole("main").getByText(seededUsers.AGENT.name, { exact: true })).toBeVisible();
});

test("admin cambia estado y asigna un ticket", async ({ page }) => {
  const title = `E2E Assign ${Date.now()}`;

  await loginAsRole(page, "USER");
  const newTicketPage = new NewTicketPage(page);
  await newTicketPage.open();
  await newTicketPage.createTicket({
    title,
    description: "Ticket de prueba para asignar como admin",
    priority: "HIGH",
  });

  await logout(page, seededUsers.USER.name);
  await loginAsRole(page, "ADMIN");

  const ticketsPage = new TicketsPage(page);
  const detailPage = new TicketDetailPage(page);

  await ticketsPage.open();
  await ticketsPage.openTicketByTitle(title);
  await detailPage.expectLoaded();

  const agentLabel = `${seededUsers.AGENT.name} (${seededUsers.AGENT.email})`;

  await detailPage.setStatus("RESOLVED");
  await detailPage.setAssigneeByLabel(agentLabel);
  await detailPage.reload();

  await expect(await detailPage.getDisplayedStatusValue()).toBe("RESOLVED");
  await expect(page.getByRole("combobox").nth(2)).toContainText(seededUsers.AGENT.name);
});