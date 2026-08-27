import { loadAll, saveAll } from "../dashboardDB";
import type { Patient } from "./types";

const STORE = "patients";

export const loadPatientsDB = () => loadAll<Patient[]>(STORE);
export const savePatientsDB = (patients: Patient[]) => saveAll(STORE, patients);
