export type MessageTone = "primary" | "secondary" | "tertiary" | "self";

export type Message = {
  id: number;
  author: string;
  authorInitials: string;
  authorLogoUrl?: string | null;
  time: string;
  text: string;
  tone: MessageTone;
  grouped?: boolean;
};

export type FeedMeta = {
  dayLabel: string;
  composerPlaceholder: string;
  helperText: string;
};
