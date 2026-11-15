import { CreateInquiry } from "../application/CreateInquiry";
import { ListInquiries } from "../application/ListInquiries";
import { ListInquiryDetail } from "../application/ListInquiryDetail";
import { UpdateInquiry } from "../application/UpdateInquiry";
import type { InquiryRepository } from "../application/InquiryRepository";
import { SheetInquiryRepository } from "../infrastructure/SheetInquiryRepository";
import { ListCustomers } from "../application/ListCustomers";
import { CreateCustomer } from "../application/CreateCustomer";
import { UpdateCustomer } from "../application/UpdateCustomer";
import type { CustomerRepository } from "../application/CustomerRepository";
import { SheetCustomerRepository } from "../infrastructure/SheetCustomerRepository";
import { asFunction, asValue, createContainer, InjectionMode } from "awilix";
import { auth, repository as authRepository } from "./auth";
import { db } from "./db";

type Dependencies = {
  inquiryRepository: InquiryRepository;
  createInquiry: CreateInquiry;
  listInquiries: ListInquiries;
  listInquiryDetail: ListInquiryDetail;
  updateInquiry: UpdateInquiry;
  customerRepository: CustomerRepository;
  listCustomers: ListCustomers;
  createCustomer: CreateCustomer;
  updateCustomer: UpdateCustomer;
  db: typeof db;
  auth: typeof auth;
  authRepository: typeof authRepository;
};

export const container = createContainer<Dependencies>({
  injectionMode: InjectionMode.PROXY,
});

container.register({
  inquiryRepository: asFunction(
    ({ db }: Dependencies) => new SheetInquiryRepository(db),
  ).singleton(),
  createInquiry: asFunction(
    ({ inquiryRepository, customerRepository, db }: Dependencies) =>
      new CreateInquiry(
        inquiryRepository,
        customerRepository,
        () => Utilities.getUuid(),
        () => new Date(),
        (work) => db.transaction(work),
      ),
  ).singleton(),
  listInquiries: asFunction(
    ({ inquiryRepository, customerRepository }: Dependencies) =>
      new ListInquiries(inquiryRepository, customerRepository),
  ).singleton(),
  listInquiryDetail: asFunction(
    ({ inquiryRepository, customerRepository, authRepository }: Dependencies) =>
      new ListInquiryDetail(
        inquiryRepository,
        customerRepository,
        authRepository.user,
      ),
  ).singleton(),
  updateInquiry: asFunction(
    ({ inquiryRepository, customerRepository, db }: Dependencies) =>
      new UpdateInquiry(
        inquiryRepository,
        customerRepository,
        () => new Date(),
        (work) => db.transaction(work),
      ),
  ).singleton(),
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
  authRepository: asValue(authRepository),
});

export type DiContainer = typeof container;
