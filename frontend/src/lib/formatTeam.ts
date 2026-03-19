import { UserSummary } from "./projectApi"

const DESIGNATION_RANK: Record<string, number> = {
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

export function getRepresentativeString(members: UserSummary[]): { 
  displayText: string; 
  representative: UserSummary | null 
} {
  if (!members || members.length === 0) {
    return { displayText: "Unknown Team", representative: null };
  }

  const sortedMembers = [...members].sort((a, b) => {
    const rankA = DESIGNATION_RANK[a.designation] ?? 99;
    const rankB = DESIGNATION_RANK[b.designation] ?? 99;

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    return a.fullname.localeCompare(b.fullname);
  });

  const rep = sortedMembers[0];

  if (members.length === 1) {
    return { displayText: rep.fullname, representative: rep };
  }

  return { 
    displayText: `${rep.fullname} and ${members.length - 1} others`, 
    representative: rep 
  };
}