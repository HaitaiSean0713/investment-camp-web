import json
import base64
import io
import os
import sys
import socket
import sqlite3
from contextlib import closing
import time
import subprocess
import atexit
import tempfile
from pathlib import Path
import urllib.error
import urllib.request
import uuid
import zipfile
from concurrent.futures import ThreadPoolExecutor
from http.cookiejar import CookieJar

with socket.socket() as port_socket:
    port_socket.bind(('127.0.0.1',0))
    PORT=port_socket.getsockname()[1]
BASE = f'http://127.0.0.1:{PORT}'
root=Path(__file__).resolve().parent
test_dir=tempfile.TemporaryDirectory()
env=os.environ.copy()
env.update({'CAMP_DB':str(Path(test_dir.name)/'camp-test.db'),
            'CAMP_ADMIN_PASSWORD':'TestAdmin!2026','CAMP_PORT':str(PORT)})
server=subprocess.Popen([sys.executable,str(root/'server.py')],
                        env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def cleanup():
    server.terminate()
    try:
        server.wait(timeout=3)
    except subprocess.TimeoutExpired:
        server.kill()
        server.wait()
    test_dir.cleanup()
atexit.register(cleanup)
for _ in range(50):
    try:
        urllib.request.urlopen(BASE+'/api/auth/me',timeout=.2).read()
        break
    except Exception:
        time.sleep(.1)
else:
    raise RuntimeError('server did not start')


class Client:
    def __init__(self):
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))

    def call(self, path, body=None, status=200):
        req = urllib.request.Request(BASE + path,
            data=json.dumps(body).encode() if body is not None else None,
            headers={'Content-Type':'application/json'} if body is not None else {},
            method='POST' if body is not None else 'GET')
        try:
            with self.opener.open(req) as resp:
                got = resp.status
                data = json.loads(resp.read()) if resp.headers.get('Content-Type','').startswith('application/json') else None
        except urllib.error.HTTPError as e:
            got = e.code
            data = json.loads(e.read())
        assert got == status, (path, status, got, data)
        return data

    def join(self, url):
        with self.opener.open(BASE + url) as response:
            assert response.status == 200


admin = Client()
admin.call('/api/auth/login', {'password':'TestAdmin!2026'})
code = 'SMOKE' + uuid.uuid4().hex[:8].upper()
aid = admin.call('/api/admin/activities', {'name':'測試營隊','code':code,'initial_cash':'1000'})['id']
base = f'/api/admin/activity/{aid}'
t1 = admin.call(base+'/teams', {'name':'第一隊'})
t2 = admin.call(base+'/teams', {'name':'第二隊'})
s1 = admin.call(base+'/stocks', {'name':'NovaTech','symbol':'NT01','industry':'科技','description':'虛構公司'})['id']
for num, price in [(1,'100'),(2,'120')]:
    rid = admin.call(base+'/rounds', {'round_number':num})['id']
    admin.call(base+'/prices', {'round_id':rid,'stock_id':s1,'price':price})
    if num == 1: r1=rid
newsid=admin.call(base+'/news', {'round_id':r1,'title':'私密消息','content':'只給第一隊','type':'PRIVATE','team_ids':[t1['id']]})['id']
admin.call(base+'/next', {})
preview=admin.call(base+'/release-preview')
assert preview[0]['news'][0]['title']=='私密消息'
admin.call(base+'/release', {})
team1,team2=Client(),Client()
team1.join(t1['join_url']);team2.join(t2['join_url'])
assert len(team1.call('/api/team/intelligence')) == 1
assert len(team2.call('/api/team/intelligence')) == 0
assert team2.call('/api/team/me')['news'] == []
team1.call('/api/admin/activities', status=401)
team1.call(base+'/prices',{'round_id':r1,'stock_id':s1,'price':'1'},status=401)
admin.call(base+f'/news/{newsid}',{'team_ids':[t2['id']]},status=409)
team2.call('/api/team/review', status=403)
team1.call('/api/team/trade', {'stock_id':s1,'type':'BUY','quantity':1}, 409)
admin.call(base+'/stage', {'stage':'TRADING'})
team1.call('/api/team/trade', {'stock_id':s1,'type':'BUY','quantity':11}, 409)
team1.call('/api/team/trade', {'stock_id':s1,'type':'BUY','quantity':3})
team1.call('/api/team/trade', {'stock_id':s1,'type':'SELL','quantity':4}, 409)
assert team1.call('/api/team/me')['portfolio']['cash'] == '700.00'
sid=admin.call(base+'/snapshots', {'display_level':'C'})['id']
assert team1.call('/api/team/ranking')['snapshot'] is None
admin.call(base+f'/snapshots/{sid}/publish', {})
snap=team1.call('/api/team/ranking')['snapshot']
assert snap['entries'][0]['team_name']=='第一隊'
assert snap['entries'][0]['total_asset']=='1000.00'
admin.call(base+'/next', {})
assert team1.call('/api/team/me')['stocks'][0]['price']=='120.00'
assert team1.call('/api/team/ranking')['snapshot']['entries'][0]['total_asset']=='1000.00'
public=Client().call('/api/public/'+code)
assert '私密消息' not in str(public)
admin.call(base+f'/news/{newsid}', {'type':'PUBLIC'})
assert len(team2.call('/api/team/intelligence'))==1
assert len(Client().call('/api/public/'+code)['news'])==1
team1.call('/api/team/trade', {'stock_id':s1,'type':'BUY','quantity':1}, 409)
admin.call(base+'/stage', {'stage':'TRADING'})
team1.call('/api/team/trade', {'stock_id':s1,'type':'BUY','quantity':1})
final=admin.call(base+'/snapshots', {'is_final':True})['id']
team1.call('/api/team/trade', {'stock_id':s1,'type':'BUY','quantity':1},409)
assert team1.call('/api/team/ranking')['snapshot']['id']==sid
admin.call(base+f'/snapshots/{final}/publish', {})
admin.call(base+'/settings', {'name':'測試營隊','performance_report_visible':True,'review_visible':True})
report=team1.call('/api/team/performance')
assert report['total_asset']=='1060.00', report
assert report['report']['transaction_count']==2
assert report['report']['stock_results'][0]['total_profit']=='60.00'
assert len(team2.call('/api/team/review'))==1
assert team2.call('/api/team/review')[0]['team_name']=='第一隊'
assert admin.call(base+'/snapshots/'+str(final))['entries'][0]['team_name']=='第一隊'
assert len(admin.call(base+'/transactions'))==2
assert '<svg' in admin.call('/api/qr?text=hello')['svg']

def workbook(rows):
    xml=['<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>']
    for i,row in enumerate(rows,1):
        xml.append(f'<row r="{i}">')
        for j,value in enumerate(row):
            col=chr(65+j)
            if isinstance(value,(int,float)):
                xml.append(f'<c r="{col}{i}"><v>{value}</v></c>')
            else:
                xml.append(f'<c r="{col}{i}" t="inlineStr"><is><t>{value}</t></is></c>')
        xml.append('</row>')
    xml.append('</sheetData></worksheet>')
    out=io.BytesIO()
    with zipfile.ZipFile(out,'w') as z:
        z.writestr('xl/worksheets/sheet1.xml',''.join(xml))
    return base64.b64encode(out.getvalue()).decode()

code2='IMPORT'+uuid.uuid4().hex[:8].upper()
aid2=admin.call('/api/admin/activities', {'name':'匯入測試','code':code2,'initial_cash':'1000'})['id']
b2=f'/api/admin/activity/{aid2}'
admin.call(b2+'/teams', {'name':'第一隊'})
admin.call(b2+'/stocks', {'name':'NovaTech','symbol':'NT01'})
admin.call(b2+'/rounds', {'round_number':1})
admin.call(b2+'/rounds', {'round_number':2})
prices=workbook([['Round','NT01'],[1,100],[2,120]])
assert admin.call(b2+'/import',{'kind':'prices','xlsx_base64':prices})['imported']==2
news=workbook([['Round','News','Team','Content'],[2,'產品突破','第一隊','測試成功']])
assert admin.call(b2+'/import',{'kind':'news','xlsx_base64':news})['imported']==1
assert admin.call(b2)['rounds'][0]['prices'][0]['price']=='100.00'

code3='RACE'+uuid.uuid4().hex[:8].upper()
aid3=admin.call('/api/admin/activities', {'name':'併發測試','code':code3,'initial_cash':'1000'})['id']
b3=f'/api/admin/activity/{aid3}'
race_team=admin.call(b3+'/teams', {'name':'同隊'})
race_stock=admin.call(b3+'/stocks', {'name':'唯一股票','symbol':'ONE'})['id']
race_round=admin.call(b3+'/rounds', {'round_number':1})['id']
admin.call(b3+'/prices',{'round_id':race_round,'stock_id':race_stock,'price':'1000'})
admin.call(b3+'/next',{})
admin.call(b3+'/stage',{'stage':'TRADING'})
c1,c2=Client(),Client()
c1.join(race_team['join_url']);c2.join(race_team['join_url'])
def buy(client):
    return client.call('/api/team/trade',{'stock_id':race_stock,'type':'BUY','quantity':1},status=200)
def try_buy(client):
    try:
        buy(client)
        return 200
    except AssertionError as error:
        return error.args[0][2]
with ThreadPoolExecutor(max_workers=2) as pool:
    results=list(pool.map(try_buy,[c1,c2]))
assert sorted(results)==[200,409],results
assert c1.call('/api/team/me')['portfolio']['cash']=='0.00'
Client().call(base+'/delete', {'code':code}, 401)
admin.call(base+'/delete', {'code':'WRONG-CODE'}, 400)
assert admin.call(base)['code']==code
admin.call(base+'/delete', {'code':code})
admin.call(base, status=404)
Client().call('/api/public/'+code, status=404)
team1.call('/api/team/me', status=401)
assert admin.call(b2)['id']==aid2
with closing(sqlite3.connect(env['CAMP_DB'])) as db:
    assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
    assert db.execute('SELECT COUNT(*) FROM activities WHERE id=?',(aid,)).fetchone()[0]==0
    assert db.execute('SELECT COUNT(*) FROM teams WHERE id IN (?,?)',(t1['id'],t2['id'])).fetchone()[0]==0
    assert db.execute('SELECT COUNT(*) FROM stocks WHERE id=?',(s1,)).fetchone()[0]==0
print('SMOKE TEST PASSED', aid, sid, final)
