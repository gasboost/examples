import { asValue, createContainer, InjectionMode } from "awilix";
import { auth } from "./auth";
import { db } from "./db";

type Dependencies = {
  db: typeof db;
  auth: typeof auth;
};

export const container = createContainer<Dependencies>({
  injectionMode: InjectionMode.PROXY,
});

container.register({
  db: asValue(db),
  auth: asValue(auth),
});

export type DiContainer = typeof container;
