"""Scene 1: landing page hero scroll-scrub recording (~14s)."""
from playwright.sync_api import sync_playwright
RAW = '/mnt/agents/output/project/docs/video/raw/'

with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True)
    ctx = b.new_context(viewport={'width':1280,'height':720},
                        record_video_dir=RAW, record_video_size={'width':1280,'height':720})
    pg = ctx.new_page()
    pg.goto('http://localhost:8765/index.html', wait_until='networkidle')
    pg.wait_for_timeout(3000)
    # hold on hero ~3s
    pg.wait_for_timeout(3000)
    # butter-smooth slow scroll through hero scrub zone (0 -> 1600) over ~7s
    pg.evaluate("""async () => {
        const from = 0, to = 1600, dur = 7000, t0 = performance.now();
        const ease = t => t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
        await new Promise(res => {
            function step(now){
                const t = Math.min(1, (now-t0)/dur);
                window.scrollTo(0, from + (to-from)*ease(t));
                if (t < 1) requestAnimationFrame(step); else res();
            }
            requestAnimationFrame(step);
        });
    }""")
    pg.wait_for_timeout(1500)
    # gentle continue into "how it works"
    pg.evaluate("""async () => {
        const from = window.scrollY, to = from + 700, dur = 2500, t0 = performance.now();
        const ease = t => t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
        await new Promise(res => {
            function step(now){
                const t = Math.min(1, (now-t0)/dur);
                window.scrollTo(0, from + (to-from)*ease(t));
                if (t < 1) requestAnimationFrame(step); else res();
            }
            requestAnimationFrame(step);
        });
    }""")
    pg.wait_for_timeout(1200)
    ctx.close()
    b.close()
print('landing recorded')
