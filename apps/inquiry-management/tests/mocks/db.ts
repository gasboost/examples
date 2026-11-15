import { vi } from "vitest";

const testDatabase = vi.hoisted(() => ({ reset: () => {} }));

vi.mock("../../src/backend/lib/sheets", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/backend/lib/sheets")>();
  const { InMemoryDataStore, InMemoryGateway } =
    await import("@gasboost/sheetorm");
  const store = new InMemoryDataStore(
    new Map(
      actual.sheetTables.map((table) => [
        `${table.dbId}:${table.name}`,
        [Object.keys(table.schema.shape)],
      ]),
    ),
  );
  testDatabase.reset = () => {
    for (const table of actual.sheetTables) {
      store.set(`${table.dbId}:${table.name}`, [
        Object.keys(table.schema.shape),
      ]);
      table.cache.clear();
    }
  };
  return { ...actual, sheetGateway: new InMemoryGateway(store) };
});

export function resetDatabase() {
  testDatabase.reset();
}
