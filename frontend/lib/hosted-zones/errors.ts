import { isApiError } from "@/lib/api/errors";

type HostedZoneOperation = "list" | "create" | "update" | "delete" | "detail";

export function getHostedZoneErrorMessage(
  error: unknown,
  operation: HostedZoneOperation,
): string {
  if (isApiError(error)) {
    if (error.code === "HOSTED_ZONE_ALREADY_EXISTS") {
      return "A hosted zone with this name and type already exists.";
    }
    if (error.code === "HOSTED_ZONE_NOT_FOUND") {
      return "The hosted zone may have been deleted or is not available to this account.";
    }
    if (error.code === "NETWORK_ERROR") {
      if (operation === "list" || operation === "detail") {
        return `Unable to load hosted zone${operation === "list" ? "s" : ""}. Check the backend connection and try again.`;
      }
      return `The hosted zone could not be ${operation === "create" ? "created" : operation === "update" ? "updated" : "deleted"} because the API is unreachable.`;
    }
    if (error.code === "VALIDATION_ERROR") {
      return error.message;
    }
    return error.message;
  }

  return `The hosted zone could not be ${operation === "list" || operation === "detail" ? "loaded" : operation === "create" ? "created" : operation === "update" ? "updated" : "deleted"}. Please try again.`;
}
