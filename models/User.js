import { bookshelf } from "../lib/db_connect";
import { Website } from "./Website";

export const User = bookshelf.model("User", {
  tableName: "users",

  websites() {
    return this.hasMany(Website);
  },
});
