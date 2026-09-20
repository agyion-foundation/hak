"""Scene 4: Pod bury + early-attempt refusal + Ledger Proof Pack (~30s)."""
import time
from playwright.sync_api import sync_playwright
RAW = '/mnt/agents/output/project/docs/video/raw/'

t0 = time.time()
def mark(name):
    print(f"MARK {time.time()-t0:6.1f}s  {name}", flush=True)

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width':1280,'height':720}, accept_downloads=True,
                        record_video_dir=RAW, record_video_size={'width':1280,'height':720})
    pg = ctx.new_page()
    pg.goto('http://localhost:8765/app.html', wait_until='networkidle')
    pg.wait_for_timeout(2000)

    # Seed some history so the Ledger table isn't empty: quick fade lock.
    pg.click("text=Lock the pot")
    pg.wait_for_timeout(1500)
    mark('seed fade locked')

    pg.click("button:has-text('Pod') >> nth=0")
    pg.wait_for_timeout(1800)
    mark('pod tab')
    pg.evaluate("window.scrollTo({top:250, behavior:'smooth'})")
    pg.wait_for_timeout(1000)
    pg.click("text=Bury the pod")
    pg.wait_for_timeout(2500)
    mark('pod buried')
    pg.evaluate("window.scrollTo({top:380, behavior:'smooth'})")
    pg.wait_for_timeout(1500)
    pg.fill("input[placeholder*='32-char']", "deadbeefcafebabe1234567890abcdef")
    pg.wait_for_timeout(800)
    mark('preimage typed')
    pg.click("button:has-text('Try early')")
    pg.wait_for_timeout(3000)
    mark('early open refused')
    pg.wait_for_timeout(1000)

    pg.click("button:has-text('Ledger') >> nth=0")
    pg.wait_for_timeout(2000)
    mark('ledger tab')
    pg.evaluate("window.scrollTo({top:200, behavior:'smooth'})")
    pg.wait_for_timeout(1500)
    with pg.expect_download() as dl_info:
        pg.click("text=Download Proof Pack")
    dl = dl_info.value
    path = '/mnt/agents/output/project/docs/video/raw/proof-pack.json'
    dl.save_as(path)
    mark('proof pack downloaded -> ' + (dl.suggested_filename or '?'))
    pg.wait_for_timeout(2500)
    mark('end')
    ctx.close()
    b.close()
print('pod+ledger recorded')
