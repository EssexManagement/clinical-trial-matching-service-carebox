import {Coding} from "fhir/r4";

export const PositiveCbMarkerStatus = "positive"
export const NegativeCbMarkerStatus = "negative"
export const HighCbMarkerStatus = "high"
export const LowCbMarkerStatus = "low"

export const bioMarkerQualifierToCbMarkerStatus = new Map<string, string>([
    ["http://loinc.org/LA6576-8",PositiveCbMarkerStatus], //{ code: "LA6576-8", system: "http://loinc.org"}
    ["http://loinc.org/LA6577-6",NegativeCbMarkerStatus], //{ code: "LA6577-6", system: "http://loinc.org"}
    ["http://snomed.info/sct/10828004",PositiveCbMarkerStatus], //{ code: "10828004", system: "http://snomed.info/sct"}
    ["http://snomed.info/sct/260385009",NegativeCbMarkerStatus], //{ code: "260385009", system: "http://snomed.info/sct"}
    ["http://loinc.org/LA9633-4",PositiveCbMarkerStatus], //Present: { code: "LA9633-4", system: "http://loinc.org"}
    ["http://loinc.org/LA9634-2",NegativeCbMarkerStatus], //Absent: { code: "LA9634-2", system: "http://loinc.org"}
    ["http://snomed.info/sct/52101004",PositiveCbMarkerStatus], //Present: { code: "52101004", system: "http://snomed.info/sct"}
    ["http://snomed.info/sct/2667000",NegativeCbMarkerStatus], //Absent: { code: "2667000", system: "http://snomed.info/sct"}
    ["http://snomed.info/sct/75540009",HighCbMarkerStatus],
    ["http://snomed.info/sct/62482003",LowCbMarkerStatus]
]);

export function getCbMarkerStatusByQualifierCodes(coding: Coding) {
    let status = bioMarkerQualifierToCbMarkerStatus.get(coding?.system + "/" + coding?.code);
    if(!status) {
        if (coding?.display?.includes("Negative") || coding?.display?.includes("Absent")) {
            status = NegativeCbMarkerStatus;
        }
        if (coding?.display?.includes("Positive") || coding?.display?.includes("Present")) {
            status = PositiveCbMarkerStatus;
        }
    }
    return status;
}