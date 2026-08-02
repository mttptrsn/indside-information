"""Group transaction lots into events and nearby events into campaigns."""
from __future__ import annotations
import json,pandas as pd
from pipeline.contracts.validation import config_dir,load_json
from pipeline.normalize.common import stable_id
from pipeline.enrich.ownership import ownership_metrics

def build_purchase_events(tx:pd.DataFrame)->pd.DataFrame:
    q=tx[tx['is_qualifying_purchase'].astype(str).str.lower().isin({'true','1'})].copy()
    if q.empty:return pd.DataFrame()
    keys=['issuer_cik','owner_cik','insider_id','ticker','transaction_date','security_title','direct_indirect_code','accession_number']
    rows=[]
    for key,g in q.groupby(keys,dropna=False,sort=True):
      shares=pd.to_numeric(g['shares'],errors='coerce').sum();value=pd.to_numeric(g['reported_value'],errors='coerce').sum()
      after=pd.to_numeric(g['shares_owned_after'],errors='coerce').max();own=ownership_metrics(shares,after,key[6])
      roles=sorted(set('|'.join(g['normalized_roles'].fillna('')).split('|'))-{''})
      rows.append({'schema_version':'v1','event_id':stable_id(*key),'issuer_cik':key[0],'owner_cik':key[1],'insider_id':key[2],
       'ticker':key[3],'transaction_date':key[4],'filing_date':g['filing_date'].max(),'security_title':key[5],
       'direct_indirect_code':key[6],'accession_number':key[7],'total_shares':shares,'purchase_value':value,
       'weighted_average_price':value/shares if shares else None,'lot_count':len(g),'reported_holdings_after':after,
       **own,'normalized_roles':'|'.join(roles),'footnotes':'|'.join(sorted(set(g['footnotes'].fillna(''))- {''})),
       'event_quality':'high' if g['quality'].eq('high').all() else 'acceptable'})
    return pd.DataFrame(rows).sort_values(['transaction_date','issuer_cik','insider_id']).reset_index(drop=True)

def build_purchase_campaigns(events:pd.DataFrame,gap_days:int|None=None)->pd.DataFrame:
    if events.empty:return pd.DataFrame()
    gap_days=gap_days or load_json(config_dir()/'scoring.json')['purchase_campaign_gap_trading_days'];rows=[]
    for _,g in events.sort_values('transaction_date').groupby(['issuer_cik','insider_id','ticker'],sort=True):
      current=[];last=None
      for row in g.to_dict('records'):
        day=pd.Timestamp(row['transaction_date'])
        if last is not None and len(pd.bdate_range(last,day))-1>gap_days:
          rows.append(_campaign(current)) ; current=[]
        current.append(row);last=day
      if current:rows.append(_campaign(current))
    return pd.DataFrame(rows).sort_values(['start_date','issuer_cik','insider_id']).reset_index(drop=True)

def _campaign(items):
    return {'schema_version':'v1','campaign_id':stable_id(*[x['event_id'] for x in items]),'issuer_cik':items[0]['issuer_cik'],
     'insider_id':items[0]['insider_id'],'ticker':items[0]['ticker'],'start_date':items[0]['transaction_date'],
     'end_date':items[-1]['transaction_date'],'event_ids':'|'.join(x['event_id'] for x in items),
     'purchase_value':sum(float(x['purchase_value']) for x in items),'total_shares':sum(float(x['total_shares']) for x in items),'event_count':len(items)}
