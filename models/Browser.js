import { bookshelf } from "../lib/db_connect";
import { Event } from "./Event";

export const Browser = bookshelf.model("Browser", {
  tableName: "browsers",

  events: () => this.hasMany(Event),
});
