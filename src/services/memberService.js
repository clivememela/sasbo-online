import members from "../data/members.json";

const PAGE_SIZE = 100;

const SearchMembersData = members;

export const memberService = {
  getMembers: () => SearchMembersData,
  getPageSize: () => PAGE_SIZE,
};
