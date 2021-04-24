import { bookshelf } from "../lib/db_connect";
import { Browser } from "./Browser";
import { Device } from "./Device";
import { Engine } from "./Engine";
import { Locale } from "./Locale";
import { Os } from "./Os";
import { Website } from "./Website";

export const Event = bookshelf.model("Event", {
  tableName: "events",

  os: () => this.belongsTo(Os),
  device: () => this.belongsTo(Device),
  engine: () => this.belongsTo(Engine),
  locale: () => this.belongsTo(Locale),
  website: () => this.belongsTo(Website),
  browser: () => this.belongsTo(Browser),
});
