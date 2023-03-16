
export const fhirStageToCbMetsMap = new Map<string, string[]>([
  ["1", ["1534", "1541", "1554", "1553"]], //Cancer has not spread, Early-stage disease, cancer has not spread, No it has not spread outside of the original location, No it has not spread outside of the eye
  ["2", ["1548"]], //Lymph nodes near the tumor
  ["3", ["1565"]], //Tissue adjacent to primary tumor (locally advanced)
  ["4", ["1539", "1542", "1544", "1546", "1560", "1528", "1530", "1531", "1532", "1561", "1562", "1543", "1557"]],
  ["1A", ["1534", "1541", "1554", "1553"]], //Cancer has not spread, Early-stage disease, cancer has not spread, No it has not spread outside of the original location, No it has not spread outside of the eye
  ["2A", ["1548"]], //Lymph nodes near the tumor
  ["3A", ["1565"]], //Tissue adjacent to primary tumor (locally advanced)
  ["4A", ["1539", "1542", "1544", "1546", "1560", "1528", "1530", "1531", "1532", "1561", "1562", "1543", "1557"]],
  ["1B", ["1534", "1541", "1554", "1553"]], //Cancer has not spread, Early-stage disease, cancer has not spread, No it has not spread outside of the original location, No it has not spread outside of the eye
  ["2B", ["1548"]], //Lymph nodes near the tumor
  ["3B", ["1565"]], //Tissue adjacent to primary tumor (locally advanced)
  ["4B", ["1539", "1542", "1544", "1546", "1560", "1528", "1530", "1531", "1532", "1561", "1562", "1543", "1557"]],
  ["1C", ["1534", "1541", "1554", "1553"]], //Cancer has not spread, Early-stage disease, cancer has not spread, No it has not spread outside of the original location, No it has not spread outside of the eye
  ["2C", ["1548"]], //Lymph nodes near the tumor
  ["3C", ["1565"]], //Tissue adjacent to primary tumor (locally advanced)
  ["4C", ["1539", "1542", "1544", "1546", "1560", "1528", "1530", "1531", "1532", "1561", "1562", "1543", "1557"]],
  ["1E", ["1534", "1541", "1554", "1553"]], //Cancer has not spread, Early-stage disease, cancer has not spread, No it has not spread outside of the original location, No it has not spread outside of the eye
  ["2E", ["1548"]], //Lymph nodes near the tumor
  ["3E", ["1565"]], //Tissue adjacent to primary tumor (locally advanced)
  ["4E", ["1539", "1542", "1544", "1546", "1560", "1528", "1530", "1531", "1532", "1561", "1562", "1543", "1557"]],
  ["1S", ["1534", "1541", "1554", "1553"]], //Cancer has not spread, Early-stage disease, cancer has not spread, No it has not spread outside of the original location, No it has not spread outside of the eye
  ["2S", ["1548"]], //Lymph nodes near the tumor
  ["3S", ["1565"]], //Tissue adjacent to primary tumor (locally advanced)
  ["4S", ["1539", "1542", "1544", "1546", "1560", "1528", "1530", "1531", "1532", "1561", "1562", "1543", "1557"]],
  ["A1", ["1534", "1541", "1554", "1553"]], //Cancer has not spread, Early-stage disease, cancer has not spread, No it has not spread outside of the original location, No it has not spread outside of the eye
  ["A2", ["1548"]], //Lymph nodes near the tumor
  ["B1", ["1534", "1541", "1554", "1553"]], //Cancer has not spread, Early-stage disease, cancer has not spread, No it has not spread outside of the original location, No it has not spread outside of the eye
  ["B2", ["1548"]], //Lymph nodes near the tumor
  ["2A1", ["1548"]], //Lymph nodes near the tumor
  ["2A2", ["1548"]], //Lymph nodes near the tumor
  ["3C1", ["1565"]], //Tissue adjacent to primary tumor (locally advanced)
  ["3C2", ["1565"]], //Tissue adjacent to primary tumor (locally advanced)
  ["4A1", ["1539", "1542", "1544", "1546", "1560", "1528", "1530", "1531", "1532", "1561", "1562", "1543", "1557"]],
  ["4A2", ["1539", "1542", "1544", "1546", "1560", "1528", "1530", "1531", "1532", "1561", "1562", "1543", "1557"]],

// 1539 Distant lymph nodes
// 1542 Fluid around the lungs (malignant pleural effusion)
// 1544 Liver
// 1546 Lung
// 1560 Skin
// 1528 Abdomen
// 1530 Bone (including vertebrae)
// 1531 Brain - controlled / asymptomatic or unknown status
// 1532 Brain - not controlled
// 1561 Spinal cord - controlled / asymptomatic or unknown status
// 1562 Spinal cord - not controlled
// 1543 Leptomeningeal disease
// 1557 Other (includes other lobes of lung or organ)
]);
