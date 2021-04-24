import { bookshelf } from "../lib/db_connect";
import { Event } from "./Event";

export const Engine = bookshelf.model("Engine", {
  tableName: "engines",

  events: () => this.hasMany(Event),
});
