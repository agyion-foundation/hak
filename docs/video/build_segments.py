#!/usr/bin/env python3
"""Build Agyion demo video: segments -> look -> xfade assembly."""
import subprocess, os

V = '/mnt/agents/output/project/docs/video'
RAW = f'{V}/raw'
SEG = f'{V}/seg'
F = f'{V}/fonts'
os.makedirs(SEG, exist_ok=True)

MONO = f'{F}/ibm-plex-mono-500.ttf'
SERIF = f'{F}/dm-serif-display-400.ttf'
INTER = f'{F}/inter-600.ttf'

BAR = 54  # letterbox bar height
INK = '0x2B2620'; CREAM = '0xF5F0E8'; OCHRE = '0xB0672A'; MUTED = '0x8A8177'

def look(caption=None):
    """letterbox + vignette + optional lower-third caption"""
    flt = ("drawbox=y=0:w=iw:h={b}:color=black:t=fill,"
           "drawbox=y=ih-{b}:w=iw:h={b}:color=black:t=fill").format(b=BAR)
    if caption:
        t = caption.replace("'", "\u2019").replace(':', '\\:')
        flt += (",drawtext=fontfile={m}:text='{t}':fontsize=21:fontcolor={c}:"
                "x=64:y=h-{b}+16").format(m=MONO, t=t, c=CREAM, b=BAR)
    flt += ",vignette=angle=PI/4.6"
    return flt

def run(cmd):
    print(' '.join(cmd[:6]), '...')
    subprocess.run(cmd, check=True)

def render(src, out, ss, dur, caption=None, extra_vf=None):
    vf = f"fps=30,scale=1280:720,format=yuv420p"
    if extra_vf:
        vf += ',' + extra_vf
    vf += ',' + look(caption)
    run(['ffmpeg','-v','error','-y','-ss',str(ss),'-t',str(dur),'-i',src,
         '-vf',vf,'-an','-c:v','libx264','-preset','medium','-crf','18', out])

# ---------- walkthrough segments ----------
segs = [
    # (file, src, ss, dur, caption)
    ('s01_landing',      f'{RAW}/s1_landing.webm',    9.0, 8.0,  'AGYION - money with conditions - live walkthrough'),
    ('s02_fade_create',  f'{RAW}/s2_fade.webm',       3.0, 5.5,  '01 · FADE - lock the pot: funds enter the rule, never our servers'),
    ('s03_fade_claim',   f'{RAW}/s2_fade.webm',       9.5, 8.3,  'the price walks backwards - a claim freezes it at this ledger'),
    ('s04_fade_settle',  f'{RAW}/s2_fade.webm',      18.3, 7.2,  'the venue signs the handoff - proven, so the pot executes'),
    ('s05_envoy_grant',  f'{RAW}/s3_envoy.webm',     10.0, 5.5,  '02 · ENVOY - delegate spending, not trust: cap, expiry, bound recipient'),
    ('s06_envoy_run',    f'{RAW}/s3_envoy.webm',     15.5, 6.0,  'agent loop - watching the board, threshold 170 TRYT'),
    ('s07_envoy_claim',  f'{RAW}/s3_envoy.webm',     27.8, 3.8,  'claim lands for the owner - within the mandate'),
    ('s08_envoy_reject', f'{RAW}/s3_envoy.webm',     32.0, 5.3,  'over-cap attempt - the contract said no (CapExceeded, on-chain)'),
    ('s09_pod_bury',     f'{RAW}/s4_pod_ledger.webm', 8.0, 4.8,  '03 · POD - buried until the unlock ledger; only sha256(preimage) on-chain'),
    ('s10_pod_refuse',   f'{RAW}/s4_pod_ledger.webm',13.0, 4.0,  'too early - the contract refuses'),
    ('s11_ledger',       f'{RAW}/s4_pod_ledger.webm',17.6, 5.0,  '04 · LEDGER - export a signed Proof Pack'),
]
for name, src, ss, dur, cap in segs:
    render(src, f'{SEG}/{name}.mp4', ss, dur, cap)

# ---------- intro: hero-loop + title overlays ----------
t1a = ("alpha='if(lt(t,0.9),0,if(lt(t,1.7),(t-0.9)/0.8,if(lt(t,4.1),1,if(lt(t,4.7),(4.7-t)/0.6,0))))'")
t2a = ("alpha='if(lt(t,5.0),0,if(lt(t,5.9),(t-5.0)/0.9,1))'")
intro_vf = (
    "fps=30,scale=1280:720,format=yuv420p,"
    f"drawtext=fontfile={SERIF}:text='What if money had conditions?':fontsize=66:"
    f"fontcolor={INK}:x=64:y=h-210:{t1a},"
    f"drawtext=fontfile={SERIF}:text='Agyion.':fontsize=88:fontcolor={CREAM}:x=64:y=h-260:{t2a},"
    f"drawtext=fontfile={MONO}:text='conditional money - live on Stellar testnet':fontsize=23:"
    f"fontcolor={CREAM}:x=66:y=h-160:{t2a},"
    + look(None)
)
run(['ffmpeg','-v','error','-y','-t','8','-i','/mnt/agents/output/project/app/public/media/hero-loop.mp4',
     '-vf',intro_vf,'-an','-c:v','libx264','-preset','medium','-crf','18', f'{SEG}/s00_intro.mp4'])

# ---------- proof card ----------
proof_vf = (
    "fps=30,format=yuv420p,"
    f"drawtext=fontfile={MONO}:text='PROOF':fontsize=20:fontcolor={OCHRE}:x=64:y=150,"
    f"drawtext=fontfile={SERIF}:text='Runs on Stellar testnet':fontsize=52:fontcolor={INK}:x=64:y=185,"
    f"drawbox=x=64:y=272:w=180:h=2:color={OCHRE}:t=fill,"
    f"drawtext=fontfile={MONO}:text='network     Stellar testnet · Soroban (5s finality)':fontsize=21:fontcolor={INK}:x=64:y=310,"
    f"drawtext=fontfile={MONO}:text='contract    C…  - pinned after final deploy (see README)':fontsize=21:fontcolor={INK}:x=64:y=352,"
    f"drawtext=fontfile={MONO}:text='tx hashes   0x… - hall claims, filled post-deploy':fontsize=21:fontcolor={INK}:x=64:y=394,"
    f"drawtext=fontfile={MONO}:text='kernel      26/26 tests · non-custodial · no admin keys':fontsize=21:fontcolor={INK}:x=64:y=436,"
    f"drawtext=fontfile={MONO}:text='evidence    proof-pack JSON exported live in this demo':fontsize=21:fontcolor={INK}:x=64:y=478,"
    + look(None)
)
run(['ffmpeg','-v','error','-y','-f','lavfi','-i','color=c=0xF5F0E8:s=1280x720:d=6:r=30',
     '-vf',proof_vf,'-an','-c:v','libx264','-preset','medium','-crf','18', f'{SEG}/s12_proof.mp4'])

# ---------- closing card ----------
close_vf = (
    "fps=30,format=yuv420p,"
    f"drawtext=fontfile={SERIF}:text='Money that waits. Money that proves.':fontsize=54:fontcolor={INK}:x=64:y=220,"
    f"drawtext=fontfile={SERIF}:text='Agyion.':fontsize=96:fontcolor={INK}:x=64:y=310,"
    f"drawbox=x=66:y=440:w=150:h=3:color={OCHRE}:t=fill,"
    f"drawtext=fontfile={MONO}:text='conditional money - it locks, it proves, it returns':fontsize=22:fontcolor={INK}:x=66:y=470,"
    f"drawtext=fontfile={MONO}:text='Genesis Track · Stellar Pro Hackathon 2026 · Rise In × Stellar':fontsize=18:fontcolor={MUTED}:x=66:y=560,"
    + look(None) + ",fade=t=in:st=0:d=0.4,fade=t=out:st=4.9:d=0.6"
)
run(['ffmpeg','-v','error','-y','-f','lavfi','-i','color=c=0xF5F0E8:s=1280x720:d=5.5:r=30',
     '-vf',close_vf,'-an','-c:v','libx264','-preset','medium','-crf','18', f'{SEG}/s13_closing.mp4'])

print('ALL SEGMENTS DONE')
