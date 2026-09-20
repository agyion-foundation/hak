"""Scene 2: full Fade flow recording — create, live price, claim, venue sign, settle (~40s).
Timeline markers printed so ffmpeg trims can be chosen."""
import time
from playwright.sync_api import sync_playwright
RAW = '/mnt/agents/output/project/docs/video/raw/'

t0 = time.time()
def mark(name):
    print(f"MARK {time.time()-t0:6.1f}s  {name}", flush=True)

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width':1280,'height':720},
                        record_video_dir=RAW, record_video_size={'width':1280,'height':720})
    pg = ctx.new_page()
    pg.goto('http://localhost:8765/app.html', wait_until='networkidle')
    pg.wait_for_timeout(2500)
    mark('app loaded, fade form visible')
    pg.wait_for_timeout(2000)
    mark('before Lock the pot')
    pg.click("text=Lock the pot")
    pg.wait_for_timeout(2000)
    pg.evaluate("window.scrollTo({top:120, behavior:'smooth'})")
    mark('pot locked, live price ticking')
    pg.wait_for_timeout(6000)   # let the price fall on screen
    mark('price ticked for 6s')
    pg.evaluate("window.scrollTo({top:430, behavior:'smooth'})")
    pg.wait_for_timeout(1800)
    mark('claim button in view')
    pg.click("button:has-text('Claim at')")
    pg.wait_for_timeout(2200)
    mark('claimed')
    pg.click("button:has-text('Produce signature')")
    pg.wait_for_timeout(2000)
    mark('venue signature produced')
    pg.click("button:has-text('Confirm handoff') >> nth=0")
    pg.wait_for_timeout(2500)
    mark('handoff confirmed / executed')
    pg.evaluate("window.scrollTo({top:120, behavior:'smooth'})")
    pg.wait_for_timeout(3000)
    mark('settled status visible')
    ctx.close()
    b.close()
print('fade recorded')
