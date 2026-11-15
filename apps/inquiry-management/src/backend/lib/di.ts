import { Customers } from "../application/Customers";
import type { CustomerRepository } from "../application/CustomerRepository";
import { SheetCustomerRepository } from "../infrastructure/SheetCustomerRepository";
import { asFunction, asValue, createContainer, InjectionMode } from "awilix";
import { auth } from "./auth";
import { db } from "./db";

type Dependencies = {
  customerRepository: CustomerRepository;
  customers: Customers;
  db: typeof db;
  auth: typeof auth;
};

export const container = createContainer<Dependencies>({
  injectionMode: InjectionMode.PROXY,
});

container.register({
  customerRepository: asFunction(
    ({ db }: Dependencies) => new SheetCustomerRepository(db),
  ).singleton(),
  customers: asFunction(
    ({ customerRepository }: Dependencies) =>
      new Customers(
        customerRepository,
        () => Utilities.getUuid(),
        () => new Date().toISOString(),
      ),
  ).singleton(),
  db: asValue(db),
  auth: asValue(auth),
});

export type DiContainer = typeof container;
