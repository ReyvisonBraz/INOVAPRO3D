import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminPanelRoute, AdminPanelRouter } from "./AdminPanelRouter";

const panelRoute = (tab: "overview" | "orders", label: string) =>
  createElement(AdminPanelRoute, { tab, children: createElement("div", null, label) });

describe("AdminPanelRouter", () => {
  it("renderiza somente o painel da aba ativa", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminPanelRouter, {
        activeTab: "orders",
        children: [panelRoute("overview", "Painel geral"), panelRoute("orders", "Pedidos ativos")],
      }),
    );

    expect(markup).toContain("Pedidos ativos");
    expect(markup).not.toContain("Painel geral");
  });

  it("não renderiza conteúdo para uma aba sem rota registrada", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminPanelRouter, {
        activeTab: "settings",
        children: panelRoute("overview", "Painel geral"),
      }),
    );

    expect(markup).toBe("");
  });
});
