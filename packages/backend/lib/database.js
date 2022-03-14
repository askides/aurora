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

export async function getUserByEmail(email) {
  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  return user;
}

export async function createUser(data) {
  const hashedPw = hash(data.password);
  const user = await prisma.user.create({
    data: { ...data, password: hashedPw },
  });

  return user;
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

export async function getUserWebsites(uid) {
  return prisma.website.findMany({
    where: {
      user_id: uid,
    },
  });
}

export async function getWebsite(wid) {
  return prisma.website.findUnique({
    where: {
      id: wid,
    },
  });
}

export async function createWebsite(data) {
  const website = await prisma.website.create({
    data: { ...data },
  });

  return website;
}

export async function updateWebsite(wid, data = {}) {
  const website = await prisma.website.update({
    where: { id: wid },
    data: { ...data },
  });

  return website;
}

export async function deleteWebsite(wid) {
  const website = await prisma.website.delete({
    where: { id: wid },
  });

  return website;
}
