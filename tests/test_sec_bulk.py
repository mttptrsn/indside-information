from pipeline.ingest.sec_bulk import (
    DATASET_PAGE_URL,
    archive_url,
    discover_archives,
    parse_archive_links,
)


SAMPLE_PAGE = """
<a href="/files/structureddata/data/insider-transactions-data-sets/2026q2_form345.zip">
  2026 Q2 345
</a>
<a href="/files/structureddata/data/insider-transactions-data-sets/2026q1_form345.zip">
  2026 Q1 345
</a>
<a href="/files/structureddata/data/insider-transactions-data-sets/2025q4_form345.zip">
  2025 Q4 345
</a>
"""


class Response:
    text = SAMPLE_PAGE


class Client:
    def __init__(self):
        self.requested = []

    def get(self, url):
        self.requested.append(url)
        return Response()


def test_archive_url_uses_current_structureddata_path():
    assert archive_url(2026, 2) == (
        "https://www.sec.gov/files/structureddata/data/"
        "insider-transactions-data-sets/2026q2_form345.zip"
    )


def test_parse_archive_links_uses_only_published_links():
    archives = parse_archive_links(SAMPLE_PAGE)
    assert [(item.year, item.quarter) for item in archives] == [
        (2025, 4),
        (2026, 1),
        (2026, 2),
    ]
    assert all("/files/structureddata/data/" in item.url for item in archives)


def test_discovery_filters_start_year_and_does_not_invent_current_quarter():
    client = Client()
    archives = discover_archives(2026, client)
    assert client.requested == [DATASET_PAGE_URL]
    assert [(item.year, item.quarter) for item in archives] == [
        (2026, 1),
        (2026, 2),
    ]
    assert not any(item.quarter == 3 for item in archives)
