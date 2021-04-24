import { bookshelf } from "../lib/db_connect";
import { Event } from "./Event";

export const Locale = bookshelf.model("Locale", {
  tableName: "locales",

  events: () => this.hasMany(Event),
});
