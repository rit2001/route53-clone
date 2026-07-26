import { isApiError } from "@/lib/api/errors";

type DNSRecordOperation = "list" | "create" | "update" | "delete";

export function getDNSRecordErrorMessage(
  error: unknown,
  operation: DNSRecordOperation,
): string {
  if (isApiError(error)) {
    if (error.code === "DNS_RECORD_ALREADY_EXISTS") {
      return "A record with this name and type already exists.";
    }
    if (error.code === "CNAME_CONFLICT") {
      return error.message;
    }
    if (error.code === "SYSTEM_RECORD_PROTECTED") {
      return "System-generated NS and SOA records cannot be modified.";
    }
    if (error.code === "ALIAS_NOT_SUPPORTED") {
      return "Alias records are not supported by this assignment.";
    }
    if (error.code === "DNS_RECORD_NOT_FOUND") {
      return "The DNS record may have been deleted or is no longer available.";
    }
    if (error.code === "NETWORK_ERROR") {
      if (operation === "list") {
        return "Unable to load DNS records. Check the API connection and try again.";
      }
      return `The record could not be ${operation === "create" ? "created" : operation === "update" ? "updated" : "deleted"} because the API is unreachable.`;
    }
    return error.message;
  }

  if (operation === "list") {
    return "Unable to load DNS records. Please try again.";
  }
  return `The record could not be ${operation === "create" ? "created" : operation === "update" ? "updated" : "deleted"}. Please try again.`;
}
