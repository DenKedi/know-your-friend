import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function SoundToggle({ className }: { className?: string }) {
  const { isMuted, toggleMuted } = useSound();
  const label = isMuted ? "Enable sound" : "Mute sound";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleMuted}
          className={cn("text-foreground/70 hover:text-foreground", className)}
          aria-label={label}
          data-sound="off"
        >
          {isMuted ? <VolumeX /> : <Volume2 />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}