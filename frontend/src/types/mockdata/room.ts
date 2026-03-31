export type MemberStatus = "online" | "offline";

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
