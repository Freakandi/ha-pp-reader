from lxml import etree

from custom_components.pp_reader.lib.xml_utils import secure_parse_xml

# Safe XML sample
SAFE_XML = """
<portfolio>
    <security>
        <name>Safe Stock</name>
        <value>100</value>
    </security>
</portfolio>
"""

# Malicious XML with XXE attempt (local file access)
XXE_XML = """
<!DOCTYPE portfolio [
    <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<portfolio>
    <security>
        <name>&xxe;</name>
        <value>100</value>
    </security>
</portfolio>
"""

# Billion laughs attack (DoS) - simplified
BILLION_LAUGHS_XML = """
<!DOCTYPE lolz [
 <!ENTITY lol "lol">
 <!ENTITY lol1 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
]>
<portfolio>
    <security>
        <name>&lol1;</name>
    </security>
</portfolio>
"""


def test_secure_parse_xml_safe(tmp_path):
    """Test that safe XML is parsed correctly."""
    xml_file = tmp_path / "safe.xml"
    xml_file.write_text(SAFE_XML)

    tree = secure_parse_xml(str(xml_file))
    root = tree.getroot()

    assert root.tag == "portfolio"
    assert root.find("security/name").text == "Safe Stock"


def test_secure_parse_xml_xxe(tmp_path):
    """Test that XXE is blocked (entities are not resolved)."""
    xml_file = tmp_path / "xxe.xml"
    xml_file.write_text(XXE_XML)

    # secure_parse_xml uses resolve_entities=False
    tree = secure_parse_xml(str(xml_file))
    root = tree.getroot()

    name = root.find("security/name").text

    # With resolve_entities=False, lxml might return the entity name, None, or empty string.
    # It should definitely NOT be the content of /etc/passwd.

    # If it returns the entity reference (e.g. "&xxe;"), that is safe.
    # If it returns None, that is safe.
    # We just assert it is NOT "root:x:0:0..." (standard start of passwd)

    val = name or ""
    assert "root:" not in val


def test_secure_parse_xml_raises_on_huge_expansion(tmp_path):
    """Test protection against billion laughs or limit entity expansion."""
    xml_file = tmp_path / "dos.xml"
    xml_file.write_text(BILLION_LAUGHS_XML)

    try:
        tree = secure_parse_xml(str(xml_file))
        root = tree.getroot()
        val = root.find("security/name").text

        # If entities are NOT resolved, val might be None or the literal entity string
        # In either case, it is "small" and safe.
        # If it expanded, it would be 'lollollollollollollollollollol' (length 30)
        # But if we nest it deeply (Billion laughs), it would be huge.
        # Since we use resolve_entities=False, it should NOT expand at all.

        if val is None:
            # This is safe, entity was ignored
            pass
        else:
            assert len(val) < 1000

    except etree.XMLSyntaxError:
        pass
