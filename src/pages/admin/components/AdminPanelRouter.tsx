import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
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

  return <AnimatePresence mode="wait">{selectedRoute?.props.children ?? null}</AnimatePresence>;
}
