
/// Sends request to Auth Server and get access token by client credentials
/// @param configuration the configuration to use to configure the request
import axios from "axios";
import {CbAPIQuery, QueryConfiguration} from "./query";
import {DIRECT_MATCH_SERVICE_PATH, ELIGIBILITY_LOOKUP_SERVICE_PATH} from "./consts";

export async function getAuthToken(configuration: QueryConfiguration) {

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

        const response = await axios.request(options);
        console.log("getAuthToken response: " + JSON.stringify(response.data));
        return response.data.access_token;
    }
    catch (error) {
        throw new Error("getAuthToken failed: " + error);
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

        const response = await axios.request(options);
        console.log("getEligibilityCategories response: " + JSON.stringify(response.data));
        return response.data ? response.data.fields : null;
    }
    catch (error) {
        console.log("getEligibilityCategories failed: " + error);
        throw new Error("getEligibilityCategories failed: " + error);
    }
}

export async function getMatches(endpoint: string, bearerToken: string, cbApiRequest: CbAPIQuery) {

    console.log("Send query request to url: " + endpoint);
    console.log("With payload: " + cbApiRequest.toString());

    const options = {
        method: 'POST',
        url: endpoint + DIRECT_MATCH_SERVICE_PATH,
        headers: {'content-type': 'application/json',
            'Authorization': 'Bearer ' + bearerToken},
        data: cbApiRequest.toString()
    };

    return axios.request(options);

}
