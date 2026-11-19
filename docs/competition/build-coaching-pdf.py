"""Generate the one-page coaching handout from the same content as the demo hub."""
import json
import os
import shutil
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT / 'frontend/src/coaching/brief.json').read_text())
OUT = ROOT / 'output/pdf/scrollfact-coaching-2026-11-01.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
FONT = os.environ.get('SCROLLFACT_PDF_FONT', '/System/Library/Fonts/Supplemental/Arial Unicode.ttf')
pdfmetrics.registerFont(TTFont('Korean', FONT))
INK = HexColor('#203b33')
MUTED = HexColor('#637467')
GREEN = HexColor('#234c3e')
ACCENT = HexColor('#ad6038')
WIDTH, HEIGHT = A4
c = canvas.Canvas(str(OUT), pagesize=A4)
c.setTitle('트리오남 - ScrollFact 코칭 한 장 - 2026.11.01')
c.setAuthor('트리오남')

def text(value, x, top, width, size=10, leading=15, color=INK):
    p = Paragraph(value, ParagraphStyle('text', fontName='Korean', fontSize=size,
                  leading=leading, textColor=color, wordWrap='CJK'))
    _, height = p.wrap(width, HEIGHT)
    p.drawOn(c, x, HEIGHT-top-height)
    return top+height

def heading(num, title, x, top, width):
    text(num, x, top+2, 19, 8, 11, ACCENT)
    return text(title, x+24, top, width-24, 12, 17)+10

def rule(top):
    c.setStrokeColor(HexColor('#d6ded1'))
    c.setLineWidth(.7)
    c.line(35, HEIGHT-top, WIDTH-35, HEIGHT-top)

def box(x, top, width, height, color):
    c.setFillColor(HexColor(color))
    c.rect(x,HEIGHT-top-height,width,height,stroke=0,fill=1)

margin=35
full=WIDTH-70
gap=23
col=(full-gap)/2
right=margin+col+gap
text('SCROLLFACT / TOPIC DISCUSSION',margin,28,360,8,12,MUTED)
text(DATA['date'],WIDTH-105,28,70,8,12,MUTED)
text(DATA['title'],margin,51,full,21,28)
text(DATA['team']+' / '+DATA['subtitle'],margin,86,full,9,14,MUTED)
rule(111)
y=heading('01','원래 ScrollFact는',margin,126,full)
y=text(escape(DATA['direction']),margin,y,full,10,15)+6
y=text(escape(DATA['division']),margin,y,full,8,12,MUTED)
box(margin,y+9,full,26,'#eef2e9')
text('  →  '.join(DATA['flow']),margin+12,y+16,full-24,9,13)
row1=y+52
leftY=heading('02','기대했던 효과',margin,row1,col)
for item in DATA['benefits']:
    leftY=text(escape(item['label']),margin,leftY,col,8,12,ACCENT)+3
    leftY=text(escape(item['text']),margin,leftY,col,9,14)+10
rightY=heading('03','대회와 연결하려던 생각',right,row1,col)
rightY=text(escape(DATA['connection']),right,rightY,col,9,14)+8
rightY=text(escape(DATA['connectionNote']),right,rightY,col,8,12,MUTED)

core=max(leftY,rightY)+12
# Measure the highlighted question before painting its background.
style=ParagraphStyle('measure',fontName='Korean',fontSize=11,leading=17,wordWrap='CJK')
qh=Paragraph(escape(DATA['question']),style).wrap(full-28,HEIGHT)[1]
style.fontSize=9; style.leading=14
gh=Paragraph(escape(DATA['gap']),style).wrap(full-28,HEIGHT)[1]
coreH=27+qh+8+gh+31
box(margin,core,full,coreH,'#f8f0e6')
y=heading('04','그런데, 여기서 막혔다',margin+14,core+10,full-28)-5
y=text(escape(DATA['question']),margin+14,y,full-28,11,17)+8
y=text(escape(DATA['gap']),margin+14,y,full-28,9,14)+10
y=text(escape(DATA['chain']),margin+14,y,full-28,8,12,ACCENT)

y=heading('05','멘토에게 묻고 싶은 것',margin,max(core+coreH,y)+18,full)
for i,item in enumerate(DATA['mentorQuestions'],1):
    y=text(str(i)+'. '+escape(item),margin,y,full,9,14)+5
last=y+9
style=ParagraphStyle('closing',fontName='Korean',fontSize=9,leading=14,wordWrap='CJK')
closingH=Paragraph(escape(DATA['closing']),style).wrap(full-28,HEIGHT)[1]+22
box(margin,last,full,closingH,'#234c3e')
text(escape(DATA['closing']),margin+14,last+11,full-28,9,14,HexColor('#ffffff'))
foot=text(escape(DATA['footnote']),margin,last+closingH+12,full,7.5,11,MUTED)
if foot>HEIGHT-24:
    raise RuntimeError(f'Content overflow: {foot:.1f} > {HEIGHT-24:.1f}')
c.showPage()
c.save()
assert len(PdfReader(OUT).pages)==1
public=ROOT / 'frontend/public/coaching' / OUT.name
public.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(OUT,public)
print(f'Created 1-page PDF: {OUT}; last content baseline {foot:.1f}/{HEIGHT:.1f} pt')
