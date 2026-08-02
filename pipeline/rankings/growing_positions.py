"""Ranking category."""
def build(events,companies):
 from pipeline.rankings.discoveries import base_row,finalize,_num
 rows=[]
 for r in events.to_dict('records'):
  own=_num(r.get('ownership_increase_percent'))
  if own>0:
   score=.45*min(100,own*2)+.35*_num(r.get('conviction_score'))+.2*(100 if str(r.get('direct_indirect_code'))=='D' else 30)
   rows.append(base_row(r,'growing_positions',score))
 return finalize(rows,'growing_positions')
from pipeline.rankings.utils import boolean_column, numeric_column, text_column
