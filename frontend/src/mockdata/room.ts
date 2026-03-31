import { profileLogos } from "@/mockdata/profileLogos";
import { caseRecords } from "@/mockdata/cases";
import type { RoomDetails, RoomMember } from "@/types/mockdata/room";

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

export const previousCases = caseRecords.slice(0, 3);
