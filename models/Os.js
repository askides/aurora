import { bookshelf } from "../lib/db_connect";
import { Event } from "./Event";

export const Os = bookshelf.model("Os", {
  tableName: "oses",

  events: () => this.hasMany(Event),
});
