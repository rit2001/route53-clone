export type DNSRecordType =
  | "A"
  | "AAAA"
  | "CNAME"
  | "TXT"
  | "MX"
  | "NS"
  | "PTR"
  | "SRV"
  | "CAA"
  | "SOA";

export type CreatableDNSRecordType = Exclude<DNSRecordType, "SOA">;
export type RoutingPolicy = "SIMPLE";
export type DNSRecordSortField =
  | "name"
  | "record_type"
  | "ttl"
  | "created_at"
  | "updated_at";
export type SortOrder = "asc" | "desc";

export type DNSRecord = {
  id: string;
  name: string;
  record_type: DNSRecordType;
  values: string[];
  ttl: number;
  routing_policy: RoutingPolicy;
  alias: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

export type DNSRecordListResponse = {
  items: DNSRecord[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type DNSRecordListParams = {
  search?: string;
  record_type?: DNSRecordType;
  routing_policy?: RoutingPolicy;
  alias?: boolean;
  page: number;
  page_size: number;
  sort_by: DNSRecordSortField;
  sort_order: SortOrder;
};

export type DNSRecordCreateInput = {
  name: string;
  record_type: CreatableDNSRecordType;
  values: string[];
  ttl: number;
  routing_policy: RoutingPolicy;
  alias: false;
};

export type DNSRecordUpdateInput = {
  values: string[];
  ttl: number;
};
