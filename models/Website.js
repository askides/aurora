import { bookshelf } from "../lib/db_connect";
import { User } from "./User";

export const Website = bookshelf.model("Website", {
  tableName: "websites",

  user() {
    return this.belongsTo(User);
  },
});
