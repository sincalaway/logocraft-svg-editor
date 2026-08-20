import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AssetLibraryLayoutController from "./components/AssetLibraryLayoutController";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import EditorUtilityDock from "./components/EditorUtilityDock";
import InspectorLayoutController from "./components/InspectorLayoutController";
import InspectorLibraryQuickAccess from "./components/InspectorLibraryQuickAccess";
import CanvasReferenceOverlay from "./components/CanvasReferenceOverlay";
import GlobalCommandPalette from "./components/GlobalCommandPalette";
import MeasurementUnitController from "./components/MeasurementUnitController";
import OnboardingGuide from "./components/OnboardingGuide";
import ProductionToolsDock from "./components/ProductionToolsDock";
import SidebarShortcutPanel from "./components/SidebarShortcutPanel";
import SvgLibraryPanel from "./components/SvgLibraryPanel";
import VersionHistoryPanel from "./components/VersionHistoryPanel";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-center" />
          <Router />
          <AssetLibraryLayoutController />
          <InspectorLayoutController />
          <InspectorLibraryQuickAccess />
          <CanvasReferenceOverlay />
          <MeasurementUnitController />
          <EditorUtilityDock />
          <ProductionToolsDock />
          <SidebarShortcutPanel />
          <SvgLibraryPanel />
          <OnboardingGuide />
          <GlobalCommandPalette />
          <VersionHistoryPanel />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
