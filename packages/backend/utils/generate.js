import { faker } from "@faker-js/faker";

export const buildReq = (overrides) => {
  const req = {
    body: {},
    query: {},
    cookies: {},
    ...overrides,
  };

  return req;
};

export const buildRes = (overrides) => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    ...overrides,
  };

  return res;
};

export const buildUser = (overrides) => {
  const user = {
    firstname: faker.name.firstName(),
    lastname: faker.name.lastName(),
    email: faker.internet.email(),
    password: faker.internet.password(),
    created_at: faker.date.past(),
    updated_at: faker.date.recent(),
    ...overrides,
  };

  return user;
};

export const buildWebsite = (overrides) => {
  const website = {
    name: faker.company.companyName(),
    url: faker.internet.url(),
    is_public: faker.random.boolean(),
    user_id: faker.random.number(),
    created_at: faker.date.past(),
    updated_at: faker.date.recent(),
    ...overrides,
  };

  return website;
};
