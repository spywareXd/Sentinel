export type MessageTone = "primary" | "secondary" | "tertiary" | "self";

export type Message = {
  id: string; // UUID from supabase
  author: string;
  authorInitials: string;
  authorLogoUrl?: string | null;
  time: string;
  text: string;
  flagged?: boolean;
  tone: MessageTone;
  grouped?: boolean;
  isFocused?: boolean;
};

export type FeedMeta = {
  dayLabel: string;
  composerPlaceholder: string;
  helperText: string;
};
