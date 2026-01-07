import { RoiCalculator } from "@/components/RoiCalculator";
import { EmbedHeightMessenger } from "@/components/EmbedHeightMessenger";

export default function EmbedPage() {
  return (
    <div className="bg-background">
      <EmbedHeightMessenger />
      <RoiCalculator embed />
    </div>
  );
}
