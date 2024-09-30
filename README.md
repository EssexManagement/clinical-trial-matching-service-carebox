# mcode-clinical-trial-matching-service

Mediator Server, sending queries to the Carebox Clinical Trials Matching API.

The service is aimed to be run under the UI of the [clinical-trial-matching-app](https://github.com/mcode/clinical-trial-matching-app/).

It exposes a single API handler: http://localhost:3000/getClinicalTrial



# Requirements

Node version: The code was tested against version 14.15.5

Credentials: having valid OAUTH2 client_id and client_secret

This server's API expects mCode based bundle on input, to be mapped and sent to the underlying matching service.
The input bundle must include Parameter resource with Zip code and distance.
The API assumes zip code is in US area. It converts the code into lat/long coordinates, based on local csv file: /data/uszips.csv
Also the code decorates each query to Carebox API by additional predefined country filter: US`

The server's API returns a list of ResearchStudy objects.
The ResearchStudy object is a [FHIR-compliant](https://www.hl7.org/fhir/researchstudy.html).

## Configuration:

Clone project from repository [clinical-trial-matching-service-carebox](https://github.com/mcode/clinical-trial-matching-service-carebox)
Open `.env` and make sure the configuration matches your environment. If it does not, update the fields accordingly:
- MATCHING_SERVICE_ENDPOINT - The host of the Carebox API
- MATCHING_SERVICE_AUTH_SERVER - The host of the Carebox OAUTH server
- MATCHING_SERVICE_AUTH_CLIENT_ID - The OAUTH2 client id provided by Carebox in order to execute API requests
- MATCHING_SERVICE_AUTH_CLIENT_SECRET - The OAUTH2 client secret provided by Carebox in order to execute API requests
- MATCHING_SERVICE_MAX_RESULTS_RETURNED - Maximum count of returned trials from the Carebox API
- MATCHING_SERVICE_PAGE_SIZE - Number of trials on each returned page from Carebox API. Must be under or equal to CB_API_MAX_PAGE_SIZE (50)
- MATCHING_SERVICE_FILTER_BY_COUNTRY - Predefined filter on country, to limit search to desired country boundaries.

# Running the Server

1. Run `npm install`
2. Run `npm start`
3. The service will now be running at http://localhost:3000/
4. Execute a call for http://localhost:3000/getClinicalTrial API using postman or clinical-trial-matching-engine app

# Testing - TBD
