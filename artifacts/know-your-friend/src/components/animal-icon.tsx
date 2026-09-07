import { getAnimalImage } from "@/lib/scene-config";
import { cn } from "@/lib/utils";

type Props = {
  animal?: string;
  label: string;
  className?: string;
};

export function AnimalIcon({ animal, label, className }: Props) {
  const image = getAnimalImage(animal);

  if (!image) return <>{label.substring(0, 2).toUpperCase()}</>;

  return <img src={image} alt="" aria-hidden className={cn("h-full w-full object-contain", className)} />;
}