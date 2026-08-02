"""Sector-level insider activity aggregation."""
from __future__ import annotations
import pandas as pd
from pipeline.utils.time import utc_now_iso

def build(events,companies):
 if events.empty:return pd.DataFrame(columns=['sector','qualifying_purchase_count','unique_companies','unique_buyers','total_purchase_value','median_conviction','median_behavior_change','cluster_count','eligible_universe_share','quality_summary','generated_at_utc','schema_version'])
 e=events.copy();e['sector']=text_column(e, "sector", "Unclassified").replace('','Unclassified')
 eligible_total=max(1,e[e.get('discovery_eligible',True).astype(bool)]['issuer_cik'].nunique()) if 'discovery_eligible' in e else max(1,e['issuer_cik'].nunique())
 rows=[]
 for sector,g in e.groupby('sector',sort=True):
  rows.append({'sector':sector,'qualifying_purchase_count':len(g),'unique_companies':g['issuer_cik'].nunique(),'unique_buyers':g['insider_id'].nunique(),
  'total_purchase_value':float(g['purchase_value'].fillna(0).sum()),'median_conviction':float(g['conviction_score'].fillna(0).median()),
  'median_behavior_change':float(g['behavior_change_score'].fillna(0).median()),'cluster_count':int((g.get('cluster_score',0).fillna(0)>0).sum()),
  'eligible_universe_share':g['issuer_cik'].nunique()/eligible_total,'quality_summary':'acceptable','generated_at_utc':utc_now_iso(),'schema_version':'v1'})
 return pd.DataFrame(rows).sort_values(['median_conviction','sector'],ascending=[False,True],kind='mergesort').reset_index(drop=True)
from pipeline.rankings.utils import boolean_column, numeric_column, text_column
