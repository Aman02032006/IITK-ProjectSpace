import { UserSummary } from "./projectApi"

const DESIGNATION_RANK: Record<string, number> = {
  "Higher Academic Grade Professor": 1,
  "Professor": 2,
  "Associate Professor": 3,
  "Assistant Professor": 4,
  "Post-Doctoral Researcher": 5,
  "Ph.D Scholar": 6,
  "Postgraduate Student": 7,
  "Undergraduate Student": 8,
  "HAG_PROF": 1,
  "PROF": 2,
  "ASSCT_PROF": 3,
  "ASST_PROF": 4,
  "POSTDOC": 5,
  "PHD": 6,
  "PG_STUDENT": 7,
  "UG_STUDENT": 8,
  "NA": 9,
};

export function getRepresentativeString(
  members?: UserSummary[],
  fallbackName?: string,
  fallbackAvatar?: string
): { 
  displayText: string; 
  representative: UserSummary | null 
} {
  if (!members || members.length === 0) {
    if (fallbackName) {
      return { displayText: fallbackName, representative: { id: "creator", fullname: fallbackName, designation: "NA", profile_picture_url: fallbackAvatar } };
    }
    return { displayText: "Unknown", representative: null };
  }

  const sortedMembers = [...members].sort((a, b) => {
    const rankA = DESIGNATION_RANK[a?.designation] ?? 99;
    const rankB = DESIGNATION_RANK[b?.designation] ?? 99;

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    const nameA = a?.fullname || "";
    const nameB = b?.fullname || "";
    return nameA.localeCompare(nameB);
  });

  const rep = { ...sortedMembers[0] };

  if (!rep.fullname) {
    rep.fullname = fallbackName || "Unknown";
  }
  if (!rep.profile_picture_url && fallbackAvatar) {
    rep.profile_picture_url = fallbackAvatar;
  }

  if (members.length === 1) {
    return { displayText: rep.fullname, representative: rep };
  }

  return { 
    displayText: `${rep.fullname} and ${members.length - 1} other${members.length > 2 ? 's' : ''}`, 
    representative: rep 
  };
}