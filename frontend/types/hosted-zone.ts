export type HostedZoneType = "PUBLIC" | "PRIVATE";
export type HostedZoneSortField =
  | "name"
  | "zone_type"
  | "created_at"
  | "updated_at";
export type SortOrder = "asc" | "desc";

export type HostedZoneListItem = {
  id: string;
  name: string;
  comment: string | null;
  zone_type: HostedZoneType;
  record_count: number;
  created_at: string;
  updated_at: string;
};

export type HostedZoneDetail = HostedZoneListItem & {
  name_servers: string[];
};

export type HostedZoneListResponse = {
  items: HostedZoneListItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type HostedZoneCreateInput = {
  name: string;
  comment?: string | null;
  zone_type: HostedZoneType;
};

export type HostedZoneUpdateInput = {
  comment: string | null;
};

export type HostedZoneListParams = {
  search?: string;
  zone_type?: HostedZoneType;
  page: number;
  page_size: number;
  sort_by: HostedZoneSortField;
  sort_order: SortOrder;
};
