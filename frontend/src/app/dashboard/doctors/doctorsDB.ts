import { loadAll, saveAll } from "../dashboardDB";
import type { Doctor } from "./types";

const STORE = "doctors";

export const loadDoctorsDB = () => loadAll<Doctor[]>(STORE);
export const saveDoctorsDB = (doctors: Doctor[]) => saveAll(STORE, doctors);
