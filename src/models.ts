
export interface CbSortFields {
    field: string;
    order: string;
}

export interface CbApiRequest {
    page: number,
    pageSize: number,
    fields: string[];
    filter: CbFilterFields;
    origin?: CbOriginFields;
    sort: CbSortFields[];
}

export interface CbFilterFields {
    condition: CbValueFields;
    statuses?: string;
    title?: string;
    nctId?: string;
    distance?: CbDistanceFields;
    eligibility?: CbEligibilityFields[];
    phases?: string[];
    subTypes?: string[];
    countries?: string[];
    states?: string[];
    modalities?: string[];
    drugs?: string[];
    molecularTargets?: string[];
}

export interface CbDistanceFields {
    from: CbFromFields;
    distance: number;
    distanceUnit: string;
}

export interface CbOriginFields {
    from: CbFromFields;
}

export interface CbFromFields {
    lat: number;
    lon: number;
}

export interface CbEligibilityFields {
    fieldId: string;
    mode?: string;
    value?: string
    values?: CbValueFields[];
}

export interface CbValueFields {
    valueSetId?: string;
    valueId: string;
}

export interface CbApiResponse extends Record<string, unknown> {
    total: number;
    trials: CbTrial[];
}


export interface CbCategory {
    id: string;
    name?: string;
    mode: string;
}

export interface CbTrial extends Record<string, unknown> {
    trialId: number,
    fullTitle: string,
    shortTitle: string,
    nctId: string,
    isPartnerTrial?: boolean,
    phase: {
        phaseId: string,
        phaseName: string,
    },
    status: {
        statusId: string,
        statusName: string,
    },
    sitesCount: number,
    sites: {
        zipCode: string,
        siteName: string,
        countryCode: string,
        countryName: string,
        stateCode: string,
        city: string,
        address: string,
        status: {
            statusId: string,
            statusName: string,
        },
        coordinates: {
            lat: number,
            lon: number
        },
        distance: string,
        contacts: [
            {
                role: string,
                contactName: string,
                email: string,
                phoneNumber: string,
            }
        ]
    }[],
    overallContacts: [
        {
            contactType: string,
            role: string,
            contactName: string,
            email: string,
            phoneNumber: string,
        }
    ]
}

