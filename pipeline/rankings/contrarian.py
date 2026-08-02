"""Ranking category."""
def build(events,companies):
 from pipeline.rankings.discoveries import base_row,finalize,_num
 rows=[]
 for r in events.to_dict('records'):
  dd=abs(min(0,_num(r.get('drawdown_52w'))));conv=_num(r.get('conviction_score'))
  if dd>=.15 and conv>=50 and str(r.get('quality','acceptable'))!='unusable':
   rows.append(base_row(r,'contrarian',.55*conv+.45*min(100,dd*200)))
 return finalize(rows,'contrarian')
from pipeline.rankings.utils import boolean_column, numeric_column, text_column
