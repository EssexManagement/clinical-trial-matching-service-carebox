import {
    CbApiRequest,
    CbEligibilityFields,
    CbValueFields
} from "./models";
import {
    CB_CLINICAL_ITEM_RADIATION,
    CB_CLINICAL_ITEM_SURGERY,
    CB_SORT_FIELD,
    CB_SORT_ORDER,
} from "./consts";
import {
    MappingFunc
} from "./types";
import {
    getDictionaryBySystemCode,
    FHIR_RESOURCES,
    LOINC_GENE_STUDIED_ID_HGNC,
    META_PROFILE_BIO_MARKERS,
    META_PROFILE_CONDITION,
    META_PROFILE_ECOG,
    META_PROFILE_GENOMIC_VARIANT,
    META_PROFILE_HISTOLOGY_MORPHOLOGY,
    META_PROFILE_KARNOFSKY,
    META_PROFILE_MEDICATION_STATEMENT,
    META_PROFILE_SECONDARY_CONDITION,
    META_PROFILE_STAGE_GROUP,
    META_PROFILE_SURGICAL_PROCEDURE,
    META_PROFILE_RADIOTHERAPY
} from "./fhir-resources";
import {
    categoriesMap,
    CATEGORY_AGE,
    CATEGORY_BIO_MARKER,
    CATEGORY_DIAGNOSIS,
    CATEGORY_DRUGS, CATEGORY_ECOG,
    CATEGORY_METASTASISE,
    CATEGORY_PRIOR_MODALITIES
} from "./categories";
import {ECOG_DICT_NAME, ecogKarnofskyMap} from "./ecog";
import {phaseCodeMap} from "./phase";
import {fhirStageToCbMetsMap, snomedCodeToFhirStageMap} from "./stage";
import {
    Bundle,
    Condition,
    FhirResource,
    MedicationStatement,
    Observation,
    Parameters,
    Patient,
    Procedure
} from "fhir/r4";
import {APIError, CbAPIQuery} from "./query";
import {
    ERR_INVALID_PHASE,
    ERR_NO_API_REQ_EXISTS,
    ERR_NOT_VALID_KARNOFSKY_VAL
} from "./errors";
import {getCbMarkerStatusByQualifierCodes} from "./bioMarker";
import data from 'us-zips';


export function convertZip(zipCode: string): number[] {
    const point = data[zipCode] || null;
  
    return point == null ? [null, null] : [point['latitude'], point['longitude']];
}

export function generateApiQuery(filterByCountry: string, pageSize: number) : CbApiRequest{

    const apiRequest = new CbAPIQuery();

    apiRequest.pageSize = pageSize;
    apiRequest.fields = ["trialId", "nctId","fullTitle","shortTitle","status", "phase","sites", "overallContacts"];
    apiRequest.sort = [{
        field: CB_SORT_FIELD,
        order: CB_SORT_ORDER
    }];
    const defaultCountries = [];
    if (filterByCountry) {
        defaultCountries.push(filterByCountry);
    }
    apiRequest.filter = {condition: null, countries: defaultCountries};

    return apiRequest;
}

export function convertFhirBundleToApiRequest(patientBundle: Bundle, apiRequest: CbApiRequest){
    const mappingFuncMap = new Array<MappingFunc>(mapAge, mapPhase, mapCondition, mapSubTypes, mapBioMarkers, mapECOG, mapDrugs, mapMetastasis, mapDistance, mapStage, mapProcedure);
    const fhirResourceMap = new Map<string, FhirResource[]>();

    if(!apiRequest) {
        throw new Error(ERR_NO_API_REQ_EXISTS);
    }

    patientBundle.entry.forEach(bundleEntry => {
        const resource = bundleEntry.resource;
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
            const latLng = convertZip(zipParam.valueString);
            if (latLng[0] == null) {
                throw new APIError(
                    "Invalid zip code -- could not be processed into latitude and longitude",
                    400,
                    "Invalid zip code -- could not be processed into latitude and longitude"
                );
            }

            apiRequest.filter.distance = {
                distance: parseFloat(radiusParam.valueString),
                distanceUnit: "mi",
                from: {
                    lat: latLng[0],
                    lon: latLng[1]
                }
            };
            //Set same value under origin field
            apiRequest.origin = {
                from: {
                    lat: latLng[0],
                    lon: latLng[1]
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
        const eItem: CbEligibilityFields = {
            fieldId: categoryData.id,
            mode: categoryData.mode,
            value: birthDate,
        };
        (!apiRequest.filter.eligibility) ?
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
                if (parameter.valueString && parameter.valueString.length > 0) {
                    const cbPhaseCode = phaseCodeMap.get(parameter.valueString);
                    if (!cbPhaseCode) {
                        throw new Error(ERR_INVALID_PHASE);
                    }
                    if (!apiRequest.filter.phases) {
                        apiRequest.filter.phases = [];
                    }
                    apiRequest.filter.phases.push(cbPhaseCode);
                }
            }
        });
    }
}

function mapCondition(fhirResources: Map<string, FhirResource[]>, apiRequest: CbApiRequest) {

    const condResources = fhirResources.get(FHIR_RESOURCES.Condition);
    if(condResources) {
        const condResource = condResources.find(condResource => {
            return condResource.meta?.profile?.some(elem => elem.includes(META_PROFILE_CONDITION));
        }) as Condition;

        if(condResource) {
            for (const coding of condResource.code.coding) {
                apiRequest.filter.condition = {
                    valueSetId: getDictionaryBySystemCode(coding.system),
                    valueId: coding.code
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
            return condResource?.meta?.profile?.some(elem => elem.includes(META_PROFILE_CONDITION));
        }) as Condition;

        if(subTypeResource?.extension?.length > 0) {
            const categoryData = categoriesMap.get(CATEGORY_DIAGNOSIS);
            const subTypeItem: CbEligibilityFields = {
                fieldId: categoryData.id,
                mode: categoryData.mode,
                values: []
            };

            const sub = subTypeResource.extension.find(extn => {
                return extn.url?.includes(META_PROFILE_HISTOLOGY_MORPHOLOGY);
            });
            const coding = sub?.valueCodeableConcept?.coding;
            if(coding?.length > 0) {
                const codeObj = coding[0];
                const subValue: CbValueFields = {
                    valueSetId: getDictionaryBySystemCode(codeObj.system),
                    valueId: codeObj.code
                };
                subTypeItem.values.push(subValue);
            }

            if (!apiRequest.filter.eligibility) {
                apiRequest.filter.eligibility = [subTypeItem];
            }
            else {
                apiRequest.filter.eligibility.push(subTypeItem);
            }
        }
        else {
            console.log("FHIR Bundle: Found Condition Resource: Missing Condition with meta.Profile field: " + META_PROFILE_CONDITION + "or extension field with Sub Type.");
        }
    }
    else {
        console.log("FHIR Bundle: missing Condition resource. Can't extract Sub Type filter.");
    }
}

function mapBioMarkers(fhirResources: Map<string, FhirResource[]>, apiRequest: CbApiRequest) {

    const obsResources = fhirResources.get(FHIR_RESOURCES.Observation);
    if(obsResources) {
        if (!apiRequest.filter.eligibility) {
            apiRequest.filter.eligibility = [];
        }
        const categoryData = categoriesMap.get(CATEGORY_BIO_MARKER);
        const markerItem: CbEligibilityFields = {
            fieldId: categoryData.id,
            mode: categoryData.mode,
            values: []
        };

        //For API mapping, get all obs resources that contains Bio Marker profile fields and that the qualifier is positive for the marker
        //(Reduce may not fit here as we need each found resource, to map its code to our payload)
        const markersResources = obsResources.filter(resource => {
            const obsResource = resource as Observation;
            return obsResource?.meta?.profile?.some(elem => elem.includes(META_PROFILE_BIO_MARKERS));
        });

        if(markersResources?.length > 0) {
            markersResources.forEach(res => {
                const codeData = res as Observation;
                //Add status indication (if found positive at the patient)
                let mStatus = getCbMarkerStatusByQualifierCodes(codeData.interpretation?.[0].coding?.[0]);
                if(!mStatus) {
                    mStatus = getCbMarkerStatusByQualifierCodes(codeData.valueCodeableConcept?.coding?.[0]);
                }
                if (codeData.code && codeData.code.coding) {
                    for (const coding of codeData.code.coding) {
                        const obsValue: CbValueFields = {
                            valueSetId: getDictionaryBySystemCode(coding.system),
                            valueId: coding.code
                        };
                        if(mStatus) {
                            obsValue.status = mStatus;
                        }
                        markerItem.values.push(obsValue);
                    }
                }
            });
        }
        else {
            console.log("FHIR Bundle: Found Observation Resource: Missing Observation with meta.Profile field: " + META_PROFILE_BIO_MARKERS);
        }

        const genomicProfiles = obsResources.filter(resource => {
            const obsResource = resource as Observation;
            return obsResource?.meta?.profile?.some(elem => elem.includes(META_PROFILE_GENOMIC_VARIANT));
        });

        if(genomicProfiles?.length > 0) {
            genomicProfiles.forEach(genResource => {
                const geneData = genResource as Observation;
                //Add status indication (if found positive at the patient)
                //interpretation contains positive / negative qualifier.
                //valueCodeableConcept contains Present / Absent
                let mStatus = getCbMarkerStatusByQualifierCodes(geneData.interpretation?.[0].coding?.[0]);
                if(!mStatus) {
                    mStatus = getCbMarkerStatusByQualifierCodes(geneData.valueCodeableConcept?.coding?.[0]);
                }
                if (geneData?.component) {
                    for (const component of geneData.component) {
                        if (component.code?.coding[0]?.code === LOINC_GENE_STUDIED_ID_HGNC) {
                            const geneDetails = component.valueCodeableConcept?.coding[0];
                            if (geneDetails) {
                                const obsValue: CbValueFields = {
                                    valueSetId: getDictionaryBySystemCode(geneDetails.system),
                                    valueId: geneDetails.code
                                };
                                if(mStatus) {
                                    obsValue.status = mStatus
                                }
                                markerItem.values.push(obsValue);
                            }
                        }
                    }
                }
            });
        }
        else {
            console.log("FHIR Bundle: Found Observation Resource: Missing Observation with meta.Profile field: " + META_PROFILE_GENOMIC_VARIANT);
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
    if(obsResources) {
        const categoryData = categoriesMap.get(CATEGORY_ECOG);
        const ecogItem: CbEligibilityFields = {
            fieldId: categoryData.id,
            mode: categoryData.mode,
            values: []
        };

        const ecogProfile = obsResources.find(resource => {
            return resource.meta?.profile?.some(elem => elem.includes(META_PROFILE_ECOG));
        }) as Observation;

        const krnfProfile = obsResources.find(resource => {
            return resource.meta?.profile?.some(elem => elem.includes(META_PROFILE_KARNOFSKY));
        }) as Observation;

        if(ecogProfile) {
            const ecogCode = ecogKarnofskyMap.get(ecogProfile.valueInteger);
            const ecogValue: CbValueFields = {
                valueId: ecogCode.code,
                valueSetId: ECOG_DICT_NAME
            };
            ecogItem.values.push(ecogValue);
        }
        else {
            console.log("FHIR Bundle: Found Observation Resource: Missing Observation with meta.Profile field: " + META_PROFILE_ECOG);
        }

        if(krnfProfile) {
            const karnofskyCodesList = [...ecogKarnofskyMap.values()];
            const ecogCode = karnofskyCodesList.find(karn => {
                return karn.minValue <= krnfProfile.valueInteger && karn.maxValue >= krnfProfile.valueInteger;
            });
            if(ecogCode) {
                const ecogValue: CbValueFields = {
                    valueId: ecogCode.code,
                    valueSetId: ECOG_DICT_NAME
                };
                ecogItem.values.push(ecogValue);
            }
            else {
                throw new Error(`${krnfProfile.valueInteger}` + ERR_NOT_VALID_KARNOFSKY_VAL);
            }
        }
        else {
            console.log("FHIR Bundle: Found Observation Resource: Missing Observation with meta.Profile field: " + META_PROFILE_KARNOFSKY);
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

    const medStatementResources = fhirResources.get(FHIR_RESOURCES.MedicationStatement);
    const categoryData = categoriesMap.get(CATEGORY_DRUGS);
    const drugItem: CbEligibilityFields = {
        fieldId: categoryData.id,
        mode: categoryData.mode,
        values: []
    };

    if(medStatementResources) {
        const medStatementProfiles = medStatementResources.filter(resource => {
            return resource.meta?.profile?.some(elem => elem.includes(META_PROFILE_MEDICATION_STATEMENT));
        });

        if(medStatementProfiles?.length > 0) {
            medStatementProfiles.forEach(res => {
                for (const coding of (res as MedicationStatement).medicationCodeableConcept.coding) {
                    const drugValue: CbValueFields = {
                        valueSetId: getDictionaryBySystemCode(coding.system),
                        valueId: coding.code
                    };
                    drugItem.values.push(drugValue);
                }
            });
        }
        else {
            console.warn("FHIR Bundle: Found MedicationStatement Resource: Missing MedicationStatement with meta.Profile field: " + META_PROFILE_MEDICATION_STATEMENT);
        }

    }
    else {
        console.log("FHIR Bundle: missing MedicationStatement resource.");
    }

    if(drugItem.values.length > 0) {
        apiRequest.filter.eligibility.push(drugItem);
    }
}

function mapMetastasis(fhirResources: Map<string, FhirResource[]>, apiRequest: CbApiRequest) {

    const condResources = fhirResources.get(FHIR_RESOURCES.Condition);
    if(condResources) {
        const condResource = condResources.find(resource => {
            return resource.meta?.profile?.some(elem => elem.includes(META_PROFILE_SECONDARY_CONDITION));
        })  as Condition;

        if(condResource) {
            const categoryData = categoriesMap.get(CATEGORY_METASTASISE);
            const metasItem: CbEligibilityFields = {
                fieldId: categoryData.id,
                mode: categoryData.mode,
                values: []
            };
            for (const coding of condResource.code.coding) {
                const metasValue: CbValueFields = {
                    valueSetId: getDictionaryBySystemCode(coding.system),
                    valueId: coding.code
                };
                metasItem.values.push(metasValue);
            }
            if(metasItem.values.length > 0) {
                apiRequest.filter.eligibility.push(metasItem);
            }
        }
        else {
            console.log("FHIR Bundle: Found Condition Resource: Missing Condition with meta.Profile field: " + META_PROFILE_SECONDARY_CONDITION);
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
            return obsResource.meta?.profile?.some(elem => elem.includes(META_PROFILE_STAGE_GROUP));
        }) as Observation;

        if(stageResource) {
            const categoryData = categoriesMap.get(CATEGORY_METASTASISE);
            const metasItem: CbEligibilityFields = {
                fieldId: categoryData.id,
                mode: categoryData.mode,
                values: []
            };
            for (const coding of stageResource.valueCodeableConcept.coding) {
                let mets = fhirStageToCbMetsMap.get(coding.code)
                const stage = snomedCodeToFhirStageMap.get(coding.code)
                if(stage && !mets) {
                  mets = fhirStageToCbMetsMap.get(stage);
                }
                if(mets) {
                    for (const met of mets) {
                        const metasValue: CbValueFields = {
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

function mapProcedure(fhirResources: Map<string, FhirResource[]>, apiRequest: CbApiRequest) {

    const procResources = fhirResources.get(FHIR_RESOURCES.Procedure);
    if(procResources) {
        const surgeryResource = procResources.find(resource => {
            return resource.meta?.profile?.some(elem => elem.includes(META_PROFILE_SURGICAL_PROCEDURE));
        })  as Procedure;

        const radioResource = procResources.find(resource => {
            return resource.meta?.profile?.some(elem => elem.includes(META_PROFILE_RADIOTHERAPY));
        })  as Procedure;


        if(surgeryResource || radioResource) {
            const categoryData = categoriesMap.get(CATEGORY_PRIOR_MODALITIES);
            const procItem: CbEligibilityFields = {
                fieldId: categoryData.id,
                mode: categoryData.mode,
                values: []
            };
            if(surgeryResource) {
                procItem.values.push({
                    valueId: CB_CLINICAL_ITEM_SURGERY,
                });
            }
            if(radioResource) {
                procItem.values.push({
                    valueId: CB_CLINICAL_ITEM_RADIATION,
                });
            }
            apiRequest.filter.eligibility.push(procItem);

        }
        else {
            console.log("FHIR Bundle: Found Procedure Resource: Missing Procedure with meta.Profile: " + META_PROFILE_SURGICAL_PROCEDURE + " or meta.Profile: " + META_PROFILE_RADIOTHERAPY);
        }
    }
}



