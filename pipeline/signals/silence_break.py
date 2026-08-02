"""Buying-silence signal."""
from __future__ import annotations
import numpy as np

def silence_break(days,median_gap,longest_gap,first_ever=False)->dict:
    if first_ever:return {'gap_multiple':None,'silence_break_score':70.0,'silence_quality':'limited'}
    if days is None:return {'gap_multiple':None,'silence_break_score':0.0,'silence_quality':'limited'}
    multiple=days/median_gap if median_gap and median_gap>0 else None
    score=min(100.0,25+days/365*12+(max(multiple-1,0)*15 if multiple else 0))
    return {'gap_multiple':multiple,'silence_break_score':score,'silence_quality':'high' if median_gap else 'acceptable'}
