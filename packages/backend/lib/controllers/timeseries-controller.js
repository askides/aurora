import { addMinutes, eachDayOfInterval, eachHourOfInterval } from "date-fns";
import Joi from "joi";
import * as AuroraDB from "../database";
import { authentication } from "../middleware/authentication";
import { Controller } from "./controller";

export function getTzOffset(timeZone, date = new Date()) {
  const tz = date
    .toLocaleString("en", {
      timeZone,
      timeStyle: "long",
    })
    .split(" ")
    .slice(-1)[0];

  const dateString = date.toString();

  const offset =
    Date.parse(`${dateString} UTC`) - Date.parse(`${dateString} ${tz}`);

  // return UTC offset in minutes
  return offset / 1000 / 60;
}

export function switchTz(date, tz) {
  return addMinutes(date, getTzOffset(tz));
}

const interval = (startTs, endTs, unit, tz) => {
  const start = new Date(Number(startTs));
  const end = new Date(Number(endTs));

  switch (unit) {
    case "hour":
      const int = eachHourOfInterval({ start, end });
      return int.map((date) => switchTz(date, tz));
    case "day":
      return eachDayOfInterval({ start, end });
    default:
      throw new Error(`Invalid unit: ${unit}`);
  }
};

export class TimeseriesController extends Controller {
  async index() {
    const { id } = this.req.query;
    const website = await AuroraDB.getWebsite(id);

    if (!website) {
      this.abort(404);
    }

    if (!website.is_public) {
      await authentication(this.req, this.res);

      if (this.req.user.id !== website.user_id) {
        this.abort(403);
      }
    }

    const rules = Joi.object({
      start: Joi.string().required(),
      end: Joi.string().required(),
      unit: Joi.string().required().valid("hour", "day", "month", "year"),
      tz: Joi.string().required(),
    });

    this.validate(this.req.query, rules);

    const filters = {
      start: this.req.query.start,
      end: this.req.query.end,
      unit: this.req.query.unit,
      tz: this.req.query.tz || "UTC",
    };

    let data = await AuroraDB.getWebsiteViewsTimeSeries(id, filters);

    // Convert the ts into an ISO string
    data = data.map((row) => {
      const isoDate = new Date(row.ts).toISOString();
      return { ...row, ts: isoDate };
    });

    let int = interval(filters.start, filters.end, filters.unit, filters.tz);

    // Convert the date into an ISO string
    int = int.map((date) => date.toISOString());

    const setTimeToZero = (date) => {
      const [withoutTime] = date.split("T");
      return `${withoutTime}T00:00:00.000Z`;
    };

    if (filters.unit !== "hour") {
      data = data.map((row) => {
        const dateWithoutTime = setTimeToZero(row.ts);
        return { ...row, ts: dateWithoutTime };
      });

      int = int.map((date) => setTimeToZero(date));
    }

    const timeseries = int.map((element) => {
      const views = data.find((row) => {
        return row.ts === element;
      });

      return {
        timeseries: element,
        count: views ? views.count : 0,
      };
    });

    return this.res.status(200).json(timeseries);
  }
}
