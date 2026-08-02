"""Robust purchase abnormality."""
from __future__ import annotations
import numpy as np,pandas as pd

def abnormality(row,prior_values)->dict:
    vals=np.asarray([v for v in prior_values if pd.notna(v) and v>0],float);current=float(row['purchase_value'])
    if len(vals)==0:return {'purchase_multiple':None,'largest_prior_multiple':None,'historical_percentile':None,'robust_z':None,'robust_z_display':None,'abnormality_score':60.0,'abnormality_quality':'limited','first_ever_purchase':True}
    med=float(np.median(vals));largest=float(vals.max());logs=np.log1p(vals);mad=float(np.median(np.abs(logs-np.median(logs))))
    rz=(np.log1p(current)-np.median(logs))/(1.4826*mad) if mad>0 else (10.0 if current>med else 0.0)
    pct=float((vals<current).sum()/len(vals)*100);score=float(np.clip(.45*pct+35*np.clip(current/med/10,0,1)+20*np.clip(max(rz,0)/5,0,1),0,100))
    return {'purchase_multiple':current/med,'largest_prior_multiple':current/largest,'historical_percentile':pct,'robust_z':float(rz),'robust_z_display':float(np.clip(rz,-10,10)),'abnormality_score':score,'abnormality_quality':'high' if len(vals)>=3 else 'acceptable','first_ever_purchase':False}
