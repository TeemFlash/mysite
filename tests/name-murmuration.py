import os
BASE = os.environ.get("SITE_URL", "http://127.0.0.1:4173").rstrip("/")
"""Check the name morph, pointer interaction and reduced motion."""
from playwright.sync_api import sync_playwright
from pathlib import Path
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900})
    source=Path('experience/name-murmuration.js').read_text()+'\nwindow.setNameClock=t=>{clock=t};'
    page.route('**/name-murmuration.js*',lambda r:r.fulfill(body=source,content_type='text/javascript'))
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE+'/experience/',wait_until='networkidle')
    page.locator('#record-control').click()
    page.mouse.move(5,5)
    page.wait_for_function("document.body.dataset.state==='scene'")
    page.evaluate("""async()=>{window.attachment=(await import(new URL('name-murmuration.js',location.href).href)).nameAttachment}""")
    page.wait_for_function('attachment()>.92',timeout=15000)
    page.screenshot(path='/tmp/name-formed.png')
    rect=page.locator('#intro-name').bounding_box()
    page.mouse.move(rect['x']+rect['width']/2,rect['y']+rect['height']/2)
    page.wait_for_function('attachment()<.08',timeout=4000)
    page.screenshot(path='/tmp/name-scattered.png')
    assert page.locator('.intro-facts').evaluate('e=>getComputedStyle(e).backgroundColor')=='rgba(0, 0, 0, 0)'
    page.mouse.move(5,5)
    page.wait_for_function('attachment()>.99',timeout=6000)
    # Move the internal animation clock near five minutes, without a five-minute wait.
    page.evaluate("setNameClock(298)")
    samples=page.evaluate("""()=>new Promise(resolve=>{
      const samples=[],start=performance.now();
      function sample(now){
        samples.push([now,attachment()]);
        if(now-start<1000)requestAnimationFrame(sample);else resolve(samples);
      }
      requestAnimationFrame(sample);
    })""")
    values=[s[1] for s in samples]
    assert min(values)>.99, "Name must stay formed before five minutes"
    # Smoothstep slope <=1.5 and the existing fade rate is 4 per second.
    assert all(abs(b[1]-a[1]) <= (b[0]-a[0])*.006+.03 for a,b in zip(samples,samples[1:])), 'Attachment abruptly changes'
    page.evaluate('setNameClock(300)')
    page.wait_for_function('attachment()<.08',timeout=3000)
    page.wait_for_function('attachment()>.99',timeout=12000)
    page.evaluate('setNameClock(600)')
    page.wait_for_function('attachment()<.08',timeout=3000)
    page.wait_for_function('attachment()>.99',timeout=12000)
    page.set_viewport_size({'width':375,'height':812})
    page.wait_for_timeout(300)
    assert page.evaluate('attachment()')>.99, 'Resize must not replay the intro'
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_timeout(300)
    assert page.evaluate('attachment()')==1
    assert not errors,errors
    print('Name attachment: formed, pointer scatter, five-minute repeats, reduced motion. Passed.')
    browser.close()
