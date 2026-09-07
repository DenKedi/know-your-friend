import { DEFAULT_SCENE } from "@/lib/scene-config";
import { usePlayerSlots } from "@/hooks/use-player-slots";
import { usePlayerJoinEvents } from "@/hooks/use-player-join-events";
import { AnimalCharacter } from "./animal-character";

type Player = { id: string; name: string; animal?: string; isHost: boolean };

type Props = {
  players: readonly Player[];
};

/**
 * Renders the character + label layer on top of the persistent CampfireScene.
 * `fixed inset-0` covers the viewport so positions align with the video
 * regardless of foreground page scroll.
 */
export function LobbyCharacterLayer({ players }: Props) {
  const assignments = usePlayerSlots(players, DEFAULT_SCENE.slots);
  const enteringIds = usePlayerJoinEvents(players);

  return (
    <div className="pointer-events-none fixed inset-0 z-[5] overflow-hidden" aria-hidden>
      {assignments.map(({ slot, player }) => {
        const isEntering = enteringIds.has(player.id);
        return (
          <AnimalCharacter
            key={player.id}
            slot={slot}
            animal={player.animal}
            name={player.name}
            isHost={player.isHost}
            isEntering={isEntering}
          />
        );
      })}
    </div>
  );
}
