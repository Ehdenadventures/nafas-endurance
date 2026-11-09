"use client";
import { createContext, useContext, useState } from "react";

/** Shares the chosen flavour and packaging between the pickers and the product photos. */
type Choice = { colour: string; setColour: (c: string) => void; pack: string; setPack: (p: string) => void };
const Ctx = createContext<Choice | null>(null);

export function ColourProvider({ initial, initialPack = "", children }: { initial: string; initialPack?: string; children: React.ReactNode }) {
  const [colour, setColour] = useState(initial);
  const [pack, setPack] = useState(initialPack);
  return <Ctx.Provider value={{ colour, setColour, pack, setPack }}>{children}</Ctx.Provider>;
}

export const useColour = () => useContext(Ctx);
