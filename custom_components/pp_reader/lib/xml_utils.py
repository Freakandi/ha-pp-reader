"""XML utilities for Portfolio Performance Reader."""

from lxml import etree


def secure_parse_xml(file_path: str) -> etree.ElementTree:
    """
    Securely parses an XML file, disabling external entities to prevent XXE attacks.

    Args:
        file_path: Path to the XML file.

    Returns:
        The parsed ElementTree.

    Raises:
        etree.XMLSyntaxError: If the XML is invalid or malicious.

    """
    # Create a parser that forbids network access and entity resolution
    # resolve_entities=False prevents XXE
    # no_network=True is a fallback defense
    # huge_tree=False (default) prevents billion laughs DoS
    parser = etree.XMLParser(
        resolve_entities=False,
        no_network=True,
    )
    return etree.parse(file_path, parser)
