import { hash } from "../utils/hash";
import prisma from "./client";

export { prisma as client };

export async function getUsers() {
  return prisma.user.findMany();
}

export async function getUser(uid) {
  const user = await prisma.user.findUnique({
    where: {
      id: uid,
    },
  });

  return user;
}

export async function createUser(data) {
  const hashedPw = hash(data.password);
  const user = await prisma.user.create({
    data: { ...data, password: hashedPw },
  });

  const { password, ...rest } = user;
  return rest;
}

export async function updateUser(uid, data = {}) {
  const { password, ...rest } = data;
  const user = await prisma.user.update({
    where: { id: uid },
    data: {
      ...rest,
      ...(password && { password: hash(password) }),
    },
  });

  return user;
}

export async function deleteUser(uid) {
  const user = await prisma.user.delete({
    where: { id: uid },
  });

  return user;
}
