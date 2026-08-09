
export interface TimeEntry {
  id: string;
  start: number;
  end: number | null;
  client: string;
  activity: string;
}
