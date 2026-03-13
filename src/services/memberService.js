import members from "../data/members.json";

const PAGE_SIZE = 100;

let SearchMembersData = [...members];

export const memberService = {
  getMembers: () => SearchMembersData,
  getPageSize: () => PAGE_SIZE,
  updateMember: (updatedMember) => {
    SearchMembersData = SearchMembersData.map((m) =>
      m.id === updatedMember.id ? { ...m, ...updatedMember } : m
    );
    return updatedMember;
  },
};
