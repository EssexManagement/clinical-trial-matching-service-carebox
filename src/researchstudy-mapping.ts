/**
 * This module exports a function for mapping a trial in the format returned by
 * the underlying service to the FHIR ResearchStudy type.
 */

import {
  CLINICAL_TRIAL_IDENTIFIER_CODING_SYSTEM_URL,
  ResearchStudy,
} from "@EssexManagement/clinical-trial-matching-service";
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
