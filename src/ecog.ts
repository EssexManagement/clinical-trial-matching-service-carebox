export interface KarnofskyEcog {
    minValue: number;
    maxValue: number;
    code: string;
}

export const ECOG_DICT_NAME = "Ecog"
export const ECOG_CODES = {
    ecog_0: "ecog:0",
    ecog_1: "ecog:1",
    ecog_2: "ecog:2",
    ecog_3: "ecog:3",
    ecog_4: "ecog:4",
    ecog_5: "ecog:5"

}

export const ecogKarnofskyMap = new Map<number, KarnofskyEcog>([
    [0, { minValue: 81, maxValue: 100, code: ECOG_CODES.ecog_0}],
    [1, { minValue: 70, maxValue: 80, code: ECOG_CODES.ecog_1}],
    [2, { minValue: 50, maxValue: 69, code: ECOG_CODES.ecog_2}],
    [3, { minValue: 30, maxValue: 49, code: ECOG_CODES.ecog_3}],
    [4, { minValue: 1, maxValue: 29, code: ECOG_CODES.ecog_4}],
    [5, { minValue: 0, maxValue: 0, code: ECOG_CODES.ecog_5}],
]);
