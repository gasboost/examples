export type CustomerDetails = {
  name: string;
  email?: string;
  phone?: string;
  note?: string;
};

export class Customer {
  readonly id: string;
  readonly name: string;
  readonly email: string | undefined;
  readonly phone: string | undefined;
  readonly note: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(
    attributes: CustomerDetails & {
      id: string;
      createdAt: Date;
      updatedAt: Date;
    },
  ) {
    this.id = attributes.id;
    this.name = attributes.name;
    this.email = attributes.email;
    this.phone = attributes.phone;
    this.note = attributes.note;
    this.createdAt = attributes.createdAt;
    this.updatedAt = attributes.updatedAt;
  }

  update(details: Partial<CustomerDetails>, now: Date) {
    return new Customer({
      id: this.id,
      name: details.name === undefined ? this.name : details.name,
      email: details.email === undefined ? this.email : details.email,
      phone: details.phone === undefined ? this.phone : details.phone,
      note: details.note === undefined ? this.note : details.note,
      createdAt: this.createdAt,
      updatedAt: now,
    });
  }
}
