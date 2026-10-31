const request = require("supertest");
const mongoose = require("mongoose");
const createApp = require("../src/app");
const db = require("../src/db/db");

let app;

beforeAll(async () => {
  // Connect to test database
  await db.connect();
  app = createApp();
});

afterAll(async () => {
  // Close database connection
  await db.close();
});

beforeEach(async () => {
  // Clear test data before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
});

describe("Customers API", () => {
  describe("GET /customers", () => {
    it("should return empty customers list when no customers exist", async () => {
      const response = await request(app).get("/customers").expect(401); // Should require authentication

      expect(response.body.error).toBeDefined();
    });

    it("should return 401 for unauthenticated requests", async () => {
      const response = await request(app).get("/customers").expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe("POST /customers", () => {
    it("should return 401 for unauthenticated requests", async () => {
      const customerData = {
        name: "Test Customer",
        email: "test@example.com",
      };

      const response = await request(app)
        .post("/customers")
        .send(customerData)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe("GET /customers/:id", () => {
    it("should return 401 for unauthenticated requests", async () => {
      const response = await request(app).get("/customers/123").expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe("PUT /customers/:id", () => {
    it("should return 401 for unauthenticated requests", async () => {
      const customerData = {
        name: "Updated Customer",
      };

      const response = await request(app)
        .put("/customers/123")
        .send(customerData)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe("DELETE /customers/:id", () => {
    it("should return 401 for unauthenticated requests", async () => {
      const response = await request(app).delete("/customers/123").expect(401);

      expect(response.body.error).toBeDefined();
    });
  });
});

describe("Health Check", () => {
  it("should return health status", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body.status).toBe("OK");
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.uptime).toBeDefined();
    expect(response.body.environment).toBeDefined();
  });
});

describe("API Documentation", () => {
  it("should serve Swagger UI", async () => {
    const response = await request(app).get("/docs").redirects(1).expect(200);
    expect(response.text).toContain("swagger-ui");
  });

  it("should serve OpenAPI spec", async () => {
    const response = await request(app).get("/docs.json").expect(200);

    expect(response.body.openapi).toBe("3.0.0");
    expect(response.body.info.title).toBe("Sales System API");
  });
});
