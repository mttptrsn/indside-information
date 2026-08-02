"""Ranking category."""
def build(events,companies):
 from pipeline.rankings.discoveries import base_row,finalize,_num,_bool
 rows=[]
 for r in events.to_dict('records'):
  cap=_num(r.get('market_cap'));eligible=_bool(r.get('discovery_eligible',True))
  if eligible and (cap==0 or cap<=10000000000):
   cap_score=100 if cap<=1000000000 else max(0,100-(cap-1000000000)/90000000)
   score=.45*_num(r.get('conviction_score'))+.4*_num(r.get('behavior_change_score'))+.15*cap_score
   rows.append(base_row(r,'under_the_radar',score))
 return finalize(rows,'under_the_radar')
from pipeline.rankings.utils import boolean_column, numeric_column, text_column
