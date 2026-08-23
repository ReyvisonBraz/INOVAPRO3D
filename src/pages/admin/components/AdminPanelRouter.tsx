import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import type { AdminTabId } from "../adminConfig";

interface AdminPanelRouteProps {
  tab: AdminTabId;
  children: ReactNode;
}

interface AdminPanelRouterProps {
  activeTab: AdminTabId;
  children: ReactNode;
}

export function AdminPanelRoute({ children }: AdminPanelRouteProps) {
  return children;
}

export function AdminPanelRouter({ activeTab, children }: AdminPanelRouterProps) {
  const selectedRoute = Children.toArray(children).find(
    (child): child is ReactElement<AdminPanelRouteProps> =>
      isValidElement<AdminPanelRouteProps>(child) && child.props.tab === activeTab,
  );

  // O painel precisa de key propria: sem ela o AnimatePresence ve todos os
  // filhos como key "" e acusa chave duplicada a cada troca de aba. A key e a
  // aba, que e o que de fato muda entre um painel e outro.
  return (
    <AnimatePresence mode="wait">
      {selectedRoute ? <Fragment key={activeTab}>{selectedRoute.props.children}</Fragment> : null}
    </AnimatePresence>
  );
}
