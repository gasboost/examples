import { customerRls } from "../infrastructure/customerRls";
import { SheetDB } from "@gasboost/sheetorm";
import { sheetTables, sheetGateway } from "./sheets";

export const db = new SheetDB({
  tables: sheetTables,
  rowLevelSecurity: [customerRls],
  gateway: sheetGateway,
  cacheService: CacheService,
  utilities: Utilities,
  lockService: LockService,
});
export type DB = typeof db;
