import pandas as pd
from pipeline.enrich.purchase_groups import build_purchase_events,build_purchase_campaigns
from pipeline.enrich.ownership import ownership_metrics
from pipeline.enrich.executive_history import build_executive_histories
from pipeline.enrich.price_context import split_factor_after
from pipeline.signals.abnormality import abnormality
from pipeline.signals.silence_break import silence_break
from pipeline.signals.purchase_acceleration import acceleration
from pipeline.signals.cluster_buying import cluster_for_event
from pipeline.signals.confidence import conviction_score
from pipeline.validate.prices import validate_price_frame

def tx():
 return pd.DataFrame([{'issuer_cik':'1','owner_cik':'2','insider_id':'2','ticker':'ABC','transaction_date':'2020-01-01','filing_date':'2020-01-02','security_title':'Common','direct_indirect_code':'D','accession_number':'a','shares':10,'reported_value':100,'shares_owned_after':10,'normalized_roles':'ceo|director','footnotes':'','quality':'high','is_qualifying_purchase':True},{'issuer_cik':'1','owner_cik':'2','insider_id':'2','ticker':'ABC','transaction_date':'2020-01-01','filing_date':'2020-01-02','security_title':'Common','direct_indirect_code':'D','accession_number':'a','shares':5,'reported_value':60,'shares_owned_after':15,'normalized_roles':'ceo','footnotes':'','quality':'high','is_qualifying_purchase':True}])
def test_lots_grouped():
 e=build_purchase_events(tx());assert len(e)==1 and e.iloc[0].lot_count==2 and e.iloc[0].purchase_value==160
def test_campaign_grouping():
 e=build_purchase_events(tx());e2=e.copy();e2['event_id']='x';e2['transaction_date']='2020-01-03';assert build_purchase_campaigns(pd.concat([e,e2]),5).iloc[0].event_count==2
def test_zero_prior_ownership():assert ownership_metrics(10,10,'D')['ownership_increase_percent']==100
def test_indirect_not_ambiguous():assert not ownership_metrics(10,20,'I')['ambiguous_ownership']
def test_split_factor():
 p=pd.DataFrame({'date':['2020-01-01','2021-01-01'],'stock_splits':[0,2]});assert split_factor_after(p,'2020-01-01')==2
def test_no_history():
 e=build_purchase_events(tx());h=build_executive_histories(e);assert h.iloc[0].history_depth=='no_history'
def test_sparse_and_deep():
 base=build_purchase_events(tx()).iloc[0].to_dict();rows=[]
 for i in range(9):r=base.copy();r['event_id']=str(i);r['transaction_date']=f'2020-01-{i+1:02d}';r['purchase_value']=100+i;rows.append(r)
 h=build_executive_histories(pd.DataFrame(rows));assert h.iloc[2].history_depth=='sparse' and h.iloc[8].history_depth=='deep'
def test_abnormal_10x():assert abnormality({'purchase_value':1000},[100,100,100])['purchase_multiple']==10
def test_silence_five_years():assert silence_break(1825,365,500)['silence_break_score']>80
def test_cluster_deduplicates_roles():
 e=pd.DataFrame([{'issuer_cik':'1','insider_id':'a','transaction_date':'2020-01-01','normalized_roles':'ceo|director','purchase_value':1},{'issuer_cik':'1','insider_id':'b','transaction_date':'2020-01-02','normalized_roles':'cfo','purchase_value':1}]);x=cluster_for_event(e.iloc[1].to_dict(),e,14);assert x['unique_buyers']==2 and x['unique_operating_executives']==2
def test_acceleration_requires_history():assert acceleration([{'purchase_value':100,'transaction_date':'2020-01-01'}])['acceleration_score']==0
def test_acceleration_with_history():
 e=[{'purchase_value':v,'transaction_date':f'2020-0{i+1}-01'} for i,v in enumerate([100,200,500])];assert acceleration(e)['acceleration_quality']=='high'
def test_no_lookahead_history():
 base=build_purchase_events(tx()).iloc[0].to_dict();a=base.copy();b=base.copy();a['event_id']='a';a['transaction_date']='2020-01-01';a['purchase_value']=100;b['event_id']='b';b['transaction_date']='2021-01-01';b['purchase_value']=10000;h=build_executive_histories(pd.DataFrame([a,b]));assert h.iloc[0].prior_purchase_count==0 and h.iloc[1].prior_median_purchase_value==100
def test_stale_prices():
 p=pd.DataFrame({'date':['2020-01-01'],'ticker':['ABC'],'open':[1],'high':[1],'low':[1],'close':[1],'adj_close':[1],'volume':[1],'stock_splits':[0]});assert 'stale' in validate_price_frame(p,'ABC')['warnings']
def test_penalty_transparent():
 x=conviction_score({'behavior_change_score':80,'purchase_value':100000,'ownership_increase_percent':10,'cluster_score':50,'role_score':90,'direct_indirect_code':'I','discovery_eligible':False,'event_quality':'high'},['indirect_only','microcap_or_illiquid']);assert set(x['conviction_penalties'])=={'indirect_only','microcap_or_illiquid'}
