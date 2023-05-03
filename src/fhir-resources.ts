import {ERR_NO_DICT_FOR_SYS_CODE} from "./errors";

export const FHIR_RESOURCES = {
    Parameters: "Parameters",
    Patient: "Patient",
    Condition: "Condition",
    Observation: "Observation",
    MedicationAdministration: "MedicationAdministration",
    MedicationRequest: "MedicationRequest",
    Procedure: "Procedure",
}

//Under http://hl7.org/fhir/us/mcode/StructureDefinition/ the following profiles defined.
export const META_PROFILE_CONDITION = "mcode-primary-cancer-condition";
export const META_PROFILE_BIO_MARKERS = "mcode-tumor-marker";
export const META_PROFILE_ECOG = "mcode-ecog-performance-status";
export const META_PROFILE_KARNOFSKY = "mcode-karnofsky-performance-status";
export const META_PROFILE_SECONDARY_CONDITION = "mcode-secondary-cancer-condition"; //Used for Metastasis
export const META_PROFILE_MEDICATION_ADMINISTRATION = "mcode-cancer-related-medication-administration";
export const META_PROFILE_MEDICATION_REQUEST = "mcode-cancer-related-medication-statement";
export const META_PROFILE_HISTOLOGY_MORPHOLOGY = "mcode-histology-morphology-behavior";
export const META_PROFILE_GENOMIC_VARIANT = "mcode-genomic-variant";
export const META_PROFILE_STAGE_GROUP = "mcode-tnm-clinical-stage-group";
export const META_PROFILE_SURGICAL_PROCEDURE = "mcode-cancer-related-surgical-procedure";
export const META_PROFILE_RADIOTHERAPY = "mcode-cancer-related-radiation-procedure";


export const dictByFhirSystemMap = new Map<string, string>([
    ["http://snomed.info/sct", "2.16.840.1.113883.6.96"],
    ["http://loinc.org", "2.16.840.1.113883.6.1"],
    ["http://hl7.org/fhir/sid/icd-10-cm","icd-10-cm"],
    ["http://www.nlm.nih.gov/research/umls/rxnorm", "Rxnorm"],
    ["http://www.genenames.org", "Hugo"]
]);
export function getDictionaryBySystemCode(systemCode: string) {
    const medDict = dictByFhirSystemMap.get(systemCode);
    if (!medDict) {
        throw new Error(ERR_NO_DICT_FOR_SYS_CODE + systemCode);
    }
    return medDict;
}

export const LOINC_GENE_STUDIED_ID_HGNC = "48018-6"
