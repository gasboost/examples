import { queryOptions } from "@tanstack/react-query";
import { client } from "./client";

export const applicationStatusOptions = queryOptions({
  queryKey: ["application-status"],
  queryFn: () => client.getApplicationStatus(),
});
