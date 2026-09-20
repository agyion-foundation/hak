"""Scene 3: Envoy flow — mandate, agent loop, claim, then over-cap rejection (~45s)."""
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
    pg.wait_for_timeout(2000)

    # Pre-seed an expensive fade (start 600) so the over-cap attempt has a target above max/tx.
    # Done quietly before the Envoy scene; this part will be trimmed out.
    pg.click("text=Lock the pot")
    pg.wait_for_timeout(1800)
    mark('expensive fade #1 pre-seeded (600 start)')

    pg.click("button:has-text('Envoy') >> nth=0")
    pg.wait_for_timeout(1800)
    mark('envoy tab')
    pg.evaluate("window.scrollTo({top:250, behavior:'smooth'})")
    pg.wait_for_timeout(1200)
    pg.click("text=Generate agent key")
    pg.wait_for_timeout(1500)
    mark('agent key generated')
    pg.click("text=Grant mandate")
    pg.wait_for_timeout(2200)
    mark('mandate granted')
    pg.click("text=need a target?")
    pg.wait_for_timeout(1800)
    mark('demo fade listed (180, under cap)')
    pg.click("text=Run the agent")
    pg.wait_for_timeout(1500)
    mark('agent loop running')
    # wait until the agent claims (watch log for CLAIM)
    for _ in range(30):
        txt = pg.evaluate("() => document.body.innerText")
        if 'claimed fade' in txt:
            break
        pg.wait_for_timeout(1000)
    pg.wait_for_timeout(2500)
    mark('agent claimed within mandate')

    # Provocation: over-cap attempt against the expensive fade #1 (price ~590 > 200 max/tx)
    pg.click("button:has-text('Attempt over-cap claim')")
    pg.wait_for_timeout(2500)
    mark('over-cap attempted -> expect rejection')
    pg.evaluate("window.scrollTo({top:document.body.scrollHeight, behavior:'smooth'})")
    pg.wait_for_timeout(3000)
    mark('rejection log visible')
    ctx.close()
    b.close()
print('envoy recorded')
