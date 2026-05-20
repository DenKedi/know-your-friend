import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Lobby from "@/pages/lobby";
import Game from "@/pages/game";
import Results from "@/pages/results";
import Admin from "@/pages/admin";
import Dev from "@/pages/dev";
import { I18nProvider } from "@/lib/i18n";
import { CampfireScene } from "@/components/scene/campfire-scene";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={Admin} />
      {import.meta.env.DEV && <Route path="/dev" component={Dev} />}
      <Route path="/room/:code/lobby" component={Lobby} />
      <Route path="/room/:code/game" component={Game} />
      <Route path="/room/:code/results" component={Results} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <CampfireScene>
              <Router />
            </CampfireScene>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
