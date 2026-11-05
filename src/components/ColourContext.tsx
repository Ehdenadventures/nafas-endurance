"use client";
import { createContext, useContext, useState } from "react";

/** Shares the chosen colour between the colour picker and the product photos. */
const Ctx = createContext<{ colour: string; setColour: (c: string) => void } | null>(null);

export function ColourProvider({ initial, children }: { initial: string; children: React.ReactNode }) {
  const [colour, setColour] = useState(initial);
  return <Ctx.Provider value={{ colour, setColour }}>{children}</Ctx.Provider>;
}

export const useColour = () => useContext(Ctx);
