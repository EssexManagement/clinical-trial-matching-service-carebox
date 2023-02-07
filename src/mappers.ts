import {
    CbApiRequest,
    CbEligibilityFields,
    CbValueFields
} from "./models";
import {
    CB_SORT_FIELD,
    CB_SORT_ORDER,
} from "./consts";
import {
    MappingFunc
} from "./types";
import {
    dictByFhirSystemMap,
    FHIR_RESOURCES,
    LOINC_GENE_STUDIED_ID_HGNC,
    META_PROFILE_BIO_MARKERS,
    META_PROFILE_CONDITION,
    META_PROFILE_ECOG,
    META_PROFILE_GENOMIC_VARIANT,
    META_PROFILE_HISTOLOGY_MORPHOLOGY,
    META_PROFILE_KARNOFSKY,
    META_PROFILE_MEDICATION_ADMINISTRATION,
    META_PROFILE_MEDICATION_REQUEST,
    META_PROFILE_SECONDARY_CONDITION,
    META_PROFILE_STAGE_GROUP
} from "./fhir-resources";
import {zipCodeToLatLngMapping} from "./zip";
import {
    categoriesMap,
    CATEGORY_AGE,
    CATEGORY_BIO_MARKER,
    CATEGORY_DIAGNOSIS,
    CATEGORY_DRUGS, CATEGORY_ECOG,
    CATEGORY_METASTASISE
} from "./categories";
import {ECOG_DICT_NAME, ecogKarnofskyMap} from "./ecog";
import {phaseCodeMap} from "./phase";
import {fhirStageToCbMetsMap} from "./stage";
import {
    Bundle,
    Condition,
    FhirResource,
    MedicationAdministration,
    MedicationRequest,
    Observation,
    Parameters,
    Patient
} from "fhir/r4";
import {CbAPIQuery} from "./query";


export function generateApiQuery(filterByCountry: string, pageSize: number) : CbApiRequest{

    const apiRequest = new CbAPIQuery();

    apiRequest.pageSize = pageSize;
    apiRequest.fields = ["trialId", "nctId","fullTitle","shortTitle","status", "phase","sites", "overallContacts"];
    apiRequest.sort = [{
        field: CB_SORT_FIELD,
        order: CB_SORT_ORDER
    }];
    let defaultCountries = [];
    if (filterByCountry) {
        defaultCountries.push(filterByCountry);
    }
    apiRequest.filter = {condition: null, countries: defaultCountries};

    return apiRequest;
}

export function convertFhirBundleToApiRequest(patientBundle: Bundle, apiRequest: CbApiRequest){
    const mappingFuncMap = new Array<MappingFunc>(mapAge, mapPhase, mapCondition, mapSubTypes, mapBiMarkers, mapECOG, mapDrugs, mapMetastasis, mapDistance, mapStage);
    const fhirResourceMap = new Map<string, FhirResource[]>();

    if(apiRequest == undefined) {
        throw new Error("No API Request object exists to fill");
    }

    patientBundle.entry.forEach(bundleEntry => {
        let resource = bundleEntry.resource;
        if(resource) {
            if(!fhirResourceMap.has(bundleEntry.resource.resourceType)){
                fhirResourceMap.set(bundleEntry.resource.resourceType,[bundleEntry.resource]);
            }
            else {
                fhirResourceMap.get(bundleEntry.resource.resourceType).push(bundleEntry.resource);
            }
        }
    })

    mappingFuncMap.forEach(function(mappingFunction) {
        mappingFunction(fhirResourceMap, apiRequest);
    })

}

export function mapDistance(fhirResources: Map<string, FhirResource[]>, apiRequest: CbApiRequest) {
    const paramResources = fhirResources.get(FHIR_RESOURCES.Parameters);
    if(paramResources && paramResources.length > 0) {
        const paramResource = paramResources[0] as Parameters;
        const zipParam = paramResource.parameter.find(parameter => parameter.name === "zipCode");
        const radiusParam = paramResource.parameter.find(parameter => parameter.name === "travelRadius");

        if(zipParam) {
            const cbLatLong = zipCodeToLatLngMapping.get(zipParam.valueString);
            const latValue = parseFloat(cbLatLong.lat);
            const longValue = parseFloat(cbLatLong.lng);
            apiRequest.filter.distance = {
                distance: parseFloat(radiusParam.valueString),
                distanceUnit: "mi",
                from: {
                    lat: latValue,
                    lon: longValue
                }
            };
            //Set same value under origin field
            apiRequest.origin = {
                from: {
                    lat: latValue,
                    lon: longValue
                }
            };
        }
        else {
            console.error("FHIR Bundle: Found Parameters Resource: Missing zipCode field");
        }
    }
    else {
        console.log("FHIR Bundle: missing Parameters resource. Can't extract zipCode and travelRadius filters.");
    }
}

function mapAge(fhirResources: Map<string, FhirResource[]>, apiRequest: CbApiRequest) {
    const patientResources = fhirResources.get(FHIR_RESOURCES.Patient);
    if(patientResources && patientResources.length > 0) {
        const patientResource = patientResources[0] as Patient;
        const patientBirthDate = patientResource.birthDate; //Received in format "YYYY-MM-DD" or "YYYY"

        if(!patientBirthDate) {
            console.error("FHIR Bundle: Found Patient Resource: Missing birthDate field");
            return;
        }
        const splitDate = patientBirthDate.split("-");

        //Convert to format "MMDDYYYY"
        let birthDate: string;
        if(splitDate.length <= 1) {
            birthDate = "0101" + splitDate[0];
        }
        else {
            birthDate = splitDate[2] + splitDate[1] + splitDate[0];
        }
        const categoryData = categoriesMap.get(CATEGORY_AGE);
        let eItem: CbEligibilityFields = {
            fieldId: categoryData.id,
            mode: categoryData.mode,
            value: birthDate,
        };
        (apiRequest.filter.eligibility == undefined) ?
            apiRequest.filter.eligibility = [eItem] : apiRequest.filter.eligibility.push(eItem);
    }
    else {
        console.log("FHIR Bundle: missing Patient resource. Can't extract Age filter.");
    }
}

function mapPhase(fhirResources: Map<string, FhirResource[]>, apiRequest: CbApiRequest) {

    const paramResources = fhirResources.get(FHIR_RESOURCES.Parameters);
    if(paramResources) {
        paramResources.forEach(paramResource => {
            const phasesParams = (paramResource as Parameters).parameter.filter(parameter => parameter.name === "phase");
            for (const parameter of phasesParams) {
                const cbPhaseCode = phaseCodeMap.get(parameter.valueString);
                if (cbPhaseCode == undefined) {
                    throw new Error("Invalid value of phase");
                }
                if (apiRequest.filter.phases == undefined) {
                    apiRequest.filter.phases = [];
                }
                apiRequest.filter.phases.push(cbPhaseCode);
            }
        });
    }
    else {
        console.log("FHIR Bundle: missing Parameters resource. Can't extract phase filter");
    }
}


function mapCondition(fhirResources: Map<string, FhirResource[]>, apiRequest: CbApiRequest) {

    const condResources = fhirResources.get(FHIR_RESOURCES.Condition);
    if(condResources) {

        const condResource = condResources.find(condResource => {
            return (condResource.meta && condResource.meta.profile && condResource.meta.profile.findIndex(elem => elem.includes(META_PROFILE_CONDITION)) != -1);
        }) as Condition;

        if(condResource) {
            for (const coding of condResource.code.coding) {
                const medDict = dictByFhirSystemMap.get(coding.system);
                if (medDict == undefined) {
                    throw new Error(`Cannot find dictionary mapping for system code ${coding.system}`);
                }
                apiRequest.filter.condition = {
                    valueId: coding.code,
                    valueSetId: dictByFhirSystemMap.get(coding.system),

                };
            }
        }
        else {
            console.error("FHIR Bundle: Found Condition Resource: Missing Condition with meta.Profile field: " + META_PROFILE_CONDITION);
        }
    }
    else {
        console.error("FHIR Bundle: missing Condition resource. Can't extract Condition filter.");
    }
}

function mapSubTypes(fhirResources: Map<string, FhirResource[]>, apiRequest: CbApiRequest) {

    const condResources = fhirResources.get(FHIR_RESOURCES.Condition);
    if(condResources) {
        const subTypeResource = condResources.find(condResource => {
            return (condResource.meta && condResource.meta.profile && condResource.meta.profile.findIndex(elem => elem.includes(META_PROFILE_CONDITION)) != -1);
        }) as Condition;

        if(subTypeResource && subTypeResource.extension) {
            const categoryData = categoriesMap.get(CATEGORY_DIAGNOSIS);
            let subTypeItem: CbEligibilityFields = {
                fieldId: categoryData.id,
                mode: categoryData.mode,
                values: []
            };
            for (const extn of subTypeResource.extension) {
                if(extn.url && extn.url.includes(META_PROFILE_HISTOLOGY_MORPHOLOGY))
                {
                    for (const coding of extn.valueCodeableConcept.coding) {
                        const medDict = dictByFhirSystemMap.get(coding.system);
                        if (medDict == undefined) {
                            throw new Error(`Cannot find dictionary mapping for system code ${coding.system}`);
                        }
                        let subValue: CbValueFields = {
                            valueId: coding.code,
                            valueSetId: medDict
                        };
                        subTypeItem.values.push(subValue);

                    }
                }
            }
            if (apiRequest.filter.eligibility == undefined) {
                apiRequest.filter.eligibility = [subTypeItem];
            }
            else {
                apiRequest.filter.eligibility.push(subTypeItem);
            }
        }
        else {
            console.warn("FHIR Bundle: Found Condition Resource: Missing Condition with meta.Profile field: " + META_PROFILE_CONDITION + "or extension field with Sub Type.");
        }
    }
    else {
        console.log("FHIR Bundle: missing Condition resource. Can't extract Sub Type filter.");
    }
}

function mapBiMarkers(fhirResources: Map<string, FhirResource[]>, apiRequest: CbApiRequest) {

    const obsResources = fhirResources.get(FHIR_RESOURCES.Observation);
    if(obsResources && obsResources.length > 0) {
        if (apiRequest.filter.eligibility == undefined) {
            apiRequest.filter.eligibility = [];
        }
        const categoryData = categoriesMap.get(CATEGORY_BIO_MARKER);
        let markerItem: CbEligibilityFields = {
            fieldId: categoryData.id,
            mode: categoryData.mode,
            values: []
        };

        const markersResources = obsResources.filter(resource => {
            const obsResource = resource as Observation;
            const hasMCodeProfile = (obsResource.meta && obsResource.meta.profile && obsResource.meta.profile.findIndex(elem => elem.includes(META_PROFILE_BIO_MARKERS)) != -1);
            if(!hasMCodeProfile) {
                return;
            }
            //Add marker to request only if found positive at the patient
            let isPositive = true;

            if (obsResource.valueCodeableConcept && obsResource.valueCodeableConcept.coding && obsResource.valueCodeableConcept.coding.length > 0) {
                const vCoding = obsResource.valueCodeableConcept.coding[0];
                isPositive = vCoding.display ? vCoding.display.indexOf("Positive") != -1 : false;
            }

            return hasMCodeProfile && isPositive;
        });

        if(markersResources && markersResources.length > 0) {
            markersResources.forEach(res => {
                const codeData = res as Observation;
                if (codeData.code && codeData.code.coding) {
                    for (const coding of codeData.code.coding) {
                        const medDict = dictByFhirSystemMap.get(coding.system);
                        if (medDict == undefined) {
                            throw new Error(`Cannot find dictionary mapping for system code ${coding.system}`);
                        }
                        let obsValue: CbValueFields = {
                            valueId: coding.code,
                            valueSetId: medDict
                        };
                        markerItem.values.push(obsValue);
                    }
                }
            });
        }
        else {
            console.warn("FHIR Bundle: Found Observation Resource: Missing Observation with meta.Profile field: " + META_PROFILE_BIO_MARKERS);
        }

        const genomicProfiles = obsResources.filter(resource => {
            const obsResource = resource as Observation;
            const hasMCodeProfile = (obsResource.meta && obsResource.meta.profile && obsResource.meta.profile.findIndex(elem => elem.includes(META_PROFILE_GENOMIC_VARIANT)) != -1);
            if(!hasMCodeProfile) {
                return;
            }
            //Add marker to request only if found positive at the patient
            let isPositive = true;
            if (obsResource.valueCodeableConcept && obsResource.valueCodeableConcept.coding && obsResource.valueCodeableConcept.coding.length > 0) {
                const vCoding = obsResource.valueCodeableConcept.coding[0];
                isPositive = vCoding.display ? vCoding.display.indexOf("Present") != -1 : false;
            }

            return hasMCodeProfile && isPositive;
        });

        if(genomicProfiles && genomicProfiles.length > 0) {
            genomicProfiles.forEach(genResource => {
                const geneData = genResource as Observation;
                if (geneData.component) {
                    for (const component of geneData.component) {
                        if (component.code && component.code.coding.length > 0 && component.code.coding[0].code === LOINC_GENE_STUDIED_ID_HGNC) {
                            const geneDetails = component.valueCodeableConcept;
                            if (geneDetails && geneDetails.coding.length > 0) {

                                const medDict = dictByFhirSystemMap.get(geneDetails.coding[0].system);
                                if (medDict == undefined) {
                                    throw new Error(`Cannot find dictionary mapping for system code ${geneDetails.coding[0].system}`);
                                }
                                let obsValue: CbValueFields = {
                                    valueId: geneDetails.coding[0].code,
                                    valueSetId: medDict
                                };
                                markerItem.values.push(obsValue);
                            }
                        }

                    }
                }
            });
        }
        else {
            console.warn("FHIR Bundle: Found Observation Resource: Missing Observation with meta.Profile field: " + META_PROFILE_GENOMIC_VARIANT);
        }

        if(markerItem.values.length > 0) {
            apiRequest.filter.eligibility.push(markerItem);
        }
    }
    else {
        console.log("FHIR Bundle: missing Observation resource. Can't extract Bio Markers filter.");
    }
}

function mapECOG(fhirResources: Map<string, FhirResource[]>, apiRequest: CbApiRequest) {

    const obsResources = fhirResources.get(FHIR_RESOURCES.Observation);
    if(obsResources && obsResources.length > 0) {

        const categoryData = categoriesMap.get(CATEGORY_ECOG);
        let ecogItem: CbEligibilityFields = {
            fieldId: categoryData.id,
            mode: categoryData.mode,
            values: []
        };

        const ecogProfiles = obsResources.filter(resource => {
            return (resource.meta && resource.meta.profile && resource.meta.profile.findIndex(elem => elem.includes(META_PROFILE_ECOG)) != -1);
        });

        const krnfProfiles = obsResources.filter(resource => {
            return (resource.meta && resource.meta.profile && resource.meta.profile.findIndex(elem => elem.includes(META_PROFILE_KARNOFSKY)) != -1);
        });

        if(ecogProfiles && ecogProfiles.length > 0) {
            ecogProfiles.forEach(res => {
                const ecogCode = ecogKarnofskyMap.get((res as Observation).valueInteger);
                let ecogValue: CbValueFields = {
                    valueId: ecogCode.code,
                    valueSetId: ECOG_DICT_NAME
                };
                ecogItem.values.push(ecogValue);

            });
        }
        else {
            console.warn("FHIR Bundle: Found Observation Resource: Missing Observation with meta.Profile field: " + META_PROFILE_ECOG);
        }

        if(krnfProfiles && krnfProfiles.length > 0) {
            const karnofskyCodesList = [...ecogKarnofskyMap.values()];
            krnfProfiles.forEach(res => {
                const krnfData = res as Observation;
                const ecogCode = karnofskyCodesList.find(karn => {
                    return karn.minValue <= krnfData.valueInteger && karn.maxValue >= krnfData.valueInteger;
                });
                if(ecogCode) {
                    let ecogValue: CbValueFields = {
                        valueId: ecogCode.code,
                        valueSetId: ECOG_DICT_NAME
                    };
                    ecogItem.values.push(ecogValue);
                }
                else {
                    throw new Error(`karnofsky value ${krnfData.valueInteger} on bundle is not defined in range mapping`);
                }
            });
        }
        else {
            console.warn("FHIR Bundle: Found Observation Resource: Missing Observation with meta.Profile field: " + META_PROFILE_KARNOFSKY);
        }

        if(ecogItem.values.length > 0) {
            apiRequest.filter.eligibility.push(ecogItem);
        }
    }
    else {
        console.log("FHIR Bundle: missing Observation resource. Can't extract ECOG filter.");
    }
}

function mapDrugs(fhirResources: Map<string, FhirResource[]>, apiRequest: CbApiRequest) {

    const medAdminResources = fhirResources.get(FHIR_RESOURCES.MedicationAdministration);
    const categoryData = categoriesMap.get(CATEGORY_DRUGS);
    let drugItem: CbEligibilityFields = {
        fieldId: categoryData.id,
        mode: categoryData.mode,
        values: []
    };

    if(medAdminResources) {
        const medAdminResource = medAdminResources.find(medResource => {
            return (medResource.meta && medResource.meta.profile && medResource.meta.profile.findIndex(elem => elem.includes(META_PROFILE_MEDICATION_ADMINISTRATION)) != -1);
        })  as MedicationAdministration;

        if(medAdminResource) {
            for (const coding of medAdminResource.medicationCodeableConcept.coding) {
                let drugValue: CbValueFields = {
                    valueId: coding.code,
                    valueSetId: dictByFhirSystemMap.get(coding.system)
                };
                drugItem.values.push(drugValue);
            }
        }
        else {
            console.warn("FHIR Bundle: Found MedicationAdministration Resource: Missing MedicationAdministration with meta.Profile field: " + META_PROFILE_MEDICATION_ADMINISTRATION);
        }

    }
    else {
        console.log("FHIR Bundle: missing MedicationAdministration resource.");
    }

    const medResources = fhirResources.get(FHIR_RESOURCES.MedicationRequest);
    if(medResources) {

        const medReqResource = medResources.find(medResource => {
            return (medResource.meta && medResource.meta.profile && medResource.meta.profile.findIndex(elem => elem.includes(META_PROFILE_MEDICATION_REQUEST)) != -1);
        })  as MedicationRequest;

        if(medReqResource) {
            for (const coding of medReqResource.medicationCodeableConcept.coding) {
                let drugValue: CbValueFields = {
                    valueId: coding.code,
                    valueSetId: dictByFhirSystemMap.get(coding.system)
                };
                drugItem.values.push(drugValue);
            }
        }
        else {
            console.warn("FHIR Bundle: Found MedicationRequest Resource: Missing MedicationRequest with meta.Profile field: " + META_PROFILE_MEDICATION_REQUEST);
        }
    }
    else {
        console.log("FHIR Bundle: missing MedicationRequest resource.");
    }

    if(drugItem.values.length > 0) {
        apiRequest.filter.eligibility.push(drugItem);
    }
}

function mapMetastasis(fhirResources: Map<string, FhirResource[]>, apiRequest: CbApiRequest) {

    const condResources = fhirResources.get(FHIR_RESOURCES.Condition);
    if(condResources) {

        const condResource = condResources.find(resource => {
            return (resource.meta && resource.meta.profile && resource.meta.profile.findIndex(elem => elem.includes(META_PROFILE_SECONDARY_CONDITION)) != -1);
        })  as Condition;

        if(condResource) {
            const categoryData = categoriesMap.get(CATEGORY_METASTASISE);
            let metasItem: CbEligibilityFields = {
                fieldId: categoryData.id,
                mode: categoryData.mode,
                values: []
            };
            for (const coding of condResource.code.coding) {
                let metasValue: CbValueFields = {
                    valueId: coding.code,
                    valueSetId: dictByFhirSystemMap.get(coding.system)
                };
                metasItem.values.push(metasValue);
            }
            if(metasItem.values.length > 0) {
                apiRequest.filter.eligibility.push(metasItem);
            }
        }
        else {
            console.warn("FHIR Bundle: Found Condition Resource: Missing Condition with meta.Profile field: " + META_PROFILE_SECONDARY_CONDITION);
        }
    }
    else {
        console.log("FHIR Bundle: missing Condition resource. Can't extract Metastasise filter");
    }
}

function mapStage(fhirResources: Map<string, FhirResource[]>, apiRequest: CbApiRequest) {

    const obsResources = fhirResources.get(FHIR_RESOURCES.Observation);
    if(obsResources) {

        const stageResource = obsResources.find(obsResource => {
            return (obsResource.meta && obsResource.meta.profile && obsResource.meta.profile.findIndex(elem => elem.includes(META_PROFILE_STAGE_GROUP)) != -1);
        }) as Observation;

        if(stageResource) {
            const categoryData = categoriesMap.get(CATEGORY_METASTASISE);
            let metasItem: CbEligibilityFields = {
                fieldId: categoryData.id,
                mode: categoryData.mode,
                values: []
            };
            for (const coding of stageResource.valueCodeableConcept.coding) {
                let mets = fhirStageToCbMetsMap.get(coding.code)
                if(mets != undefined) {
                    for (const met of mets) {
                        let metasValue: CbValueFields = {
                            valueId: met,
                        };
                        metasItem.values.push(metasValue);
                    }
                } else {
                    console.warn("FHIR Bundle: Stage Observation Resource: Unknown stage code for mapping: " + coding.code);
                }
            }
            if(metasItem.values.length > 0) {
                apiRequest.filter.eligibility.push(metasItem);
            }
        }
        else {
            console.warn("FHIR Bundle: Found Observation Resource: Missing Observation with meta.Profile field: " + META_PROFILE_STAGE_GROUP);
        }
    }
    else {
        console.log("FHIR Bundle: missing Observation resource. Can't extract Stage filter");
    }
}



