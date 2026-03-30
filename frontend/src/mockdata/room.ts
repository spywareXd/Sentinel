import { profileLogos } from "@/mockdata/profileLogos";

export type MemberStatus = "online" | "offline" ;

export type RoomMember = {
  name: string;
  initials: string;
  logoUrl?: string | null;
  role: string;
  status: MemberStatus;
};

export type PreviousCasesItems = {
  title: string;
  subtitle: string;
};

export type RoomDetails = {
  heading: string;
  description: string;
  membersLabel: string;
  contextLabel: string;
};

export const roomDetails: RoomDetails = {
  heading: "Room Details",
  description:
    "Shared community discussion space for live conversation, emerging moderation signals, and consensus-oriented review.",
  membersLabel: "Participants",
  contextLabel: "Previous Cases",
};

export const roomMembers: RoomMember[] = [
  {
    name: "BruhGunned",
    initials: "B",
    logoUrl: "https://avatars.githubusercontent.com/u/84615898?v=4",
    role: "Online",
    status: "online",
  },
  {
    name: "Arnav",
    initials: "A",
    logoUrl: profileLogos.arnav,
    role: "Online",
    status: "online",
  },
  {
    name: "Ashwin",
    initials: "A",
    logoUrl: profileLogos.Ashwin,
    role: "Offline",
    status: "offline",
  },
  {
    name: "Shreyan",
    initials: "S",
    logoUrl: profileLogos.Shreyan,
    role: "Offline",
    status: "offline",
  },
];

export const previousCasesItems: PreviousCasesItems[] = [
  {
    title: "Case #214 • Dismissed",
    subtitle: "trash-talk report closed yesterday",
  },
  {
    title: "Case #198 • Punished",
    subtitle: "direct self-harm message removed",
  },
  {
    title: "Case #176 • Resolved",
    subtitle: "hate-speech vote finalized",
  },
]

