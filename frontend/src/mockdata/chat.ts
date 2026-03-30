import { profileLogos } from "@/mockdata/profileLogos";

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

export const feedMeta: FeedMeta = {
  dayLabel: "Today",
  composerPlaceholder: "Say something...",
  helperText: "Press Enter to send",
};

export const messages: Message[] = [
  {
    id: 1,
    author: "BruhGunned",
    authorInitials: "B",
    authorLogoUrl: "https://avatars.githubusercontent.com/u/84615898?v=4",
    time: "09:38 AM",
    text: "yo did anyone else see that message in general just now",
    tone: "secondary",
  },
  {
    id: 2,
    author: "Ashwin",
    authorInitials: "A",
    authorLogoUrl: profileLogos.miller,
    time: "09:39 AM",
    text: "nah what happened",
    tone: "primary",
  },
  {
    id: 3,
    author: "BruhGunned",
    authorInitials: "B",
    authorLogoUrl: "https://avatars.githubusercontent.com/u/84615898?v=4",
    time: "09:39 AM",
    text: "some dude told another guy to go end himself over a game loss",
    tone: "secondary",
  },
  {
    id: 4,
    author: "Ashwin",
    authorInitials: "A",
    authorLogoUrl: profileLogos.miller,
    time: "09:42 AM",
    text: "nah that was way out of pocket",
    tone: "primary",
  },
  {
    id: 5,
    author: "Ashwin",
    authorInitials: "A",
    authorLogoUrl: profileLogos.miller,
    time: "09:44 AM",
    text: "mods gonna get dragged into this one",
    tone: "primary",
    grouped: true,
  },
  {
    id: 6,
    author: "Arnav",
    authorInitials: "A",
    authorLogoUrl: profileLogos.arnav,
    time: "09:46 AM",
    text: "wait was it actually direct or were they just saying random nonsense",
    tone: "self",
  },
  {
    id: 7,
    author: "Shreyan",
    authorInitials: "S",
    authorLogoUrl: profileLogos.yevhen,
    time: "09:47 AM",
    text: "it looked direct to me",
    tone: "tertiary",
  },
  {
    id: 8,
    author: "Shreyan",
    authorInitials: "S",
    authorLogoUrl: profileLogos.yevhen,
    time: "09:48 AM",
    text: "like not even ambiguous, it was pretty explicit",
    tone: "tertiary",
    grouped: true,
  },
  {
    id: 9,
    author: "BruhGunned",
    authorInitials: "B",
    authorLogoUrl: "https://avatars.githubusercontent.com/u/84615898?v=4",
    time: "09:50 AM",
    text: "someone better have the screenshot before it gets deleted",
    tone: "secondary",
  },
  {
    id: 10,
    author: "Ashwin",
    authorInitials: "A",
    authorLogoUrl: profileLogos.miller,
    time: "09:52 AM",
    text: "i got it lol",
    tone: "primary",
  },
  {
    id: 11,
    author: "Ashwin",
    authorInitials: "A",
    authorLogoUrl: profileLogos.miller,
    time: "09:52 AM",
    text: "sending it in a sec",
    tone: "primary",
    grouped: true,
  },
  {
    id: 12,
    author: "Shreyan",
    authorInitials: "S",
    authorLogoUrl: profileLogos.yevhen,
    time: "09:55 AM",
    text: "i mean that message was wild but idk if it deserves punishment",
    tone: "tertiary",
  },
  {
    id: 13,
    author: "BruhGunned",
    authorInitials: "B",
    authorLogoUrl: "https://avatars.githubusercontent.com/u/84615898?v=4",
    time: "09:56 AM",
    text: "nah if you tell someone to kys in direct reply that is absolutely getting flagged",
    tone: "secondary",
  },
  {
    id: 14,
    author: "Ashwin",
    authorInitials: "A",
    authorLogoUrl: profileLogos.miller,
    time: "09:58 AM",
    text: "yeah this is not one of those edge cases",
    tone: "primary",
  },
  {
    id: 15,
    author: "BruhGunned",
    authorInitials: "B",
    authorLogoUrl: "https://avatars.githubusercontent.com/u/84615898?v=4",
    time: "10:02 AM",
    text: "Sumimasen minasan",
    tone: "secondary",
  },
  {
    id: 16,
    author: "Arnav",
    authorInitials: "A",
    authorLogoUrl: profileLogos.arnav,
    time: "10:06 AM",
    text: "if somebody gets picked for jury duty on this one please read the full context first",
    tone: "self",
  },
  {
    id: 17,
    author: "BruhGunned",
    authorInitials: "B",
    authorLogoUrl: "https://avatars.githubusercontent.com/u/84615898?v=4",
    time: "10:08 AM",
    text: "fair but the original context still looks awful",
    tone: "secondary",
  },
  {
    id: 18,
    author: "You",
    authorInitials: "Y",
    authorLogoUrl: profileLogos.arnav,
    time: "10:45 AM",
    text: "someone clip the original context",
    tone: "self",
  },
];
