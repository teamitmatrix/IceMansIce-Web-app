const request = require("supertest");
const mongoose = require("mongoose");
const createApp = require("../src/app");
const db = require("../src/db/db");

let app;

beforeAll(async () => {
  await db.connect();
  app = createApp();
});

afterAll(async () => {
  await db.close();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
});

describe("Customer Registration Linking", () => {
  it("should link new user to existing customer by case-insensitive name", async () => {
    // Create customer with name 'John Doe'
    await mongoose.connection.collection('customers').insertOne({
      name: 'John Doe',
      email: '',
      phone: '1234567890',
      address: '123 Main St, City, CA 90210, USA'
    });
    // Register with name 'john doe' (different case)
    const res = await request(app)
      .post("/driver/customers")
      .send({
        name: 'john doe',
        email: 'newuser@example.com',
        password: 'Password123!',
        phone: '1234567890',
        address: {
          street: '123 Main St',
          city: 'City',
          stateZip: 'CA 90210',
          country: 'USA'
        }
      });
    expect(res.body.customer).toBeDefined();
    expect(res.body.linkedExisting).toBe(true);
  });

  it("should link new user to existing customer by normalized phone", async () => {
    await mongoose.connection.collection('customers').insertOne({
      name: 'Jane Smith',
      email: '',
      phone: '+1-234-567-8901',
      address: '456 Elm St, City, NY 10001, USA'
    });
    // Register with phone '2345678901' (no country code, no dashes)
    const res = await request(app)
      .post("/driver/customers")
      .send({
        name: 'Jane Smith',
        email: 'janesmith@example.com',
        password: 'Password123!',
        phone: '2345678901',
        address: {
          street: '456 Elm St',
          city: 'City',
          stateZip: 'NY 10001',
          country: 'USA'
        }
      });
    expect(res.body.customer).toBeDefined();
    expect(res.body.linkedExisting).toBe(true);
  });

  it("should link new user to existing customer by case-insensitive email", async () => {
    await mongoose.connection.collection('customers').insertOne({
      name: 'Sam Lee',
      email: 'SamLee@Example.com',
      phone: '5551234567',
      address: '789 Oak St, City, TX 75001, USA'
    });
    // Register with email 'samlee@example.com' (different case)
    const res = await request(app)
      .post("/driver/customers")
      .send({
        name: 'Sam Lee',
        email: 'samlee@example.com',
        password: 'Password123!',
        phone: '5551234567',
        address: {
          street: '789 Oak St',
          city: 'City',
          stateZip: 'TX 75001',
          country: 'USA'
        }
      });
    expect(res.body.customer).toBeDefined();
    expect(res.body.linkedExisting).toBe(true);
  });

  it("should create new customer if no match found", async () => {
    const res = await request(app)
      .post("/driver/customers")
      .send({
        name: 'New Customer',
        email: 'newcustomer@example.com',
        password: 'Password123!',
        phone: '9998887777',
        address: {
          street: '101 Pine St',
          city: 'City',
          stateZip: 'FL 33101',
          country: 'USA'
        }
      });
    expect(res.body.customer).toBeDefined();
    expect(res.body.linkedExisting).toBe(false);
  });
});
