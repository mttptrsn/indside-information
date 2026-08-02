"""Purchase-value and frequency acceleration."""
from __future__ import annotations
import numpy as np,pandas as pd

def acceleration(events,min_events=3)->dict:
    if len(events)<min_events:return {'value_acceleration':None,'frequency_acceleration':None,'acceleration_score':0.0,'acceleration_sample_count':len(events),'acceleration_quality':'limited'}
    vals=np.log1p([float(x['purchase_value']) for x in events]);slope=float(np.polyfit(np.arange(len(vals)),vals,1)[0]);dates=[pd.Timestamp(x['transaction_date']) for x in events]
    gaps=np.diff([d.value for d in dates])/86400e9;freq=float((gaps[0]-gaps[-1])/max(gaps[0],1)) if len(gaps)>1 else 0.0
    score=float(np.clip(50+slope*25+freq*25,0,100));return {'value_acceleration':slope,'frequency_acceleration':freq,'acceleration_score':score,'acceleration_sample_count':len(events),'acceleration_quality':'high'}
