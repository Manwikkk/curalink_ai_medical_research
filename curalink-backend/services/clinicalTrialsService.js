import axios from "axios";

const BASE_URL = "https://clinicaltrials.gov/api/v2/studies";

const STATUS_MAP = {
  RECRUITING: "Recruiting",
  ACTIVE_NOT_RECRUITING: "Active, not recruiting",
  COMPLETED: "Completed",
  NOT_YET_RECRUITING: "Not yet recruiting",
  ENROLLING_BY_INVITATION: "Enrolling by invitation",
};

/**
 * Fetch clinical trials for a disease + optional location.
 * @param {string} condition
 * @param {string} [location]
 * @param {number} pageSize
 * @returns {Promise<ClinicalTrial[]>}
 */
export async function searchClinicalTrials(condition, location = "", pageSize = 60) {
  try {
    const params = {
      "query.cond": condition,
      pageSize,
      format: "json",
      // Fetch both recruiting and active trials
      "filter.overallStatus": "RECRUITING,ACTIVE_NOT_RECRUITING,NOT_YET_RECRUITING",
      // Request specific fields for efficiency
      fields:
        "NCTId,BriefTitle,OverallStatus,Phase,EligibilityCriteria,LocationFacility,LocationCity,LocationCountry,CentralContactName,CentralContactPhone,CentralContactEMail,LeadSponsorName,StartDate",
    };

    if (location) params["query.locn"] = location;

    const res = await axios.get(BASE_URL, { params, timeout: 15000 });
    const studies = res.data?.studies || [];

    return studies.map((s) => {
      const proto = s.protocolSection;
      const id = proto?.identificationModule?.nctId || "";
      const title = proto?.identificationModule?.briefTitle || "Untitled trial";
      const rawStatus = proto?.statusModule?.overallStatus || "";
      const status = STATUS_MAP[rawStatus] || rawStatus;
      const phases = proto?.designModule?.phases || [];
      const phase = phases.join(", ") || "";
      const eligibility =
        proto?.eligibilityModule?.eligibilityCriteria?.slice(0, 600) ||
        "Eligibility criteria not specified.";

      // Location
      const locations = proto?.contactsLocationsModule?.locations || [];
      const primaryLocation = locations[0];
      const locationStr = primaryLocation
        ? [
            primaryLocation.facility,
            primaryLocation.city,
            primaryLocation.country,
          ]
            .filter(Boolean)
            .join(", ")
        : "Location not specified";

      // Contact
      const central = proto?.contactsLocationsModule?.centralContacts?.[0];
      const contact = central
        ? [
            central.name,
            central.phone,
            central.email,
          ]
            .filter(Boolean)
            .join(" · ")
        : "";

      const sponsor = proto?.sponsorCollaboratorsModule?.leadSponsor?.name || "";
      const startDate = proto?.statusModule?.startDateStruct?.date || "";

      return {
        id: id || `ct_${Math.random().toString(36).slice(2)}`,
        title,
        status,
        phase,
        eligibility: eligibility.replace(/\n+/g, " ").trim(),
        location: locationStr + (locations.length > 1 ? ` (+${locations.length - 1} sites)` : ""),
        contact,
        source: "ClinicalTrials.gov",
        sponsor,
        startDate,
      };
    });
  } catch (err) {
    console.error("[ClinicalTrials]", err.message);
    return [];
  }
}
