"""Deterministic ranking construction and history persistence."""
from __future__ import annotations
import json, math
from pathlib import Path
import pandas as pd
from pipeline.contracts.validation import project_root
from pipeline.normalize.common import stable_id
from pipeline.utils.atomic import atomic_write_csv_gz
from pipeline.utils.time import utc_now_iso

BASE_COLUMNS=['rank','ranking_category','ticker','issuer_cik','company_name','market_cap','sector','industry','buyer_count','qualifying_operating_executive_count','latest_transaction_date','latest_filing_date','purchase_value','purchase_multiple','ownership_increase_percent','days_since_previous_purchase','abnormality_score','silence_break_score','cluster_score','behavior_change_score','conviction_score','score_quality','discovery_eligibility','headline','reason_codes','source_accession_numbers','generated_at_utc','schema_version','stable_key','ranking_score']

def _num(v,default=0.0):
 try:
  x=float(v);return x if math.isfinite(x) else default
 except Exception:return default

def _bool(v):
 return str(v).lower() in {'1','true','yes'} if not isinstance(v,bool) else v

def role_label(row):
 roles=set(str(row.get('normalized_roles','')).split('|'))
 for key,label in [('founder','Founder'),('ceo','CEO'),('cfo','CFO'),('coo','COO'),('president','President'),('director','Director')]:
  if key in roles:return label
 return 'Insider'

def headline(row,category):
 role=role_label(row);multiple=row.get('purchase_multiple')
 if category=='wolf_packs' and _num(row.get('buyer_count'))>=2:
  return f"{int(_num(row.get('buyer_count')))} insiders bought within 14 days"
 if category=='quiet_buyers' and _num(row.get('days_since_previous_purchase'))>0:
  years=_num(row.get('days_since_previous_purchase'))/365.25;return f"First open-market purchase in {years:.1f} years"
 if category=='growing_positions' and _num(row.get('ownership_increase_percent'))>0:
  return f"{role} increased direct holdings by {_num(row.get('ownership_increase_percent')):.0f}%"
 if category=='accelerating':return 'Purchase size and frequency are accelerating'
 if multiple is not None and pd.notna(multiple) and _num(multiple)>0:
  return f"{role} purchase was {_num(multiple):.1f}× larger than prior median"
 if _bool(row.get('first_ever_purchase')):return f"First recorded open-market purchase by {role.lower()}"
 return f"Unusual open-market purchase by {role.lower()}"

def base_row(row,category,score):
 ticker=str(row.get('ticker') or row.get('primary_ticker') or '')
 accession=str(row.get('accession_number') or row.get('source_accession_numbers') or '')
 return {'rank':0,'ranking_category':category,'ticker':ticker,'issuer_cik':str(row.get('issuer_cik','')),
 'company_name':str(row.get('company_name') or row.get('issuer_name') or ''),'market_cap':_num(row.get('market_cap')),
 'sector':str(row.get('sector','')),'industry':str(row.get('industry','')),'buyer_count':int(_num(row.get('buyer_count',row.get('unique_buyers',1)),1)),
 'qualifying_operating_executive_count':int(_num(row.get('unique_operating_executives',1),1)),
 'latest_transaction_date':str(row.get('transaction_date','')),'latest_filing_date':str(row.get('filing_date','')),
 'purchase_value':_num(row.get('purchase_value')),'purchase_multiple':row.get('purchase_multiple'),
 'ownership_increase_percent':row.get('ownership_increase_percent'),'days_since_previous_purchase':row.get('days_since_previous_purchase'),
 'abnormality_score':_num(row.get('abnormality_score')),'silence_break_score':_num(row.get('silence_break_score')),
 'cluster_score':_num(row.get('cluster_score')),'behavior_change_score':_num(row.get('behavior_change_score')),
 'conviction_score':_num(row.get('conviction_score')),'score_quality':str(row.get('conviction_quality') or row.get('history_quality') or row.get('quality') or 'acceptable'),
 'discovery_eligibility':_bool(row.get('discovery_eligible',True)),'headline':headline(row,category),
 'reason_codes':str(row.get('reason_codes','')),'source_accession_numbers':accession,'generated_at_utc':utc_now_iso(),'schema_version':'v1',
 'stable_key':stable_id(category,row.get('issuer_cik',''),row.get('event_id',''),accession),'ranking_score':round(float(score),6)}

def finalize(rows,category):
 frame=pd.DataFrame(rows)
 if frame.empty:return pd.DataFrame(columns=BASE_COLUMNS)
 frame=frame.sort_values(['ranking_score','conviction_score','ticker','stable_key'],ascending=[False,False,True,True],kind='mergesort').reset_index(drop=True)
 frame['rank']=range(1,len(frame)+1)
 for c in BASE_COLUMNS:
  if c not in frame:frame[c]=''
 return frame[BASE_COLUMNS]

def append_history(latest:pd.DataFrame,path:Path):
 compact=latest.copy();compact['snapshot_key']=compact.apply(lambda r:stable_id(r['stable_key'],r['ranking_score'],r['rank']),axis=1)
 if path.exists():
  old=pd.read_csv(path,compression='gzip',dtype=str,keep_default_na=False);combined=pd.concat([old,compact],ignore_index=True)
  combined=combined.drop_duplicates('snapshot_key',keep='first')
 else:combined=compact
 atomic_write_csv_gz(path,combined)

def write_rankings(events:pd.DataFrame,companies:pd.DataFrame)->dict[str,int]:
 from pipeline.rankings.breaking_habits import build as breaking
 from pipeline.rankings.quiet_buyers import build as quiet
 from pipeline.rankings.wolf_packs import build as wolves
 from pipeline.rankings.growing_positions import build as growing
 from pipeline.rankings.accelerating import build as accel
 from pipeline.rankings.contrarian import build as contra
 from pipeline.rankings.under_the_radar import build as under
 from pipeline.rankings.sector_activity import build as sectors
 out=project_root()/'data/rankings';out.mkdir(parents=True,exist_ok=True)
 builders={'breaking_habits':breaking,'quiet_buyers':quiet,'wolf_packs':wolves,'growing_positions':growing,'accelerating':accel,'contrarian':contra,'under_the_radar':under}
 frames=[];counts={}
 for name,fn in builders.items():
  frame=fn(events,companies);atomic_write_csv_gz(out/f'{name}.csv.gz',frame);frames.append(frame);counts[name]=len(frame)
 latest=pd.concat(frames,ignore_index=True) if frames else pd.DataFrame(columns=BASE_COLUMNS)
 atomic_write_csv_gz(out/'latest.csv.gz',latest);append_history(latest,out/'history.csv.gz')
 sector=sectors(events,companies);atomic_write_csv_gz(out/'sector_activity.csv.gz',sector);counts['sector_activity']=len(sector);counts['latest']=len(latest)
 return counts
from pipeline.rankings.utils import boolean_column, numeric_column, text_column
