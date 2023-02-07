import {CbApiRequest} from "./models";
import {FhirResource} from "fhir/r4";


export type MappingFunc = (fhirResources: Map<string, FhirResource[]>, apiRequest: CbApiRequest) => void;

