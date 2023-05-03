import {CbCategory} from "./models";

export const categoriesMap = new Map<string, CbCategory>([
    ["Measurable disease", { id: "1", mode: ""}],
    ["Severity", { id: "2", mode: ""}],
    ["Surgical Procedures", { id: "3", mode: ""}],
    ["Outcome", { id: "4", mode: ""}],
    ["Prior modalities", { id: "5", mode: ""}],
    ["Age", { id: "6", mode: ""}],
    ["Biomarkers", { id: "7", mode: ""}],
    ["Prior clinical trial", { id: "8", mode: ""}],
    ["Anatomic Cancer Location", { id: "9", mode: ""}],
    ["Comorbidity",{ id: "10", mode: ""}],
    ["Diagnostic Details", { id: "11", mode: ""}],
    ["Diagnostic Tests", { id: "12", mode: ""}],
    ["Drugs", { id: "13", mode: ""}],
    ["ECOG Performance status", { id: "14", mode: ""}],
    ["Gender", { id: "15", mode: ""}],
    ["Family history", { id: "16", mode: ""}],
    ["Metastasise", { id: "17", mode: ""}],
    ["Unresectable", { id: "18", mode: ""}],
    ["Diagnosis", { id: "19", mode: ""}]
]);

//Categories Constants   (In future version may refactor to map of {profileUrl: CategoryName} as part of other new features)
export const CATEGORY_AGE = "Age";
export const CATEGORY_BIO_MARKER = "Biomarkers";
export const CATEGORY_ECOG = "ECOG Performance status";
export const CATEGORY_DRUGS = "Drugs";
export const CATEGORY_DIAGNOSIS = "Diagnosis";
export const CATEGORY_METASTASISE = "Metastasise"; //Name typing is defined to fit to same name typing on Carebox' DB
export const CATEGORY_PRIOR_MODALITIES = "Prior modalities";