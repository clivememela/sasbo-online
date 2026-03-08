import banks from "../data/banks.json";

const PAGE_SIZE = 100;

const SearchBanksData = banks;

export const bankService = {
  getBanks: () => SearchBanksData,
  getPageSize: () => PAGE_SIZE
};
