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
