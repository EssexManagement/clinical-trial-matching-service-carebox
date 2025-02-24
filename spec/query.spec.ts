/**
 * This provides an example of how to test the query to ensure it produces
 * results.
 */

import { Bundle } from "fhir/r4";
import {
  SearchSet,
} from "@EssexManagement/clinical-trial-matching-service";
import createClinicalTrialLookup, {
  isQueryErrorResponse,
} from "../src/query";
import nock from "nock";

describe("createClinicalTrialLookup()", () => {
  it("creates a function if configured properly", () => {
    expect(
      typeof createClinicalTrialLookup({
        endpoint: "http://www.example.com/",
        auth_server: "http://www.example.com/auth",
      })
    ).toEqual("function");
  });

  // This test just makes sure an error is properly raised for invalid
  // configurations
  it("raises an error if configuration is missing", () => {
    expect(() => {
      createClinicalTrialLookup({});
    }).toThrowError("Missing endpoint in configuration");
    expect(() => {
      createClinicalTrialLookup({ endpoint: "http://www.example.com/" });
    }).toThrowError("Missing auth_server in configuration");
  });
});

describe("isQueryErrorResponse()", () => {
  it("returns false for non-response objects", () => {
    expect(isQueryErrorResponse(null)).toBeFalse();
    expect(isQueryErrorResponse(true)).toBeFalse();
    expect(isQueryErrorResponse("string")).toBeFalse();
    expect(isQueryErrorResponse(42)).toBeFalse();
    expect(isQueryErrorResponse({ invalid: true })).toBeFalse();
  });

  it("returns true on a matching object", () => {
    expect(isQueryErrorResponse({ error: "oops" })).toBeTrue();
  });
});

// describe("CbAPIQuery", () => {
//   // FIXME: Write tests
// });

// describe("convertResponseToSearchSet()", () => {
//   // FIXME: Write tests
// });

describe("ClinicalTrialLookup", () => {
  // A valid patient bundle for the matcher, passed to ensure a query is generated
  const patientBundle: Bundle = {
    resourceType: "Bundle",
    type: "batch",
    entry: [],
  };
  let matcher: (patientBundle: Bundle) => Promise<SearchSet>;
  let scope: nock.Scope;
  let mockRequest: nock.Interceptor;
  let mockAuthServer: nock.Interceptor;
  beforeEach(() => {
    // Create the matcher here. This creates a new instance each test so that
    // each test can adjust it as necessary without worrying about interfering
    // with other tests.
    matcher = createClinicalTrialLookup({
      endpoint: "https://www.example.com/endpoint",
      auth_server: "https://www.example.com/auth",
    });
    // Create the interceptor for the mock request here as it's the same for
    // each test
    scope = nock("https://www.example.com");
    mockRequest = scope.post("/endpoint/v2.1/trials/directMatch");
    mockAuthServer = scope.post("/auth");
    // jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
  });
  afterEach(() => {
    // Expect the endpoint to have been hit in these tests
    expect(nock.isDone()).toBeTrue();
  });

  it("generates a request", () => {
    mockRequest.reply(200, { trials: [] });
    mockAuthServer.reply(200, { access_token: 'token' });
    return expectAsync(matcher(patientBundle)).toBeResolved();
  });

  it("rejects with an error if an error is returned by the server", () => {
    // Simulate an error response
    mockRequest.reply(200, { error: "Test error" });
    mockAuthServer.reply(200, { access_token: 'token' });
    return expectAsync(matcher(patientBundle)).toBeRejectedWithError(
      /^Unable to parse trial from server:/
    );
  });

  it("rejects with an error if an HTTP error is returned by the server", () => {
    // Simulate an error response
    mockRequest.reply(500, "Internal Server Error");
    mockAuthServer.reply(200, { access_token: 'token' });
    return expectAsync(matcher(patientBundle)).toBeRejectedWithError(
      /^Request failed with status code 500/
    );
  });

  it("rejects with an error if the response is invalid", () => {
    // Simulate a valid response with something that can't be parsed as JSON
    mockRequest.reply(200, { missingAllKnownKeys: true });
    mockAuthServer.reply(200, { access_token: 'token' });
    return expectAsync(matcher(patientBundle)).toBeRejectedWithError(
      /^Unable to parse trial from server:/
    );
  });

  it("rejects with an error if the response is not JSON", () => {
    // Simulate a valid response with something that can't be parsed as JSON
    mockRequest.reply(200, "A string that isn't JSON");
    mockAuthServer.reply(200, { access_token: 'token' });
    return expectAsync(matcher(patientBundle)).toBeRejectedWithError(
      /^Unable to parse trial from server:/
    );
  });

  it("rejects with an error if the request fails", () => {
    // Simulate a valid response with something that can't be parsed as JSON
    mockRequest.replyWithError("Test error");
    mockAuthServer.reply(200, { access_token: 'token' });
    return expectAsync(matcher(patientBundle)).toBeRejectedWithError(
      "Test error"
    );
  });
});
