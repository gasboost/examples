import { appsScriptClient } from "@gasboost/client";
import type { AppType } from "../../backend/main";

export const { client } = appsScriptClient<AppType>();
