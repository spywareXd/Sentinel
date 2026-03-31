import { profileLogos } from "@/mockdata/profileLogos";
import type { CurrentUser, TypingUser } from "@/types/mockdata/user";

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
