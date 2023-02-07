
export const phaseCodeMap = new Map<string, string>([
    ["early-phase-1", "12"],
    ["phase-1", "1"],
    ["phase-2", "2"],
    ["phase-3", "3"],
    ["phase-4", "4"],
    ["phase-1-phase-2", "5"],
    ["phase-2-phase-3", "11"],
]);

export const cbPhaseToFhirCodeMap = new Map<string, string>([
    ["12", "early-phase-1"],
    ["1", "phase-1"],
    ["2", "phase-2"],
    ["3", "phase-3"],
    ["4", "phase-4"],
    ["5", "phase-1-phase-2"],
    ["11", "phase-2-phase-3"],
    ["8", "early-phase-1"], //Pilot
    ["7", "phase-3"], //Phase 3.B
]);