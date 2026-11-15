import { ListCustomers } from "../application/ListCustomers";
import { CreateCustomer } from "../application/CreateCustomer";
import { UpdateCustomer } from "../application/UpdateCustomer";
import type { CustomerRepository } from "../application/CustomerRepository";
import { SheetCustomerRepository } from "../infrastructure/SheetCustomerRepository";
import { asFunction, asValue, createContainer, InjectionMode } from "awilix";
import { auth } from "./auth";
import { db } from "./db";

type Dependencies = {
  customerRepository: CustomerRepository;
  listCustomers: ListCustomers;
  createCustomer: CreateCustomer;
  updateCustomer: UpdateCustomer;
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
  listCustomers: asFunction(
    ({ customerRepository }: Dependencies) =>
      new ListCustomers(customerRepository),
  ).singleton(),
  createCustomer: asFunction(
    ({ customerRepository }: Dependencies) =>
      new CreateCustomer(
        customerRepository,
        () => Utilities.getUuid(),
        () => new Date(),
      ),
  ).singleton(),
  updateCustomer: asFunction(
    ({ customerRepository, db }: Dependencies) =>
      new UpdateCustomer(
        customerRepository,
        () => new Date(),
        (work) => db.transaction(work),
      ),
  ).singleton(),
  db: asValue(db),
  auth: asValue(auth),
});

export type DiContainer = typeof container;
