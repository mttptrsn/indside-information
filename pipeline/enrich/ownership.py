"""Ownership change calculations."""
from __future__ import annotations
import math

def ownership_metrics(acquired:float|None,after:float|None,direct_indirect:str)->dict:
    if acquired is None or after is None:return {'holdings_before':None,'ownership_increase_percent':None,'first_reported_position':False,'ambiguous_ownership':True}
    before=after-acquired
    pct=None if before<0 else (100.0 if before==0 and acquired>0 else (acquired/before*100 if before else 0.0))
    return {'holdings_before':before,'ownership_increase_percent':pct,'first_reported_position':before==0 and acquired>0,'ambiguous_ownership':direct_indirect not in {'D','I'}}
