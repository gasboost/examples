import { AppsScript, type InferAppsScript } from "@gasboost/app";
import { applicationName } from "../shared/application";
import { getApplicationStatus } from "./presentation/getApplicationStatus";

const app = new AppsScript()
  .get(() =>
    HtmlService.createHtmlOutputFromFile("index").setTitle(applicationName),
  )
  .call("getApplicationStatus", getApplicationStatus);

export type AppType = InferAppsScript<typeof app>;
export default app;
