import re

from app.models.enums import DNSRecordType, RoutingPolicy
from app.services.system_records import (
    NS_TTL,
    SOA_TTL,
    generate_name_servers,
    generate_public_zone_system_records,
)

NAME_SERVER_PATTERN = re.compile(
    r"^ns-\d+\.mockdns-\d+\.route53-clone\.invalid\.$"
)


def test_name_servers_are_unique_deterministic_mock_hostnames() -> None:
    zone_id = "Z0123456789ABCDEFGHIJ"
    first_result = generate_name_servers(zone_id)
    second_result = generate_name_servers(zone_id)

    assert len(first_result) == 4
    assert len(set(first_result)) == 4
    assert first_result == second_result
    assert all(NAME_SERVER_PATTERN.fullmatch(value) for value in first_result)
    assert all(value.endswith(".") for value in first_result)


def test_public_system_records_have_expected_soa_and_persistence_fields() -> None:
    zone_id = "Z0123456789ABCDEFGHIJ"
    ns_record, soa_record = generate_public_zone_system_records(
        zone_id,
        "example.com.",
    )

    assert ns_record.record_type is DNSRecordType.NS
    assert ns_record.ttl == NS_TTL == 172_800
    assert len(ns_record.values) == 4
    assert soa_record.record_type is DNSRecordType.SOA
    assert soa_record.ttl == SOA_TTL == 900
    assert len(soa_record.values) == 1
    soa_fields = soa_record.values[0].split()
    assert len(soa_fields) == 7
    assert soa_fields[0] == ns_record.values[0]
    assert soa_fields[1] == "hostmaster.route53-clone.invalid."

    for record in (ns_record, soa_record):
        assert record.hosted_zone_id == zone_id
        assert record.name == "example.com."
        assert record.routing_policy is RoutingPolicy.SIMPLE
        assert record.alias is False
        assert record.is_system is True
