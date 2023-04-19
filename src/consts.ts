
export const cbStatusToResearchStudyStatusMap = new Map<string, string>([
    ["1", "active"],
    ["5", "approved"],
    ["16", "completed"],
    ["19", "withdrawn"],
    ["9", "in-review"],
    ["6", "temporarily-closed-to-accrual"],
]);

export const CB_SORT_FIELD = "distance";
export const CB_SORT_ORDER = "asc";

export const CB_CLINICAL_ITEM_SURGERY = "176";
export const CB_CLINICAL_ITEM_RADIATION = "169";

export const CB_API_FIRST_PAGE_NUMBER = 1;
export const CB_API_DEFAULT_PAGE_SIZE = 25;
export const CB_API_MAX_PAGE_SIZE = 50;

export const DIRECT_MATCH_SERVICE_PATH = "/v2.1/trials/directMatch"
export const ELIGIBILITY_LOOKUP_SERVICE_PATH = "/v2.1/lookups/eligibilityFields"

export const HTTP_STATUS_UNPROCESSABLE_ENTITY = 422;


