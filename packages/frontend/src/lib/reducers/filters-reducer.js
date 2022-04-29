import { subDays } from "date-fns";

export function filtersReducer(state, action) {
  switch (action.type) {
    case "LAST_24_HOURS":
      return {
        ...state,
        start: subDays(new Date(), 1).getTime(),
        end: new Date().getTime(),
        unit: "hour",
      };

    case "LAST_7_DAYS":
      return {
        ...state,
        // start: subDays(new Date(), 5).getTime(),
        // end: addDays(new Date(), 1).getTime(),
        start: subDays(new Date(), 6).getTime(),
        end: new Date().getTime(),
        unit: "day",
      };

    case "LAST_30_DAYS":
      return {
        ...state,
        // start: subDays(new Date(), 28).getTime(),
        // end: addDays(new Date(), 1).getTime(),
        start: subDays(new Date(), 29).getTime(),
        end: new Date().getTime(),
        unit: "day",
      };

    default:
      return state;
  }
}
