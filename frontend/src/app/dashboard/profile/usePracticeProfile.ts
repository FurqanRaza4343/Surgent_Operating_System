import { useEffect, useState } from "react";

export interface PracticeProfile {
  name: string;
  timezone: string;
  address: string;
  onCallPhone: string;
}

const STORAGE_KEY = "aesthetixai_dashboard_practice_profile";

const DEFAULT_PROFILE: PracticeProfile = {
  name: "Your Practice",
  timezone: "America/New_York",
  address: "",
  onCallPhone: ""
};

function load(): PracticeProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function usePracticeProfile() {
  const [profile, setProfile] = useState<PracticeProfile>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore — private mode / storage disabled
    }
  }, [profile]);

  const update = (patch: Partial<PracticeProfile>) => setProfile((p) => ({ ...p, ...patch }));

  return { profile, update };
}
