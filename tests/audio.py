"""Default preview starts at the chorus and retains its three-second fade.

Requires Playwright Chromium; optionally set AUDIO_FIXTURE to the official
preview file to check playback without relying on the external CDN.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('SITE_URL', 'http://127.0.0.1:4173').rstrip('/')
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    fixture = os.environ.get('AUDIO_FIXTURE')
    if fixture:
        page.route('https://audio-ssl.itunes.apple.com/**', lambda route: route.fulfill(
            body=Path(fixture).read_bytes(), content_type='audio/mp4',
            headers={'Access-Control-Allow-Origin': '*', 'Accept-Ranges': 'bytes',
                'Content-Length': str(Path(fixture).stat().st_size)}))
    page.add_init_script('''
        const create = AudioContext.prototype.createGain;
        AudioContext.prototype.createGain = function(...args) {
            const gain = create.apply(this,args);window.testGain = gain;return gain;
        };
        window.playStarts=[];
        document.addEventListener('playing',e=>{
            if(e.target.id==='track')window.playStarts.push(e.target.currentTime);
        },true);
    ''')
    page.goto(BASE+'/experience/')
    assert "What I've Done" in page.locator('.music-info a').inner_text()
    assert 'mzaf_7071906531654724628' in page.locator('#track').get_attribute('src')
    page.locator('#record-control').click()
    page.wait_for_function('window.playStarts.length>0', timeout=20000)
    assert 6.5 <= page.evaluate('playStarts[0]') < 7.0, page.evaluate('({starts:playStarts,ready:document.querySelector("#track").readyState,position:document.querySelector("#track").currentTime})')
    page.wait_for_selector('body[data-state=scene]')
    gain = [page.evaluate('testGain.gain.value')]
    page.wait_for_timeout(1500)
    gain.append(page.evaluate('testGain.gain.value'))
    page.wait_for_function('document.querySelector("#track").paused',timeout=5000)
    gain.append(page.evaluate('testGain.gain.value'))
    assert gain[0] > .85 and .15 < gain[1] < .8 and gain[2] < .01, gain
    page.locator('#record-control').click()
    page.wait_for_function('playStarts.length===2')
    assert 6.5 <= page.evaluate('playStarts[1]') < 7.0, 'Replay must start at the chosen phrase'
    if fixture:
        page.locator('#audio-file').set_input_files(fixture)
        page.wait_for_function('playStarts.length===3')
        assert page.evaluate('playStarts[2]') < .5, 'Custom files must start from their own beginning'
    browser.close()
print('Audio: chorus entry, replay and three-second fade passed:', gain)
