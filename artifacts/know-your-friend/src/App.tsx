import {
  Switch,
  Route,
  Router as WouterRouter,
} from "wouter";

import { useHashLocation } from "wouter/use-hash-location";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

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
import { DevGameProvider } from "@/lib/dev-game-context";
import { DevToolbar } from "@/components/dev/dev-toolbar";
import { SoundProvider } from "@/lib/sound";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />

      <Route path="/admin" component={Admin} />

      {import.meta.env.DEV && (
        <Route path="/dev" component={Dev} />
      )}

      <Route path="/room/:code/lobby" component={Lobby} />

      <Route path="/room/:code/game" component={Game} />

      <Route path="/room/:code/results" component={Results} />

      <Route component={NotFound} />
    </Switch>
  );
}

// Beim normalen Deployment läuft die App mit normalen URLs.
// Der itch.io-Build wird mit --base=./ erstellt und verwendet
// deshalb Hash-Routing, damit die Routes auch im itch.io-Unterpfad funktionieren.
const isRelativeBuild = import.meta.env.BASE_URL === "./";

function App() {
  return (
    <DevGameProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <TooltipProvider>
            <WouterRouter
              hook={isRelativeBuild ? useHashLocation : undefined}
              base={
                isRelativeBuild
                  ? ""
                  : import.meta.env.BASE_URL.replace(/\/$/, "")
              }
            >
              <SoundProvider>
                <CampfireScene>
                  <Router />
                </CampfireScene>

                {import.meta.env.DEV && <DevToolbar />}
              </SoundProvider>
            </WouterRouter>

            <Toaster />
          </TooltipProvider>
        </I18nProvider>
      </QueryClientProvider>
    </DevGameProvider>
  );
}

export default App;