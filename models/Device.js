import { bookshelf } from "../lib/db_connect";
import { Event } from "./Event";

export const Device = bookshelf.model("Device", {
  tableName: "devices",

  events: () => this.hasMany(Event),
});
