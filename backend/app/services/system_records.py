from hashlib import sha256

from app.models.dns_record import DNSRecord
from app.models.enums import DNSRecordType, RoutingPolicy

NS_TTL = 172_800
SOA_TTL = 900
SOA_SERIAL = 1
SOA_REFRESH = 7_200
SOA_RETRY = 900
SOA_EXPIRE = 1_209_600
SOA_MINIMUM = 86_400
MOCKED_HOSTMASTER = "hostmaster.route53-clone.invalid."


def generate_name_servers(hosted_zone_id: str) -> list[str]:
    """Derive stable, clearly mocked name servers from a hosted-zone ID."""
    values: list[str] = []
    for index in range(4):
        digest = sha256(f"{hosted_zone_id}:{index}".encode()).digest()
        server_number = (
            int.from_bytes(digest[:2], "big") % 512 + 1 + (index * 512)
        )
        shard_number = digest[2] % 64 + 1
        values.append(
            f"ns-{server_number}.mockdns-{shard_number}."
            "route53-clone.invalid."
        )
    return values


def generate_public_zone_system_records(
    hosted_zone_id: str,
    zone_name: str,
) -> tuple[DNSRecord, DNSRecord]:
    name_servers = generate_name_servers(hosted_zone_id)
    soa_value = " ".join(
        (
            name_servers[0],
            MOCKED_HOSTMASTER,
            str(SOA_SERIAL),
            str(SOA_REFRESH),
            str(SOA_RETRY),
            str(SOA_EXPIRE),
            str(SOA_MINIMUM),
        )
    )
    common_fields = {
        "hosted_zone_id": hosted_zone_id,
        "name": zone_name,
        "routing_policy": RoutingPolicy.SIMPLE,
        "alias": False,
        "is_system": True,
    }
    return (
        DNSRecord(
            record_type=DNSRecordType.NS,
            values=name_servers,
            ttl=NS_TTL,
            **common_fields,
        ),
        DNSRecord(
            record_type=DNSRecordType.SOA,
            values=[soa_value],
            ttl=SOA_TTL,
            **common_fields,
        ),
    )
