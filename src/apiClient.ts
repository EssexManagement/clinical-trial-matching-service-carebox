
/// Sends request to Auth Server and get access token by client credentials
/// @param configuration the configuration to use to configure the request
import axios, { AxiosResponse } from "axios";
import {CbAPIQuery, QueryConfiguration} from "./query";
import {CbApiResponse} from "./models";
import {DIRECT_MATCH_SERVICE_PATH, ELIGIBILITY_LOOKUP_SERVICE_PATH} from "./consts";
import {DevCacheClient, DevCacheClientAbs} from "@EssexManagement/clinical-trial-matching-service"

export async function getAuthToken(configuration: QueryConfiguration): Promise<string> {
    try {
        const options = {
            method: 'POST',
            url: configuration.auth_server,
            headers: {'content-type': 'application/x-www-form-urlencoded'},
            data: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: configuration.auth_client_id,
                client_secret: configuration.auth_client_secret,
            })
        };

        const response = await axios.request<{ access_token: string }>(options);
        console.log("getAuthToken response: " + JSON.stringify(response.data));
        return response.data.access_token;
    } catch (error: unknown) {
      const message = (error as Error)?.message ?? 'unknown error';
      throw new Error(`getAuthToken failed: ${message}`);
    }

}

export async function getEligibilityCategories(configuration: QueryConfiguration, bearerToken: string) {
    try {
        const options = {
            method: 'POST',
            url: configuration.endpoint + ELIGIBILITY_LOOKUP_SERVICE_PATH,
            headers: {'content-type': 'application/json',
                      'Authorization': 'Bearer ' + bearerToken},
            data: {
                page: 1,
                pageSize: 20
            }
        };

        const response = await axios.request<{fields: unknown}>(options);
        console.log("getEligibilityCategories response: " + JSON.stringify(response.data));
        return response.data ? response.data.fields : null;
    }
    catch (error: unknown) {
        const message = (error as Error)?.message ?? 'unknown error';
        console.log('getEligibilityCategories failed: ' + message);
        throw new Error("getEligibilityCategories failed: " + message);
    }
}

interface DevCacheResponse<T> {
  data: T;
  status: number;
}

export async function getMatches(
  endpoint: string,
  bearerToken: string,
  cbApiRequest: CbAPIQuery,
  devCacheClient: DevCacheClientAbs
): Promise<AxiosResponse<CbApiResponse> | DevCacheResponse<CbApiResponse>> {
  console.log("Send query request to url: " + endpoint);
  console.log("With payload: " + cbApiRequest.toString());

  const options = {
    method: "POST",
    url: endpoint + DIRECT_MATCH_SERVICE_PATH,
    headers: {
      "content-type": "application/json",
      Authorization: "Bearer " + bearerToken,
    },
    data: cbApiRequest.toString(),
  };

  if (devCacheClient instanceof DevCacheClient) {
    const key = options.url + options.data;
    const cached = (await devCacheClient.get(key)) as CbApiResponse;
    if (cached) {
      return { data: cached, status: 200 };
    }
    const res = await axios.request<CbApiResponse>(options);
    await devCacheClient.set(key, res.data);
    return res;
  }

  return axios.request<CbApiResponse>(options);
}
