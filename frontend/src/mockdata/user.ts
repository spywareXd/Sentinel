import { profileLogos } from "@/mockdata/profileLogos";

export type CurrentUser = {
  name: string;
  initials: string;
  logoUrl?: string | null;
  status: string;
  shortWallet: string;
};

export type TypingUser = {
  name: string;
};

export const currentUser: CurrentUser = {
  name: "Arnav",
  initials: "A",
  logoUrl: profileLogos.arnav,
  status: "Available for review",
  shortWallet: "0x71B2...4F2C",
};

export const typingUser: TypingUser = {
  name: "Ashwin",
};
