from bs4 import BeautifulSoup, NavigableString
from pathlib import Path
import json
p=Path('get_climate.html'); soup=BeautifulSoup(p.read_text(encoding='utf-8-sig'),'html.parser')
script=soup.new_tag('script',src='assets/climate-i18n.js',defer=True); soup.find('script',src='assets/climate.js').insert_before(script)
texts=[]
for node in list(soup.find_all(string=True)):
    if node.parent.name in ('script','style') or not str(node).strip() or str(node).startswith('html'): continue
    value=str(node).strip()
    if value in ['→','☀','N','S','E','W','CSV · XLSX · JSON · PDF','UTM (WGS84)','Zenodo'] or value.startswith('Chiu,') or value.startswith('Zippenfenig,'): continue
    if node.parent.name in ('i',) and value=='Climate Data Viewer': continue
    texts.append(value)
    if len(node.parent.contents)==1:
        node.parent['data-i18n']=value
    else:
        span=soup.new_tag('span');span['data-i18n']=value;span.string=value;node.replace_with(span)
for tag in soup.find_all(True):
    for attr in ['placeholder','aria-label']:
        value=tag.get(attr)
        if value and any(c.isalpha() for c in value) and value not in ['47','500000','2000000']:
            tag['data-i18n-'+attr]=value;texts.append(value)
controls=BeautifulSoup('<div class="hero-tools"><span class="source-badge" data-i18n="ERA5 · Historical reanalysis">ERA5 · Historical reanalysis</span><label class="language-control"><span data-i18n="Language">Language</span><select id="language" aria-label="Language / 語言 / ภาษา"><option value="zh-Hant">繁體中文</option><option value="en">English</option><option value="th">ไทย</option></select></label></div>','html.parser')
soup.select_one('.source-badge').replace_with(controls)
p.write_text(str(soup)+'\n',encoding='utf-8')
Path('artifacts/climate-qa/static-texts.json').write_text(json.dumps(sorted(set(texts)),ensure_ascii=False,indent=2),encoding='utf-8')
