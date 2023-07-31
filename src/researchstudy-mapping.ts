/**
 * This module exports a function for mapping a trial in the format returned by
 * the underlying service to the FHIR ResearchStudy type.
 */

import {CLINICAL_TRIAL_IDENTIFIER_CODING_SYSTEM_URL, ResearchStudy} from 'clinical-trial-matching-service';
import {cbStatusToResearchStudyStatusMap} from "./consts";
import {CbTrial} from "./models";
import {cbPhaseToFhirCodeMap} from "./phase";

export function convertToResearchStudy(trial: CbTrial, id: number): ResearchStudy {
  const result = new ResearchStudy(id);

  if (trial.shortTitle) {
    result.title = trial.shortTitle;
  }

  if (trial.fullTitle) {
    result.description = trial.fullTitle;
  }

  //TBD: result.id = trial.trialId;
  if(trial.nctId) {
    result.identifier = [{ use: 'official', system: CLINICAL_TRIAL_IDENTIFIER_CODING_SYSTEM_URL, value: trial.nctId }];
  }

  if (trial.phase) {
    const phaseCode = cbPhaseToFhirCodeMap.get(trial.phase.phaseId)
    result.phase = {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/research-study-phase',
          code: phaseCode,
          display: phaseCode
        }
      ],
      text: trial.phase.phaseName
    };
  }

  if(trial.status && cbStatusToResearchStudyStatusMap.has(trial.status.statusId)) {
      result.status = cbStatusToResearchStudyStatusMap.get(trial.status.statusId) as typeof result['status'];
  }

  if(trial.sites && trial.sites.length > 0) {
    result.location = [];
    trial.sites.forEach(site => {

      const loc = result.addSite(site.siteName)
      if(site.coordinates) {
        loc.position = { latitude: site.coordinates.lat, longitude: site.coordinates.lon };
      }
      if (site.zipCode) {
        loc.address = {
          use: 'work',
          postalCode: site.zipCode,
          city: site.city,
          country: site.countryName
        };
        if(site.stateCode) {
          loc.address.state = site.stateCode
        }
      }
      if(site.contacts && site.contacts.length > 0) {
        site.contacts.forEach(contact => {
          result.addContact(contact.contactName,contact.phoneNumber, contact.email);
        })
      }
      result.location.push({ text: site.countryName });
    })
  }

  if (trial.overallContacts && trial.overallContacts.length > 0) {
    {
      trial.overallContacts.forEach(contact => {
        result.addContact(contact.contactName,contact.phoneNumber, contact.email);
      })
    }
   }

  return result;
}

export default convertToResearchStudy;
