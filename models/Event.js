import { bookshelf } from "../lib/db_connect";
import { Website } from "./Website";

export const Event = bookshelf.model("Event", {
  tableName: "events",

  website() {
    return this.belongsTo(Website);
  },
});
