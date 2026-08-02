import pandas as pd, pytest
from pathlib import Path
from pipeline.runner.stages import resolve,STAGES,Stage
from pipeline.rankings.breaking_habits import build as breaking
from pipeline.rankings.wolf_packs import build as wolves
from pipeline.rankings.contrarian import build as contra
from pipeline.rankings.under_the_radar import build as under
from pipeline.rankings.sector_activity import build as sectors
from pipeline.rankings.discoveries import append_history,headline

def sample():
 return pd.DataFrame([{'event_id':'e1','issuer_cik':'1','insider_id':'a','ticker':'AAA','company_name':'A','purchase_value':100000,'purchase_multiple':10,'historical_percentile':99,'robust_z_display':5,'abnormality_score':95,'silence_break_score':80,'cluster_score':70,'behavior_change_score':90,'conviction_score':88,'history_depth':'usable','days_since_previous_purchase':1826,'ownership_increase_percent':20,'normalized_roles':'ceo|operating_executive','unique_buyers':2,'unique_operating_executives':2,'drawdown_52w':-.3,'quality':'high','discovery_eligible':True,'market_cap':500000000,'transaction_date':'2026-01-01','filing_date':'2026-01-03','accession_number':'x','acceleration_score':80,'acceleration_sample_count':3,'sector':'Tech'},
 {'event_id':'e2','issuer_cik':'2','insider_id':'b','ticker':'BBB','company_name':'B','purchase_value':50000,'purchase_multiple':None,'first_ever_purchase':True,'abnormality_score':60,'silence_break_score':40,'cluster_score':0,'behavior_change_score':65,'conviction_score':60,'history_depth':'no_history','days_since_previous_purchase':None,'ownership_increase_percent':5,'normalized_roles':'founder','unique_buyers':1,'drawdown_52w':-.05,'quality':'acceptable','discovery_eligible':True,'market_cap':2000000000,'transaction_date':'2026-01-02','filing_date':'2026-01-04','accession_number':'y','sector':'Health'}])

def test_dependency_order():assert resolve(['rankings'])==['contracts','normalize','validate_sec','prices','enrich','histories','signals','rankings']
def test_cycle_detection(monkeypatch):
 monkeypatch.setitem(STAGES,'x',Stage('x',('y',),lambda:None,(),()));monkeypatch.setitem(STAGES,'y',Stage('y',('x',),lambda:None,(),()))
 with pytest.raises(ValueError):resolve(['x'])
def test_deterministic_order_and_first_ever():
 a=breaking(sample(),pd.DataFrame());b=breaking(sample(),pd.DataFrame());pd.testing.assert_frame_equal(a.drop(columns='generated_at_utc'),b.drop(columns='generated_at_utc'));assert a['ticker'].tolist()==['AAA','BBB']
def test_wolf_pack_deduplicated_count():assert wolves(sample(),pd.DataFrame()).iloc[0]['buyer_count']==2
def test_contrarian_requires_evidence_and_drawdown():assert contra(sample(),pd.DataFrame())['ticker'].tolist()==['AAA']
def test_under_radar_prefers_smaller_cap():assert under(sample(),pd.DataFrame()).iloc[0]['ticker']=='AAA'
def test_sector_aggregation():assert set(sectors(sample(),pd.DataFrame())['sector'])=={'Tech','Health'}
def test_headline_deterministic():assert headline(sample().iloc[0].to_dict(),'breaking_habits')=='CEO purchase was 10.0× larger than prior median'
def test_history_no_duplicate_snapshot(tmp_path):
 f=breaking(sample(),pd.DataFrame());p=tmp_path/'h.csv.gz';append_history(f,p);append_history(f,p);assert len(pd.read_csv(p,compression='gzip'))==len(f)
