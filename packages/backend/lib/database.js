import { hash } from "../lib/utils/hash";
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

export async function getWebsiteViewsByPage(wid, filters = {}) {
  const { start, end } = filters;

  const formattedDate = (date) => {
    return new Date(Number(date)).toISOString();
  };

  const data = await prisma.event.findMany({
    where: {
      type: "pageView",
      website_id: wid,
      created_at: {
        ...(start && { gte: formattedDate(start) }),
        ...(end && { lte: formattedDate(end) }),
      },
    },
  });

  return data;
}

export async function getWebsiteViewsByMetadata(
  wid,
  metadata = "os",
  filters = {}
) {
  const { start, end } = filters;

  const formattedDate = (date) => {
    return new Date(Number(date)).toISOString();
  };

  const data = await prisma.metadata.findMany({
    include: {
      events: {
        where: {
          website_id: wid,
          created_at: {
            ...(start && { gte: formattedDate(start) }),
            ...(end && { lte: formattedDate(end) }),
          },
        },
      },
    },
    where: {
      type: metadata,
      events: {
        some: {
          website_id: wid,
          created_at: {
            ...(start && { gte: formattedDate(start) }),
            ...(end && { lte: formattedDate(end) }),
          },
        },
      },
    },
  });

  return data;
}

// TODO: Maybe split this into separate functions?
export async function getWebsiteStatistics(wid, filters = {}) {
  const { start, end } = filters;

  const formattedDate = (date) => {
    return new Date(Number(date)).toISOString();
  };

  const avgDuration = await prisma.event.aggregate({
    _avg: {
      duration: true,
    },
    where: {
      website_id: wid,
      created_at: {
        ...(start && { gte: formattedDate(filters.start) }),
        ...(end && { lte: formattedDate(filters.end) }),
      },
    },
  });

  const visits = await prisma.event.aggregate({
    _count: {
      _all: true,
    },
    where: {
      website_id: wid,
      created_at: {
        ...(start && { gte: formattedDate(filters.start) }),
        ...(end && { lte: formattedDate(filters.end) }),
      },
    },
  });

  const sessions = await prisma.event.aggregate({
    _count: {
      _all: true,
    },
    where: {
      website_id: wid,
      is_new_session: true,
      created_at: {
        ...(start && { gte: formattedDate(filters.start) }),
        ...(end && { lte: formattedDate(filters.end) }),
      },
    },
  });

  const uniqueVisits = await prisma.event.aggregate({
    _count: {
      _all: true,
    },
    where: {
      website_id: wid,
      is_new_visitor: true,
      created_at: {
        ...(start && { gte: formattedDate(filters.start) }),
        ...(end && { lte: formattedDate(filters.end) }),
      },
    },
  });

  const bounces = await prisma.event.aggregate({
    _count: {
      _all: true,
    },
    where: {
      website_id: wid,
      is_a_bounce: true,
      created_at: {
        ...(start && { gte: formattedDate(filters.start) }),
        ...(end && { lte: formattedDate(filters.end) }),
      },
    },
  });

  return {
    visits,
    bounces,
    sessions,
    avgDuration,
    uniqueVisits,
  };
}

export async function getWebsiteViewsTimeSeries(wid, filters = {}) {
  const { start, end, unit, tz } = filters;

  const formattedDate = (date) => new Date(Number(date)).toISOString();

  const sql = `
    SELECT date_trunc('${unit}', created_at AT TIME ZONE '${tz}') as ts, count(*)
    FROM events
    WHERE
      website_id = '${wid}'
    AND
      created_at BETWEEN '${formattedDate(start)}' AND '${formattedDate(end)}'
    GROUP BY ts
  `;

  const rows = await prisma.$queryRawUnsafe(sql);

  return rows;
}
