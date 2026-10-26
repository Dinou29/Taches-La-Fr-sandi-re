import React from "react";
import { Check, ShoppingBag, Wrench, Compass } from "lucide-react";
import combi from "./assets/combi-volkswagen.png";

const contextIcons = {
  shopping: ShoppingBag,
  prepare: Wrench,
  celebrate: Check,
  thinking: Compass,
};

export default function Combi({ pose = "welcome", className = "" }) {
  const Icon = contextIcons[pose];
  return (
    <span className={`combi combi-${pose} ${className}`}>
      <img
        className="combi-image"
        src={combi}
        alt="Combi Volkswagen bricoleur, vert et crème"
        width="1254"
        height="1254"
        decoding="async"
      />
      {Icon && (
        <span className="combi-context" aria-hidden="true">
          <Icon size={17} strokeWidth={1.7} />
        </span>
      )}
    </span>
  );
}
