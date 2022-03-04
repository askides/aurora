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
