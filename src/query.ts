/**
 * Handles conversion of patient bundle data to a proper request for matching service apis.
 * Retrieves api response as promise to be used in conversion to fhir ResearchStudy
 */

import { IncomingMessage } from "http";
import {
  ClinicalTrialsGovService,
  ServiceConfiguration,
  ResearchStudy,
  SearchSet,
} from "clinical-trial-matching-service";
import convertToResearchStudy from "./researchstudy-mapping";
import {convertFhirBundleToApiRequest, generateApiQuery} from "./mappers";
import {CbApiRequest, CbApiResponse, CbFilterFields, CbSortFields, CbTrial} from "./models";
import {getAuthToken, getMatches} from "./apiClient";
import {
  CB_API_DEFAULT_PAGE_SIZE,
  CB_API_FIRST_PAGE_NUMBER, CB_API_MAX_PAGE_SIZE,
  HTTP_STATUS_UNPROCESSABLE_ENTITY,
} from "./consts";
import {AxiosError} from "axios";
import {Bundle} from "fhir/r4";


export interface QueryConfiguration extends ServiceConfiguration {
  endpoint?: string;
  auth_server?: string;
  auth_client_id?: string;
  auth_client_secret?: string;
  max_results_returned?:string;
  page_size?: string
  filter_by_country?: string
}

/**
 * Create a new matching function using the given configuration.
 *
 * @param configuration the configuration to use to configure the matcher
 * @param ctgService an optional ClinicalTrialGovService which can be used to
 *     update the returned trials with additional information pulled from
 *     ClinicalTrials.gov
 */
export function createClinicalTrialLookup(
    configuration: QueryConfiguration,
    ctgService?: ClinicalTrialsGovService
): (patientBundle: Bundle) => Promise<SearchSet> {
  // Raise errors on missing configuration
  if (typeof configuration.endpoint !== "string") {
    throw new Error("Missing endpoint in configuration");
  }
  if (typeof configuration.auth_server !== "string") {
    throw new Error("Missing auth_server in configuration");
  }

  const endpoint = configuration.endpoint;

  return function getMatchingClinicalTrials(
      patientBundle: Bundle
  ): Promise<SearchSet> {
    return getAuthToken(configuration).then(async authToken => {
      const defaultCountryFilter = configuration.filter_by_country ? configuration.filter_by_country : null;
      const pageSize = configuration.page_size ? Math.min(parseInt(configuration.page_size), CB_API_MAX_PAGE_SIZE) : CB_API_DEFAULT_PAGE_SIZE;

      // Create the query based on the patient bundle:
      const queryRequest = generateApiQuery(defaultCountryFilter, pageSize);
      convertFhirBundleToApiRequest(patientBundle, queryRequest);

      // And send the query to the server
      return await sendQuery(endpoint, queryRequest, authToken, configuration.max_results_returned, ctgService);
    });
  };
}

export default createClinicalTrialLookup;

/**
 * Type guard to determine if an object is a valid CbTrial (CareBoxTrial).
 * @param o the object to determine if it is a CbTrial
 */
export function isCareBoxTrial(o: unknown): o is CbTrial {
  if (typeof o !== "object" || o === null) return false;

  return (typeof (o as CbTrial).trialId === "number" && typeof (o as CbTrial).shortTitle === "string");
}


/**
 * Type guard to determine if an object is a valid QueryResponse.
 * @param o the object to determine if it is a QueryResponse
 */
export function isCbResponse(o: unknown): o is CbApiResponse {
  if (typeof o !== "object" || o === null) return false;

  return Array.isArray((o as CbApiResponse).trials);
}

export interface QueryErrorResponse extends Record<string, unknown> {
  error: string;
}

/**
 * Type guard to determine if an object is a QueryErrorResponse.
 * @param o the object to determine if it is a QueryErrorResponse
 */
export function isQueryErrorResponse(o: unknown): o is QueryErrorResponse {
  if (typeof o !== "object" || o === null) return false;
  return typeof (o as QueryErrorResponse).error === "string";
}

// API RESPONSE SECTION
export class APIError extends Error {
  public httpStatus: number; //Used by wrapping service to extract HttpErrors
  public result: IncomingMessage;
  public body: string;
  constructor(
    message: string, httpStatus: number, body: string
  ) {
    super(message);
    this.httpStatus = httpStatus;
    this.body = body;
  }
}

/**
 * This class represents a query, built based on values from within the patient
 * bundle.
 */
export class CbAPIQuery implements CbApiRequest {

  page: number = CB_API_FIRST_PAGE_NUMBER;
  pageSize: number = CB_API_DEFAULT_PAGE_SIZE;
  fields: string[] = []; //The names of the fields to be returned for each matching trial
  filter: CbFilterFields = {condition: null};
  sort: CbSortFields[] = [];

  toString(): string {
    // Note that if toQuery is no longer a string, this will no longer work
    return JSON.stringify(this);
  }
}

/**
 * Convert a query response into a search set.
 *
 * @param response the response object
 * @param ctgService an optional ClinicalTrialGovService which can be used to
 *     update the returned trials with additional information pulled from
 *     ClinicalTrials.gov
 */
export function convertResponseToSearchSet(
  response: CbApiResponse,
  ctgService?: ClinicalTrialsGovService
): Promise<SearchSet> {
  // Our final response
  const studies: ResearchStudy[] = [];
  // For generating IDs
  let id = 0;
  for (const trial of response.trials) {
    if (isCareBoxTrial(trial)) {
      studies.push(convertToResearchStudy(trial, id++));
    } else {
      // This trial could not be understood. It can be ignored if that should
      // happen or raised/logged as an error.
      return Promise.reject(new Error("Unable to parse trial from server: " + JSON.stringify(trial)));
    }
  }
  try {
    if (ctgService) {
      // If given a backup service, use it
      return ctgService.updateResearchStudies(studies).then(() => {
        return new SearchSet(studies);
      }, (reason) => {
        return Promise.reject(reason);
      });
    } else {
      // Otherwise, resolve immediately
      return Promise.resolve(new SearchSet(studies));
    }
  } catch (e) {
    return Promise.reject(e);
  }

}

/**
 * Helper function to handle actually sending the query.
 *
 * @param endpoint the URL of the end point to send the query to
 * @param cbApiRequest the query to send
 * @param bearerToken the bearer token to send along with the query to
 *     authenticate with the service
 * @param maxResultsToReturn an optional maximum amount of retrieved matches
 * @param ctgService an optional ClinicalTrialGovService which can be used to
 *     update the returned trials with additional information pulled from
 *     ClinicalTrials.gov
 */
async function sendQuery(
  endpoint: string,
  cbApiRequest: CbAPIQuery,
  bearerToken: string,
  maxResultsToReturn?: string,
  ctgService?: ClinicalTrialsGovService
): Promise<SearchSet> {
  let currentPage = 0;
  let totalPages = 1;
  const maxResults = maxResultsToReturn ? parseInt(maxResultsToReturn) : 0;
  const fullResponse: CbApiResponse = {total: 0, trials: []}
  try {
    do {
      cbApiRequest.page = ++currentPage;
      const response = await getMatches(endpoint, bearerToken, cbApiRequest);
      console.log(`Matcher API Page # ${cbApiRequest.page} result Status: ${JSON.stringify(response.status)}`);
      if (response.status === 200) {
        if(currentPage === 1) { //On first run, update received total and calculated number of pages to retrieve
          const totalTrialsToReturn = maxResults > 0 ? Math.min(maxResults, response.data.total) : response.data.total;
          totalPages = totalTrialsToReturn / cbApiRequest.pageSize;
          fullResponse.total = response.data.total;

          if(response.data.unusedFieldValues && response.data.unusedFieldValues.length > 0) {
            console.log("API returned unused Fields list as follows: " + JSON.stringify(response.data.unusedFieldValues));
          }
        }
        fullResponse.trials = fullResponse.trials.concat(response.data.trials);
      } else {
        console.log("Response", response.data);
        throw new APIError(
            JSON.stringify(response.data),
            response.status,
            JSON.stringify(response.data)
        );
      }
    } while (currentPage < totalPages);


    console.log(`Complete getting all match pages`);
    if (isCbResponse(fullResponse)) {
      console.log(`Matcher API response: Total = ${fullResponse.total} Current retrieved amount: ${fullResponse.trials.length}`);
      return convertResponseToSearchSet(fullResponse, ctgService);
    } else {
      throw new APIError(
          "Unable to parse response from server",
          HTTP_STATUS_UNPROCESSABLE_ENTITY,
          fullResponse
      );
    }
  }
  catch (e: unknown) {
    console.log("Error", e);
    console.log(`getMatches failed: ${e.toString()}`);
    if(isAxiosError(e)) {
      throw new APIError(e.message, e.response.status, JSON.stringify(e.response.data));
    } else {
      const message = typeof e === 'object' && 'message' in e && typeof e.message === 'string' ? e.message : 'unknown error';
      throw new APIError(message, HTTP_STATUS_UNPROCESSABLE_ENTITY, '');
    }
  }
}

export function isAxiosError(e: unknown): e is AxiosError {
  if (typeof e !== "object" || e === null) return false;
  const err = e as AxiosError;
  return (typeof err.message === "string" &&
      typeof err.code === "string" &&
      typeof err.response === "object" )
}
