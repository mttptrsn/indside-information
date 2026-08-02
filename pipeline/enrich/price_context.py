"""Causal price context and isolated evaluation returns."""
from __future__ import annotations
import numpy as np,pandas as pd

def split_factor_after(prices:pd.DataFrame,event_date:str)->float:
    later=prices[pd.to_datetime(prices['date'])>pd.Timestamp(event_date)]
    splits=pd.to_numeric(later['stock_splits'],errors='coerce').fillna(0);return float(splits[splits>0].prod()) if (splits>0).any() else 1.0

def add_price_context(events:pd.DataFrame,loader)->pd.DataFrame:
    rows=[]
    for event in events.to_dict('records'):
      p=loader(event['ticker'])
      if p is None or p.empty:rows.append({**event,'price_available':False});continue
      p=p.copy();p['date']=pd.to_datetime(p['date']);p=p.sort_values('date');idx=p.index[p['date']>=pd.Timestamp(event['transaction_date'])]
      if len(idx)==0:rows.append({**event,'price_available':False});continue
      i=p.index.get_loc(idx[0]);close=pd.to_numeric(p['close'],errors='coerce');ret=close.pct_change(fill_method=None);vol=ret.rolling(63).std()*np.sqrt(252)
      hist=p.iloc[:i+1];current=float(close.iloc[i]);sf=split_factor_after(p,event['transaction_date'])
      out={**event,'price_available':True,'price_context_date':p.iloc[i]['date'].date().isoformat(),'transaction_date_close':current,
       'prior_session_close':float(close.iloc[i-1]) if i>0 else None,'return_prior_21d':current/float(close.iloc[i-21])-1 if i>=21 else None,
       'return_prior_63d':current/float(close.iloc[i-63])-1 if i>=63 else None,'return_prior_126d':current/float(close.iloc[i-126])-1 if i>=126 else None,
       'drawdown_52w':current/float(hist.tail(252)['high'].max())-1 if len(hist) else None,'drawdown_3y':current/float(hist.tail(756)['high'].max())-1 if len(hist) else None,
       'distance_200d_ma':current/float(close.iloc[max(0,i-199):i+1].mean())-1 if i>=199 else None,'realized_volatility_63d':float(vol.iloc[i]) if pd.notna(vol.iloc[i]) else None,
       'average_dollar_volume_63d':float((close*p['volume']).iloc[max(0,i-62):i+1].mean()),'split_factor_after_event':sf,
       'split_adjusted_shares':float(event['total_shares'])*sf,'split_adjusted_price':float(event['weighted_average_price'])/sf if sf else None}
      for h in [1,5,21,63,126,252]:out[f'evaluation_forward_return_{h}d']=float(close.iloc[i+h]/current-1) if i+h<len(p) else None
      rows.append(out)
    return pd.DataFrame(rows)
