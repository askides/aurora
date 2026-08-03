/**
 * Shapes shared between loaders and components. Kept out of the .server modules
 * so client components can import them without reaching into server-only code.
 */

export type BreakdownRow = { element: string; views: number; unique: number };

export type TimeseriesPoint = { timeseries: string; count: number };

export type Statistics = {
  visits: number;
  uniqueVisits: number;
  bounces: number;
  sessions: number;
  avgDuration: number;
};

export type Website = {
  id: string;
  name: string;
  url: string;
  is_public: boolean;
  user_id: string;
  created_at: Date;
  updated_at: Date;
};
