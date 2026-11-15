import { InMemoryCacheService } from "@gasboost/fake-core";
import {
  InMemoryDataStore,
  InMemoryGateway,
  SheetDB,
  SheetTable,
} from "@gasboost/sheetorm";
import { describe, expect, it } from "vitest";
import { roles } from "../../src/shared/policy";
import {
  type Principal,
  principalSchema,
  rowLevelSecurity,
} from "../../src/shared/rls";
import {
  customerTable,
  inquiryTable,
  inquiryEventTable,
} from "../../src/shared/tables";
import { customer, event, ids, inquiry } from "./fixtures";

const admin: Principal = { userId: ids.admin, role: roles.admin };
const staff: Principal = { userId: ids.staff, role: roles.staff };
const other: Principal = { userId: ids.other, role: roles.staff };

// Exercise the real SheetORM interpreter, including writes and EXISTS reads.
// Each test owns its tables, gateway and cache; production wiring is Issue #3.
function createContext(initialPrincipal: Principal = staff) {
  const sheetTables = [
    new SheetTable({ ...customerTable, dbId: "rls-test" }),
    new SheetTable({ ...inquiryTable, dbId: "rls-test" }),
    new SheetTable({ ...inquiryEventTable, dbId: "rls-test" }),
  ] as const;
  const store = new InMemoryDataStore(
    new Map(
      sheetTables.map((table) => [
        `${table.dbId}:${table.name}`,
        [Object.keys(table.schema.shape)],
      ]),
    ),
  );
  const db = new SheetDB({
    tables: sheetTables,
    gateway: new InMemoryGateway(store),
    cacheService: new InMemoryCacheService(),
    utilities: Utilities,
    lockService: LockService,
    rowLevelSecurity,
    principal: { ...admin },
  });
  db.table("Customer").create([customer]);
  db.table("Inquiry").create([inquiry]);
  db.table("InquiryEvent").create([event]);
  db.setPrincipal(principalSchema.parse(initialPrincipal));
  return db;
}

describe("business RLS evaluated by SheetORM", () => {
  it.each([admin, staff, other])(
    "allows all reads, customer writes and inquiry creation for $userId",
    (principal) => {
      const db = createContext(principal);
      expect(db.table("Customer").find()).toEqual([customer]);
      expect(db.table("Inquiry").find()).toEqual([inquiry]);
      expect(db.table("InquiryEvent").find()).toEqual([event]);
      expect(
        db.table("Customer").update([{ ...customer, name: "変更" }])[0].name,
      ).toBe("変更");
      expect(
        db.table("Customer").create([{ ...customer, id: ids.missing }]),
      ).toHaveLength(1);
      expect(
        db
          .table("Inquiry")
          .create([{ ...inquiry, id: ids.missing, assigneeId: null }]),
      ).toHaveLength(1);
    },
  );

  it.each([admin, staff])(
    "allows an admin or the current assignee to update",
    (principal) => {
      const db = createContext(principal);
      expect(
        db.table("Inquiry").update([{ ...inquiry, subject: "変更" }])[0]
          .subject,
      ).toBe("変更");
    },
  );

  it("checks the pre-update record, preventing another staff member taking ownership", () => {
    const db = createContext(other);
    expect(() =>
      db.table("Inquiry").update([{ ...inquiry, assigneeId: ids.other }]),
    ).toThrow("RLS denied update");
    expect(db.table("Inquiry").find()).toEqual([inquiry]);
  });

  it.each([ids.other, null])(
    "checks the post-update record, preventing a staff reassignment to %s",
    (assigneeId) => {
      const db = createContext();
      expect(() =>
        db.table("Inquiry").update([{ ...inquiry, assigneeId }]),
      ).toThrow("RLS denied updated record");
      expect(db.table("Inquiry").find()).toEqual([inquiry]);
    },
  );

  it("transfers update and event permissions when the administrator reassigns an inquiry", () => {
    const db = createContext(admin);
    const reassigned = { ...inquiry, assigneeId: ids.other };
    db.table("Inquiry").update([reassigned]);
    db.setPrincipal(staff);
    expect(() => db.table("Inquiry").update([reassigned])).toThrow(
      "RLS denied update",
    );
    expect(() =>
      db
        .table("InquiryEvent")
        .create([{ ...event, id: ids.missing, actorId: ids.staff }]),
    ).toThrow("RLS denied insert");
    db.setPrincipal(other);
    expect(db.table("Inquiry").update([reassigned])).toEqual([reassigned]);
    expect(
      db
        .table("InquiryEvent")
        .create([{ ...event, id: ids.missing, actorId: ids.other }]),
    ).toHaveLength(1);
  });

  it("denies staff updates/events on unassigned inquiries while allowing admin operations", () => {
    const db = createContext(admin);
    const unassigned = { ...inquiry, assigneeId: null };
    db.table("Inquiry").update([unassigned]);
    db.setPrincipal(staff);
    expect(() => db.table("Inquiry").update([unassigned])).toThrow(
      "RLS denied update",
    );
    expect(() =>
      db
        .table("InquiryEvent")
        .create([{ ...event, id: ids.missing, actorId: ids.staff }]),
    ).toThrow("RLS denied insert");
    db.setPrincipal(admin);
    expect(
      db.table("InquiryEvent").create([{ ...event, id: ids.missing }]),
    ).toHaveLength(1);
  });

  it.each([admin, staff])(
    "allows event insertion for the authenticated actor on an authorized inquiry",
    (principal) => {
      const db = createContext(principal);
      expect(
        db
          .table("InquiryEvent")
          .create([{ ...event, id: ids.missing, actorId: principal.userId }]),
      ).toHaveLength(1);
    },
  );

  it("correlates EXISTS with the target inquiry, rather than any assigned inquiry", () => {
    const db = createContext(admin);
    db.table("Inquiry").create([
      { ...inquiry, id: ids.missing, assigneeId: ids.other },
    ]);
    db.setPrincipal(staff);
    expect(() =>
      db.table("InquiryEvent").create([
        {
          ...event,
          id: ids.missing,
          inquiryId: ids.missing,
          actorId: ids.staff,
        },
      ]),
    ).toThrow("RLS denied insert");
  });

  it.each([admin, staff])(
    "rejects forged actors and missing target inquiries",
    (principal) => {
      const db = createContext(principal);
      expect(() =>
        db
          .table("InquiryEvent")
          .create([{ ...event, id: ids.missing, actorId: ids.other }]),
      ).toThrow("RLS denied insert");
      expect(() =>
        db.table("InquiryEvent").create([
          {
            ...event,
            id: ids.missing,
            inquiryId: ids.missing,
            actorId: principal.userId,
          },
        ]),
      ).toThrow("RLS denied insert");
      expect(db.table("InquiryEvent").find()).toEqual([event]);
    },
  );

  it.each([admin, staff])(
    "denies every delete and event update even for $role",
    (principal) => {
      const db = createContext(principal);
      expect(() => db.table("Customer").delete([ids.customer])).toThrow(
        "RLS denied delete",
      );
      expect(() => db.table("Inquiry").delete([ids.inquiry])).toThrow(
        "RLS denied delete",
      );
      expect(() => db.table("InquiryEvent").delete([ids.event])).toThrow(
        "RLS denied delete",
      );
      expect(() => db.table("InquiryEvent").update([event])).toThrow(
        "RLS denied update",
      );
      expect(db.table("InquiryEvent").find()).toEqual([event]);
    },
  );
});
