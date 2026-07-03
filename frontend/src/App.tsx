import { useEffect, useState } from "react";

import { DashboardPage } from "./components/DashboardPage";
import { LandingPage } from "./components/LandingPage";
import { useStellar } from "./hooks/useStellar";

type RouteId = "landing" | "dashboard";

function routeFromPath(pathname: string): RouteId {
  return pathname.startsWith("/dashboard") ? "dashboard" : "landing";
}

function navigateTo(pathname: string, setRoute: (route: RouteId) => void) {
  window.history.pushState({}, "", pathname);
  setRoute(routeFromPath(pathname));
}

function replaceRoute(pathname: string, setRoute: (route: RouteId) => void) {
  window.history.replaceState({}, "", pathname);
  setRoute(routeFromPath(pathname));
}

export default function App() {
  const stellar = useStellar();
  const [route, setRoute] = useState<RouteId>(() => routeFromPath(window.location.pathname));
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const onPopState = () => setRoute(routeFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);

    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!stellar.isReady) {
      return;
    }

    if (stellar.isConnected && route !== "dashboard") {
      replaceRoute("/dashboard", setRoute);
      return;
    }

    if (!stellar.isConnected && route !== "landing") {
      replaceRoute("/", setRoute);
    }
  }, [route, stellar.isConnected, stellar.isReady]);

  const handleConnectWallet = async () => {
    setIsConnecting(true);

    try {
      await stellar.connect();
      replaceRoute("/dashboard", setRoute);
    } catch {
      replaceRoute("/", setRoute);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectToLanding = () => {
    stellar.disconnect();
    replaceRoute("/", setRoute);
  };

  if (!stellar.isReady) {
    return <div className="boot-shell">Loading InvoiceVeil...</div>;
  }

  if (route === "dashboard" && stellar.isConnected) {
    return <DashboardPage stellar={stellar} onDisconnectToLanding={handleDisconnectToLanding} />;
  }

  return (
    <LandingPage
      mode={stellar.mode}
      isConnecting={isConnecting}
      isConnected={stellar.isConnected}
      onConnectWallet={handleConnectWallet}
      onOpenDashboard={() => {
        if (stellar.isConnected) {
          navigateTo("/dashboard", setRoute);
        }
      }}
    />
  );
}
