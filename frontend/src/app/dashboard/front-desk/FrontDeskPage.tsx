import React from "react";
import { PageHeader } from "../components/PageHeader";
import { usePlan } from "../plan/PlanContext";
import { useFrontDesk } from "./useFrontDesk";
import { ReceptionistFrontDesk } from "./ReceptionistFrontDesk";
import { OwnerFrontDeskOverview } from "./OwnerFrontDeskOverview";

// One route, one real data source (useFrontDesk), two different views —
// Receptionist gets the operate-it workspace (check-in, waiting room,
// calendar, waitlist), Owner gets a read-only live overview of the whole
// clinic grouped by doctor. Previously both roles landed on the exact same
// operate-it UI, which is more control than an Owner walking through for a
// quick status check actually needs.
export function FrontDeskPage() {
  const { role, authedFetch } = usePlan();
  const frontDesk = useFrontDesk(authedFetch);

  return (
    <>
      <PageHeader
        title="Front Desk"
        subtitle={role === "owner" ? "Live view of every doctor's patient flow today." : "Check patients in, manage the waiting room, and see what's coming up."} />
      {role === "owner" ? (
        <OwnerFrontDeskOverview appointments={frontDesk.appointments} loading={frontDesk.loading} />
      ) : (
        <ReceptionistFrontDesk {...frontDesk} />
      )}
    </>);
}
