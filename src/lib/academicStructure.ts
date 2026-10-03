/**
 * Academic Structure: Faculties (Schools) and their respective Departments.
 * Used across signup, profile management, course authoring, and course catalog filtering.
 */

export interface FacultyStructure {
  name: string;
  departments: string[];
}

export const ACADEMIC_STRUCTURE: FacultyStructure[] = [
  {
    name: "Business Studies",
    departments: [
      "Business Administration and Mgt.",
      "Public Administration",
      "Marketing",
      "Procurement & Supply Chain Mgt.",
      "Liberal Studies",
    ],
  },
  {
    name: "Financial Studies",
    departments: [
      "Accountancy",
      "Banking and Finance",
      "Taxation",
    ],
  },
  {
    name: "Industrial Engineering Technology",
    departments: [
      "Electrical/Electronic Engineering Tech.",
      "Mechanical Engineering Tech.",
      "Welding and Fabrication Engineering",
      "Mechatronics Engineering",
    ],
  },
  {
    name: "Natural Resources Engineering",
    departments: [
      "Agric & Bio-Environmental Engineering Tech.",
      "Water Resources Engineering",
      "Mineral and Petroleum Resources Engineering Tech.",
      "Civil Engineering Technology",
    ],
  },
  {
    name: "Agric. & Agricultural Technology",
    departments: [
      "Dept. of Animal Production (HND)",
      "Agric. Extension (HND)",
      "Production (HND)",
      "Agric. Technology (ND)",
      "Fisheries Technology",
      "Horticulture",
    ],
  },
  {
    name: "Environmental Studies",
    departments: [
      "Architectural Technology",
      "Cartography & Geographic Information System (GIS)",
      "Urban and Regional Planning",
      "Survey and Geo-Informatics",
      "Quantity Surveying",
      "Estate Management & Valuation",
      "Building Technology",
      "Art and Industrial Design",
      "Dept. of Glass and Ceramic Technology",
    ],
  },
  {
    name: "Pure and Applied Sciences",
    departments: [
      "Mathematics",
      "Hospitality Management",
      "Food Science and Technology",
      "Science Laboratory Technology (ND)",
      "Microbiology (HND)",
      "Chemistry (HND)",
      "Dept. of Biochemistry (HND)",
      "Statistics",
      "Physics with Electronics (HND)",
    ],
  },
  {
    name: "Computing, Information and Communication Tech.",
    departments: [
      "Computer Science (ND)",
      "Dept. of Networking and Cloud Computing (HND)",
      "Software Development (HND)",
    ],
  },
  {
    name: "School of Communication and Information Technology",
    departments: [
      "Office Technology and Management",
      "Mass Communication",
      "Library & Information Science",
      "Languages and Communication",
    ],
  },
];

export const ALL_FACULTIES = ACADEMIC_STRUCTURE.map((f) => f.name);

export const ALL_DEPARTMENTS = ACADEMIC_STRUCTURE.flatMap((f) => f.departments);

export function getDepartmentsForFaculty(facultyName: string): string[] {
  const found = ACADEMIC_STRUCTURE.find((f) => f.name === facultyName);
  return found ? found.departments : [];
}

export function getFacultyForDepartment(deptName: string): string | undefined {
  const found = ACADEMIC_STRUCTURE.find((f) => f.departments.includes(deptName));
  return found?.name;
}
