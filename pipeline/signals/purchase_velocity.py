"""Causal rolling purchase velocity."""
from __future__ import annotations
import numpy as np,pandas as pd

def velocity(current_date,prior_events,current_value)->dict:
    now=pd.Timestamp(current_date);windows={}
    for d in [30,90,180]:
      vals=[float(x['purchase_value']) for x in prior_events if pd.Timestamp(x['transaction_date'])>=now-pd.Timedelta(days=d)]
      windows[f'purchase_value_{d}d']=sum(vals)+current_value;windows[f'purchase_count_{d}d']=len(vals)+1
    prior90=[]
    for event in prior_events:
      end=pd.Timestamp(event['transaction_date']); prior90.append(sum(float(x['purchase_value']) for x in prior_events if end-pd.Timedelta(days=90)<=pd.Timestamp(x['transaction_date'])<=end))
    med=float(np.median(prior90)) if prior90 else None;multiple=windows['purchase_value_90d']/med if med else None
    windows.update({'velocity_multiple':multiple,'velocity_score':min(100.0,40+(multiple or 0)*15),'velocity_quality':'high' if len(prior_events)>=3 else 'limited'});return windows
