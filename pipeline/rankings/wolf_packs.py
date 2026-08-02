"""Ranking category."""
def build(events,companies):
 from pipeline.rankings.discoveries import base_row,finalize,_num
 rows=[]
 for r in events.to_dict('records'):
  buyers=int(_num(r.get('unique_buyers',r.get('buyer_count',1)),1))
  if buyers>=2:
   score=.45*_num(r.get('cluster_score'))+.3*_num(r.get('conviction_score'))+.25*min(100,buyers*25)
   x=dict(r);x['buyer_count']=buyers;rows.append(base_row(x,'wolf_packs',score))
 return finalize(rows,'wolf_packs')
from pipeline.rankings.utils import boolean_column, numeric_column, text_column
