import { buildUser } from "../../utils/generate";
import { verify } from "../../utils/hash";
import * as AuroraDB from "../database";

beforeEach(async () => {
  await AuroraDB.client.user.deleteMany();
});

test("AuroraDB.getUsers", async () => {
  const user = buildUser();
  await AuroraDB.createUser(user);
  const users = await AuroraDB.getUsers();

  expect(users).toBeDefined();
  expect(users).toBeInstanceOf(Array);
  expect(users).toHaveLength(1);
});

test("AuroraDB.getUser", async () => {
  const createdUser = await AuroraDB.createUser(buildUser());
  const user = await AuroraDB.getUser(createdUser.id);

  expect(user).toBeDefined();
  expect(user).toBeInstanceOf(Object);
  expect(user).toEqual(createdUser);
});

test("AuroraDB.getUserByEmail", async () => {
  const createdUser = await AuroraDB.createUser(buildUser());
  const user = await AuroraDB.getUserByEmail(createdUser.email);

  expect(user).toBeDefined();
  expect(user).toBeInstanceOf(Object);
  expect(user).toEqual(createdUser);
});

test("AuroraDB.createUser", async () => {
  const user = buildUser({ id: "FAKE_USER_ID", password: "DUMMY" });
  const createdUser = await AuroraDB.createUser(user);

  expect(createdUser).toBeDefined();
  expect(verify("DUMMY", createdUser.password)).toBe(true);
  expect(createdUser).toEqual({ ...user, password: createdUser.password });
});

test("AuroraDB.updateUser", async () => {
  const user = buildUser({ id: "FAKE_USER_ID", password: "DUMMY" });
  const createdUser = await AuroraDB.createUser(user, user.password);

  expect(createdUser).toBeDefined();

  // It does not update the password
  let updates = buildUser({ id: "FAKE_USER_ID", password: null });
  let updatedUser = await AuroraDB.updateUser(createdUser.id, updates);

  expect(updatedUser).toBeDefined();
  expect(verify("DUMMY", updatedUser.password)).toBe(true);
  expect(updatedUser).toEqual({
    ...updates,
    password: updatedUser.password,
  });

  // Updates also the password
  updates = buildUser({ id: "FAKE_USER_ID", password: "NEW_PASSWORD" });
  updatedUser = await AuroraDB.updateUser(
    createdUser.id,
    { ...updates },
    updates.password
  );

  expect(updatedUser).toBeDefined();
  expect(verify("NEW_PASSWORD", updatedUser.password)).toBe(true);
  expect(updatedUser).toEqual({
    ...updates,
    password: updatedUser.password,
  });
});

test("AuroraDB.deleteUser", async () => {
  const user = buildUser({ id: "FAKE_USER_ID", password: "DUMMY" });
  const createdUser = await AuroraDB.createUser(user);
  const deletedUser = await AuroraDB.deleteUser(createdUser.id);

  expect(deletedUser).toBeDefined();
  expect(deletedUser).toEqual(createdUser);

  // Ensure the user is deleted
  const checkDeletedUser = await AuroraDB.getUser(createdUser.id);
  expect(checkDeletedUser).toBeNull();
});
