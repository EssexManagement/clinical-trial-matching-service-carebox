import * as fs from "fs";
import * as path from "path";
import { parse } from 'csv-parse';

export type UsZip = {
    zip: string;
    lat: string;
    lng: string;
    city: string;
    state_id: string;
    state_name: string;
};

export const zipCodeToLatLngMapping = new Map<string, UsZip>(); //Loaded dynamically based on csv file
export const US_ZIPCODES_FILE = "../../data/uszips.csv";


export function importUsZipFile(filePath: string, mapping: Map<string, UsZip>){

    const csvFilePath = path.resolve(__dirname, filePath);
    const headers = ["zip","lat","lng","city","state_id","state_name","zcta","parent_zcta","population","density","county_fips","county_name","county_weights","county_names_all","county_fips_all","imprecise","military","timezone"];
    const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });

    parse(fileContent, {
        delimiter: ',',
        columns: headers,
    }, (error, result: UsZip[]) => {
        if (error) {
            throw new Error("Failed Reading US ZIP CSV file: " + error.code + ': ' + error.message);
        }
        result.forEach(usZip => {
            mapping.set(usZip.zip, usZip);
        });
    });

}
