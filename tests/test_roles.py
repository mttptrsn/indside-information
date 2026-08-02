from pipeline.normalize.roles import normalize_roles

def test_founder_ceo_director_combined():
    roles=normalize_roles("Founder, President and CEO",{"is_director":True,"is_officer":True})
    assert {"founder","president","ceo","operating_executive","director"}.issubset(set(roles))

def test_other_officer_fallback():
    assert "other_officer" in normalize_roles("Vice President",{"is_officer":True})
