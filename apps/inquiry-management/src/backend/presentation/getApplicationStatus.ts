import {
  applicationName,
  type ApplicationStatus,
} from "../../shared/application";

export function getApplicationStatus(): ApplicationStatus {
  return { name: applicationName, status: "ok" };
}
